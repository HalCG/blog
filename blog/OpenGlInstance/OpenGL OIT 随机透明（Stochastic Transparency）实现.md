# OpenGL OIT 随机透明（Stochastic Transparency）实现

传统的半透明渲染需要对片元进行排序（从后往前进行 Alpha 混合，或者从前往后进行深度剥离）。然而，基于逐像素链表的 OIT（Linked List OIT）需要消耗极大的显存且需要原子操作，深度剥离 OIT 则需要经历多次场景绘制 Pass。

**随机透明（Stochastic Transparency / 随机半透明）** 走了一条完全不同的道路：**用概率与随机化替代排序**。它不需要复杂的 GPU 链表，也不需要多次绘制 Pass，仅需**一个渲染 Pass 和一个着色器**就能完成透明渲染，是实时渲染中“Less is More”的典型代表。

---

## 1. 核心思想：子采样“掷骰子”

随机透明的直觉非常简单：**将 Alpha 值（不透明度）作为概率，决定当前片段覆盖多少个 MSAA（多重采样抗锯齿）子样本**。

假设一个屏幕像素开启了 16x MSAA，此时该像素内部维护了 16个 独立的子样本（每个子样本有独立的颜色和深度）。如果我们在该像素位置渲染一个 Alpha = 0.5 的红色半透明网格：
* 传统的 Alpha 混合：计算 `C_result = 0.5 * Red + 0.5 * Base`，将混合后的颜色写入。
* 随机透明：不执行传统的混合，而是对 16 个子样本中的每一个单独进行“掷骰子”（生成一个随机数 $r \in [0, 1)$）。如果随机数 $r < 0.5$，该子样本就被红色覆盖；否则保留原来的底色。
* 理论上，约有 8 个子样本被涂红，另外 8 个保留底色。
* 在最终显卡将这 16 个子样本 **Resolve**（平均解析）输出到屏幕时，自然得到了 `0.5 * Red + 0.5 * Base` 的混合结果。

### 1.1 为什么这种方法不需要排序？
关键在于：**当每一个子样本上最多只保留一个透明片段时，绘制顺序在样本级别就不再重要了**。

在单个子样本上，如果有多个不同深度的透明片元发生竞态：
* 硬件自身的深度测试（`GL_LESS` 或 `GL_LEQUAL`）将对每个子样本进行独立的深度测试。
* 深度较近的片元如果通过了测试，就会直接覆盖掉同一子样本上较远的颜色。
* 因此，在子样本级别，遮挡关系是完全正确的，最终由硬件 Resolve 平均得到近似半透明，消除了 CPU 或 GPU 端的显式排序开销。

---

## 2. 关键技术：MSAA 与 gl_SampleMask

实现随机透明的“终极武器”是 GLSL 4.0+ 引入的内建变量：`gl_SampleMask`。

```glsl
out int gl_SampleMask[]; // 逐样本写入控制掩码
```

* `gl_SampleMask[0]` 是一个 32 位的整数，其 bit 0 控制子样本 0 是否启用，bit 1 控制子样本 1，以此类推。
* 如果某个 bit 写入 1，说明当前片元覆盖该子样本；如果写入 0，则该子样本不会被写入，保持原有值不变。

---

## 3. 着色器实现（quad.frag）

这是整个随机透明唯一的着色器核心逻辑。片元着色器仅需 26 行代码即可完成全部操作：
```glsl
#version 420 core
layout(location = 0) out vec4 FragColor;

in vec2 textureCoord;

uniform int frameID;                 // 随机数种子偏移量 (每个对象不同)
uniform int sampleCnt;               // 硬件支持的最大 MSAA 采样数 (如 16)
uniform sampler2D texture_diffuse;

void main() {
    vec4 color = texture(texture_diffuse, textureCoord);

    // 1. 获取 alpha 值作为子样本保留的覆盖率概率 (Coverage)
    float coverage = color.w;

    // 2. 为每个 MSAA 子样本“掷骰子”生成随机掩码
    uint randMask = 0u;
    for (int i = 0; i < sampleCnt; ++i) {
        // 经典伪随机生成算法：使用样本索引 i 和对象 ID frameID 作为二维种子
        vec2 seed = vec2(float(i), float(frameID));
        float r = fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);

        // 如果随机数小于覆盖概率，则启用第 i 个子样本
        if (r < coverage) {
            randMask |= (1u << i);
        }
    }

    // 3. 写入内建掩码，控制 GPU 的多重采样写入行为
    gl_SampleMask[0] = int(randMask);

    // 4. 直接输出颜色，不需进行复杂的混合状态控制，由硬件 resolve 自动平均
    FragColor = color;
}
```

