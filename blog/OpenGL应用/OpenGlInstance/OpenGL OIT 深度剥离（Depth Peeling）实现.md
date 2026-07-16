# OpenGL OIT 深度剥离（Depth Peeling）实现

在半透明物体渲染中，传统的 Alpha 混合由于 Over 算子的非交换律，要求场景中的物体必须按从远到近的顺序进行绘制。但在实际渲染中，复杂的网格面片常常存在互相交叉、重叠甚至包含的关系，在 CPU 侧对物体或三角形面片进行排序极其昂贵且无法解决面片级穿插问题。

**OIT（Order-Independent Transparency，顺序无关透明度）** 技术将排序任务交由 GPU 托管。本篇总结介绍 OIT 经典方案之一：**深度剥离（Depth Peeling）** 的实现。该算法兼容性极佳，它仅依赖于标准的深度测试和离屏 FBO（帧缓冲对象），无需 OpenGL 4.3+ 的高级缓冲区特性。

---

## 1. 深度剥离的核心思想

深度剥离就像剥洋葱一样，通过**多次绘制 Pass** 逐层剥离场景中由近及远的透明几何片元：
* **第 1 层**：过滤最近的一层（即普通深度测试保留的最近片段）。
* **第 2 层**：剥离第二近的一层（在其余片元中寻找最近的）。
* **第 $N$ 层**：剥离第 $N$ 近的一层。
* **终止条件**：当某一层的绘制中再也没有任何片元通过深度测试时，提前结束循环。

在每一层剥离 Pass 中，将当前层过滤得到的颜色按照从近到远（Front-to-Back）的算法混合累积到累积缓冲区中，最后将累积结果与背景颜色合并输出到屏幕。

### 1.1 如何过滤出“当前层”？
核心机制是**利用上一层剥离出的深度纹理作为“最近深度阈值”**进行二次限值裁剪：
* 在渲染当前层时，将上一层的深度纹理作为 Shader 的输入，只保留深度值**大于**上一层深度的片段。
* NDC 空间中：`当前片段的 gl_FragCoord.z > 上一层对应像素的 depth` 则保留，否则在 Shader 中直接 `discard` 丢弃。

### 1.2 双深度缓冲的“乒乓”机制
因为我们需要用上一层的深度值来进行裁剪过滤，同时又需要把当前层渲染出的新深度写入当前深度缓冲，为了避免读写同一张深度贴图产生冲突，Demo 设计了两个深度纹理，在 `fboAccum_` 和 `fboPeel_` 两个帧缓冲之间交替充当输入和输出角色：
* `inputDepthIndex = 0` (对应纹理 A) 充当裁剪阈值输入。
* `outputDepthIndex = 1` (对应纹理 B) 作为当前层的 Depth Attachment 接收写入。
* 这一层 Pass 结束后，交换两个索引，为下一层剥离做准备。

---

## 2. 离屏 FBO 设计与渲染流程

### 2.1 三个离屏 FBO
项目维护了三个不同的 FBO 结构来进行协作：
* `fboAccum_`：用于存储最终已混合累积的半透明颜色（颜色附件），并包含用于乒乓的深度纹理 A。
* `fboPeel_`：用于渲染并缓存当前被剥离层的颜色（颜色附件），并包含用于乒乓的深度纹理 B。
* `fboOit_`：用于场景不透明物体的预渲染，它与 `fboAccum_` **共享**同一个深度纹理，这使得半透明物体可以正确接受不透明几何体的遮挡测试。

### 2.2 每帧渲染流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. initPeelBuffers() — 清理与状态重置                       │
│    - 清空 fboAccum_ 和 fboPeel_                              │
│    - 深度清除值设为 0.0（最近，供第 1 层剥离无缝通过）        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. peelAndBlend() — 逐层剥离循环 (最大 kMaxDepthPeelLayers)  │
│    for layer in 0..maxLayers:                               │
│      ┌─────────────────────────────────────────────────┐    │
│      │ A. 准备当前层渲染目标                            │    │
│      │    - 绑定 fboPeel_，动态挂载当前 output 深度附件│    │
│      │    - 清颜色为 (0,0,0,0)，深度清除值设为 1.0     │    │
│      ├─────────────────────────────────────────────────┤    │
│      │ B. 渲染场景进行剥离                             │    │
│      │    - 着色器：depth_peeling_render.frag           │    │
│      │    - 输入：上一层深度纹理                       │    │
│      │    - 过滤：gl_FragCoord.z <= frontDepth ? discard│    │
│      │    - 通过 GL_SAMPLES_PASSED 统计通过的片元数量  │    │
│      ├─────────────────────────────────────────────────┤    │
│      │ C. 混合当前层到累积缓冲                         │    │
│      │    - 绑定 fboAccum_                             │    │
│      │    - 着色器：depth_peeling_blend.frag            │    │
│      │    - 混合状态：禁用深度，Front-to-Back 混合公式 │    │
│      ├─────────────────────────────────────────────────┤    │
│      │ D. 交换乒乓深度索引并检查                        │    │
│      │    - swap(inputDepthIndex, outputDepthIndex)    │    │
│      │    - if sampleCount == 0 → break 提前终止循环   │    │
│      └─────────────────────────────────────────────────┘    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. compositeToScreen() — 背景合成与写屏                    │
│    - 读 fboAccum_ 的累积颜色，与背景色混合并直接输出到窗口   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 关键着色器实现