---

## 4. C++ 侧关键配置

### 4.1 窗口创建时申请 MSAA 采样缓冲
因为随机透明依赖于 MSAA 硬件的样本存储，所以在窗口初始化时，必须向 GLFW 申请高采样数（本 Demo 申请 16x MSAA）：
```cpp
glfwWindowHint(GLFW_SAMPLES, 16); // 请求系统创建 16x 多重采样缓冲
```

### 4.2 渲染循环与状态机配置
在渲染透明网格前，需要开启 `GL_MULTISAMPLE` 和 `GL_SAMPLE_MASK`，同时深度写入必须保持开启以支持遮挡过滤：
```cpp
// 开启多重采样和 sample mask 逐样本覆写
glEnable(GL_MULTISAMPLE);
glEnable(GL_SAMPLE_MASK);

// 开启深度测试与深度写入
glEnable(GL_DEPTH_TEST);
glDepthFunc(GL_LEQUAL);   // 设为 LEQUAL (小于等于)，避免多层同位置片元竞态剔除
glDepthMask(GL_TRUE);     // 必须允许深度写入
```

### 4.3 独立随机种子控制（frameID）
如果所有的网格物体使用相同的随机数种子，它们会在**完全相同的子样本**上发生重叠竞争，造成像素颜色过度偏置（所有物体同时写入 s0..s7，导致样本没有离散分布）。

Demo 采用在绘制不同模型实例时，交替递增传入 `frameID` 作为种子偏移：
```cpp
static int frameID = 0;
int modelCnt = 4;

// 绘制 Spot
shaderQuad_->setInt("frameID", (frameID++) % modelCnt);
// 绘制 Window R
shaderQuad_->setInt("frameID", (frameID++) % modelCnt);
// ...
```
这使得每一个物体在同一个像素位置投射时，产生的随机样本掩码在 16 个通道里是均匀离散开的，避免了模式竞态。

---

## 5. 方案对比与优缺点

### 5.1 三种 OIT 方案性能与架构对比

| 特性维度 | 深度剥离 (Depth Peeling) | 逐像素链表 (Linked List) | 随机透明 (Stochastic) |
| :--- | :--- | :--- | :--- |
| **通道 Pass 数量** | $N$ 层剥离 $\times 1$ Pass（随重叠度可变） | 固定 3 Pass | **固定 1 Pass** |
| **GPU 显存占用** | 两个离屏 Depth/Color 乒乓纹理 | $\approx 230\text{MB}$ 节点池 SSBO 缓冲区 | **0 字节**（仅使用系统默认 MSAA 缓冲） |
| **精确度** | 精确 | 精确 | **近似（存在噪点）** |
| **核心瓶颈** | 场景多次重复绘制的 Draw Call 开销 | 链表的插入排序与同步 Barrier 开销 | MSAA 的 Resolve 性能开销 |
| **实现难度** | 中等 | 高 | **极低（着色器仅 26 行）** |

### 5.2 优缺点分析

* **优势**：
  * **极简优雅**：不需要任何离屏 FBO、SSBO 或原子计数器。
  * **极高性能**：仅进行一次场景绘制，不需要在 C++ 频繁切换 FBO 和纹理通道。
* **劣势**：
  * **静态噪点（Static Noise）**：由于随机数的生成是离散分布的，画面边缘或低 Alpha 的大平原上会出现类似颗粒的噪点。
  * **受制于 MSAA**：抗锯齿采样数是硬件硬性限制的（显卡最高一般仅支持 16x 或 32x）。若采样数太低（如 4x），Alpha = 0.25 只能分到一个子样本，画面的噪点和闪烁感会非常强烈。