### 3.1 剥离层渲染着色器（depth_peeling_render.frag）
该着色器在渲染透明网格时被调用，根据上一层对应的屏幕坐标深度剔除掉不满足条件的片元，保留未被处理的最前层：
```glsl
#version 430 core
layout(location = 0) out vec4 FragColor;

in vec3 vertexPos;
in vec3 vertexNor;
in vec2 textureCoord;

uniform sampler2D texture_diffuse; // 物体贴图
uniform sampler2D texture_depth;   // 上一层的深度纹理（裁剪参考）
uniform vec2 u_ScreenSize;         // 屏幕尺寸，用于归一化像素坐标

void main() {
    // 1. 归一化屏幕坐标
    vec2 uv = gl_FragCoord.xy / u_ScreenSize;

    // 2. 采样上一层对应像素的深度阈值
    float frontDepth = texture(texture_depth, uv).r;

    // 3. 深度裁剪：抛弃比上一层更近或处于同一位置的片段，只保留比它更深的片段
    if (gl_FragCoord.z <= frontDepth) {
        discard;
    }

    // 4. 标准 Blinn-Phong 光照计算
    vec3 lightColor = vec3(1.0);
    vec3 normal = normalize(vertexNor);
    // ... 计算漫反射和高光 ...

    vec4 texColor = texture(texture_diffuse, textureCoord);
    
    // 输出包含光照的半透明色彩
    FragColor = vec4(texColor.rgb, texColor.a);
}
```

### 3.2 最终合成着色器（depth_peeling_final.frag）
由于混合过程采用了从近到远的混合计算，背景颜色的融入需要放在最末尾进行合成：
```glsl
#version 430 core
layout(location = 0) out vec4 FragColor;

in vec2 textureCoord;

uniform vec3 background_color;    // 背景颜色
uniform sampler2D texture_diffuse;  // fboAccum_.color (累积不透明色彩)

void main() {
    vec4 frontColor = texture(texture_diffuse, textureCoord);

    // frontColor.a 代表经过多次 Front-to-Back 混合后“剩余的透明度”
    // 最终输出 = 已累积的前景颜色 + 背景色 * 剩余透明度
    FragColor = frontColor + vec4(background_color, 1.0) * frontColor.a;
    FragColor.a = 1.0; // 输出完全不透明
}
```

---

## 4. 关键机制解析

### 4.1 Front-to-Back（从近到远）混合公式
传统的 Alpha 混合采用从后往前的 **Over** 算子，而深度剥离的提取顺序是从前往后（从近到远），为了在渲染过程中随时累积，项目使用了 **Under** 算子：
```cpp
glEnable(GL_BLEND);
glBlendFuncSeparate(
    GL_DST_ALPHA, GL_ONE,           // RGB 混合因子
    GL_ZERO, GL_ONE_MINUS_SRC_ALPHA // Alpha 混合因子
);
```
对于每一层新渲染的色彩 $C_{src}$，与当前累积缓冲区中的颜色 $C_{dst}$ 按照此状态混合，其数学公式推导为：
$$\begin{aligned}
C_{\text{result}} &= C_{\text{src}} \cdot A_{\text{dst}} + C_{\text{dst}} \\
A_{\text{result}} &= A_{\text{dst}} \cdot (1 - A_{\text{src}})
\end{aligned}$$
当多层依次混合时，它将完美等价于从远到近的累积：
$$C_{\text{accum}} = C_0 \cdot A_0 + C_1 \cdot A_1 \cdot (1 - A_0) + C_2 \cdot A_2 \cdot (1 - A_0) \cdot (1 - A_1) + \dots$$
同时，累积的 $A_{\text{accum}}$ 不断衰减，代表剩余的透明光透射比，最终在 Final Pass 中作为权重与背景色融合。

### 4.2 深度清除值的巧妙使用
* **初始化阶段（`initPeelBuffers`）**：调用 `glClearDepth(0.0f)`。由于 NDC 深度在 `[0, 1]` 之间，0.0 为最近处。将初始深度设为 0.0 后，在第 1 层剥离渲染时，任何片段的 `gl_FragCoord.z` 都必然 $\ge 0.0$。所以第 1 层不会因为 `gl_FragCoord.z <= frontDepth` 被丢弃，全部通过并进入硬件深度测试，被 `GL_LESS` 筛选出最近的那层片段。
* **循环剥离阶段**：在绘制每一个当前剥离层前，调用 `glClearDepth(1.0f)` 将输出深度缓冲清空为最远处。这样在 `GL_LESS` 测试下，裁剪后保留下来的只能是该层中最靠近相机的像素代表。

### 4.3 GPU 查询优化
项目使用 `GL_SAMPLES_PASSED` 查询硬件遮挡统计，动态感知剥离层是否已全部处理完毕。在每层 `drawSceneLayer` 周围包裹 Query 语句：
```cpp
glBeginQuery(GL_SAMPLES_PASSED, queryId_);
drawSceneLayer(...);
glEndQuery(GL_SAMPLES_PASSED);

GLuint sampleCount = waitSampleCount(); // 等待 GPU 传回数据
if (sampleCount == 0) {
    break; // 没有更多片段通过测试，提前退出循环
}
```
轮询 `waitSampleCount()` 会短暂阻塞 CPU，但能快速打破渲染循环，避免浪费 FBO 绑定和无效的绘制 Pass。

---

## 5. 调试与排查：RenderDoc 问题记录

深度剥离由于涉及大量的 FBO 切换、状态重置与双通道乒乓，以下是联调中容易遇到的经典错误定位与处理方案：

### OIT-DP-18 · Peel 循环内深度清除值错误导致黑屏
* **现象**：透明层大面积缺失，多层物体只渲染出最近的一层，或者画面直接变回全透明。
* **原因**：在每层 peel 循环内部清空 `fboPeel_` 时，误用了 `glClearDepth(0.0f)`，导致新渲染的一层在 `GL_LESS` 深度测试下，所有大于 0.0 深度（即所有正常物体）的片元全被硬件深度测试裁剪丢弃。
* **定位过程**：
  1. 用 RenderDoc 抓帧，在 Event Browser 中定位到 `peelAndBlend` 的循环第一层。
  2. 选中剥离层绘制事件，查看 **Pipeline State** 的 **Framebuffer** 视图。
  3. 双击 Depth attachment 贴图查看其数值，发现初始深度异常为 0.0（应为 1.0）。
* **修复方法**：循环渲染当前层前，在 `glClear()` 前将深度清除参数设置为 `glClearDepth(1.0f)`。

### OIT-DP-19 · 全局深度函数与着色器裁剪逻辑不一致
* **现象**：剥离出的透明层数不对，前后层次顺序颠倒，运动相机时透明表现乱闪。
* **原因**：在 `initPeelBuffers` 函数中误将全局深度函数设成了 `glDepthFunc(GL_GREATER)`，直接破坏了剥离时依靠 `GL_LESS` 取得各像素最近几何面片的设计假设。
* **定位过程**：抓取渲染帧，定位到 Peel Draw 事件，观察 **Pipeline State** 的 **Depth State** 属性，发现深度测试函数的比较符号显示为 `GREATER`。
* **修复方法**：更正为 `glDepthFunc(GL_LESS)`，使其与普通不透明物体的深度测试逻辑保持一致。

### OIT-DP-20 · Blend 混合因子设置错误导致半透明颜色过亮或过暗
* **现象**：半透明物体叠加过多时，画面过曝变白，或者层层折射后颜色越来越暗。
* **原因**：`glBlendFuncSeparate` 中的源和目标因子参数设置错误，未按照 Under 算子累积公式实现，导致每次混合都丢失了上一层累积的 Alpha 衰减因子。
* **定位过程**：
  1. 抓取渲染帧，选中每一层 Blend Draw 的全屏 Quad 绘制事件。
  2. 检查 **Pipeline State** 中的 **Blend State** 参数。
  3. 观察 FBO 颜色附件随层数增加的色彩输出，确认与累积公式期望的数值不相符。
* **修复方法**：检查并恢复 `glBlendFuncSeparate(GL_DST_ALPHA, GL_ONE, GL_ZERO, GL_ONE_MINUS_SRC_ALPHA)` 的正确因子设置。
