# OpenGL OIT 逐像素链表（Linked List）实现

在三维渲染中，处理半透明网格面片的穿插与遮挡一直是个难题。基于逐像素链表的 OIT（Linked List OIT）通过在 GPU 内部动态构建链表，能在一个 Pass 中精确收集像素覆盖的所有透明片元，并在随后的合成 Pass 中进行深度排序和 Back-to-Back 混合。

本篇总结将详细拆解基于逐像素链表的 OIT 架构设计、核心缓冲区分配、着色器实现细节，以及调试中的常见问题与记录。

---

## 1. 逐像素链表 OIT 架构与流程

### 1.1 三 Pass 渲染流程
项目将单帧渲染划分为三个独立通道：
1. **Pass 1 - 不透明物体渲染（Opaque Pass）**：开启深度测试（`GL_LESS`）和深度写入（`glDepthMask(GL_TRUE)`），将所有不透明几何体渲染到离屏的 `opaqueFBO_` 中，得到基础背景颜色和深度纹理 `opaqueDepthTexture_`。
2. **Pass 2 - 透明物体收集（Transparent Pass）**：开启深度测试，但**禁止深度写入**（`glDepthMask(GL_FALSE)`）。透明网格进行光栅化，在 Fragment Shader 中利用原子操作和 SSBO 动态建立每个屏幕像素的透明片元链表。
3. **Pass 3 - 合成输出（Composite Pass）**：绘制一个全屏 Quad。每个像素采样 `opaqueFBO_` 的颜色作为背景，然后遍历并排序当前像素对应的片元链表，进行从远到近的混合，输出最终图像到窗口。

### 1.2 动态链表数据结构
每个屏幕像素对应一条单链表。链表节点类型定义为：
```glsl
struct NodeType {
    vec4 color;   // 片段颜色
    float depth;  // 片段深度
    uint next;    // 指向下一个节点的索引 (0xFFFFFFFF 代表链表尾)
};
```
* **头指针**：存储在以 `R32UI` 格式分配的头指针纹理（Image Texture）中。每个屏幕像素占用一个 32 位无符号整数，记录链表头部节点在全局节点池中的索引。
* **节点存储池**：存储在 std430 布局的着色器存储缓冲对象（SSBO）中。整个节点池大数组供所有像素共享分配。
* **索引分配**：依靠原子计数器（Atomic Counter Buffer）进行全局递增，为每一个通过测试的透明片元分发唯一的节点池索引。

---

## 2. 四种特殊缓冲区设计

实现逐像素链表需要用到 OpenGL 4.3+ 提供的以下四种核心缓冲区：

| 缓冲区类型 | 绑定点 | 作用 |
| :--- | :--- | :--- |
| **Atomic Counter Buffer** | `GL_ATOMIC_COUNTER_BUFFER` | 一个 32 位全局递增的无符号计数器，用于原子分发节点索引。每帧开始前必须重新清零。 |
| **SSBO (Shader Storage Buffer Object)** | `GL_SHADER_STORAGE_BUFFER` | 大容量的 GPU 侧可读写结构化数组，存储所有的链表节点（NodeType 节点池）。 |
| **Image Texture (头指针纹理)** | `GL_READ_WRITE` 映射 | `GL_R32UI` 格式的 2D 纹理，与屏幕同分辨率，存储每个像素链表的第一个节点索引。 |
| **PBO (Pixel Unpack Buffer)** | `GL_PIXEL_UNPACK_BUFFER` | 快速清空缓冲区。在 GPU 端分配好填满 `0xFFFFFFFF` 的 PBO，通过异步 DMA 直接刷写头指针纹理，速度远快于 CPU 上传。 |

---

## 3. 着色器与 C++ 核心实现

### 3.1 透明物体收集着色器（oitRender.frag）
该着色器在 Pass 2 中被调用，使用头插法（Head-Insertion）构建链表：
```glsl
#version 430 core
layout(location = 0) out vec4 FragColor;

in vec3 vertexPos;
in vec3 vertexNor;
in vec2 textureCoord;

uniform uint MaxNodes;             // 最大分配节点数
uniform sampler2D texture_diffuse;
uniform sampler2D texture_depth;   // Pass 1 写入的不透明物体深度纹理

// ---- 特殊缓冲区声明 ----
layout(binding = 0, r32ui) uniform uimage2D headPointers;            // 头指针纹理
layout(binding = 0, offset = 0) uniform atomic_uint nextNodeCounter; // 原子计数器
struct NodeType {
    vec4 color;
    float depth;
    uint next;
};
layout(binding = 0, std430) buffer linkedLists {
    NodeType nodes[];
};

void main() {
    // 1. 深度遮挡测试：如果被 Pass 1 的不透明物体挡住，直接丢弃
    vec2 uv = gl_FragCoord.xy / vec2(800, 600); // 假定分辨率
    float opaqueDepth = texture(texture_depth, uv).r;
    if (gl_FragCoord.z > opaqueDepth + 0.0001) {
        discard;
    }

    // 2. 原子自增获取全局唯一的节点索引
    uint nodeIndex = atomicCounterIncrement(nextNodeCounter);

    // 3. 越界检查
    if (nodeIndex < MaxNodes) {
        // 4. 原子交换操作：将 nodeIndex 写入头指针，同时返回上一任的头节点索引
        uint preHead = imageAtomicExchange(
            headPointers,
            ivec2(gl_FragCoord.xy),
            nodeIndex
        );

        // 5. 写入节点池
        vec4 color = texture(texture_diffuse, textureCoord);
        nodes[nodeIndex].color = color;
        nodes[nodeIndex].depth = gl_FragCoord.z;
        nodes[nodeIndex].next = preHead; // 头插法：指向旧的头指针
    }

    FragColor = texture(texture_diffuse, textureCoord);
}
```

### 3.2 排序与合成着色器（composite.frag）
全屏 Quad 绘制时运行此着色器。它负责提取、去重、排序及 Back-to-Front 混合：
```glsl
#version 430 core
#define MAX_FRAGMENTS 75 // 单像素最大收集层数上限
layout(location = 0) out vec4 FragColor;

in vec2 textureCoord;

uniform sampler2D texture_opaque; // Pass 1 的背景彩色图像

struct NodeType {
    vec4 color;
    float depth;
    uint next;
};
layout(binding = 0, r32ui) uniform uimage2D headPointers;
layout(binding = 0, std430) buffer linkedLists {
    NodeType nodes[];
};

const float EPSILON = 0.0001;

void main() {
    NodeType frags[MAX_FRAGMENTS];
    int count = 0;

    // 1. 获取链表头部索引
    uint idx = imageLoad(headPointers, ivec2(gl_FragCoord.xy)).r;

    // 2. 循环遍历链表并复制到临时局部数组中
    while (idx != 0xffffffff && count < MAX_FRAGMENTS) {
        NodeType node = nodes[idx];

        // 3. 面片边界去重逻辑
        // 三角形网格共享边缘处可能会光栅化两次产生重叠片元，通过深度差去重
        bool isDuplicate = false;
        for (int i = 0; i < count; ++i) {
            if (abs(frags[i].depth - node.depth) < EPSILON) {
                isDuplicate = true;
                break;
            }
        }

        if (!isDuplicate) {
            frags[count] = node;
            count++;
        }
        idx = node.next;
    }

    // 4. 插入排序：按深度从远到近排序 (depth 大的在数组前面)
    for (int i = 1; i < count; ++i) {
        int j = i;
        NodeType toInsert = frags[i];
        while (j > 0 && toInsert.depth > frags[j - 1].depth) {
            frags[j] = frags[j - 1];
            j--;
        }
        frags[j] = toInsert;
    }

    // 5. Back-to-Front 混合：从背景（不透明）开始向最近处叠色
    vec4 color = texture(texture_opaque, textureCoord);
    for (int i = 0; i < count; ++i) {
        color.rgb = color.rgb * (1.0 - frags[i].color.a) + frags[i].color.rgb * frags[i].color.a;
        color.a = color.a + frags[i].color.a * (1.0 - color.a);
    }

    FragColor = color;
}
```

---

## 4. 关键机制与同步细节

### 4.1 显存 Barrier 栅栏的作用
由于 GPU 是异步并行计算的，Pass 2 的透明收集写入 Image 纹理和 SSBO 节点池可能还在 GPU 的 Cache 中未被刷新。在进入 Pass 3 全屏合成前，必须在 CPU 侧执行同步栅栏：
```cpp
glMemoryBarrier(
    GL_SHADER_IMAGE_ACCESS_BARRIER_BIT | // 保证头指针 Image 写入可见
    GL_SHADER_STORAGE_BARRIER_BIT      | // 保证 SSBO 节点池写入可见
    GL_ATOMIC_COUNTER_BARRIER_BIT        // 保证原子计数器就绪
);
```
如果没有这个 Barrier，合成阶段读取到的链表结构将支离破碎，表现为画面的闪烁与错位。

### 4.2 std430 内存紧凑对齐
Shader 内部使用 `layout(std430)`，它相比旧的 `std140` 有更优的对齐规则：
* 在 `std430` 中，`struct` 内部的变量不会被强制 padding 到 16 字节边界。
* 例如：`vec4 color` (16字节) + `float depth` (4字节) + `uint next` (4字节) = 24 字节。在 `std430` 下紧密排列，完全对齐 CPU 侧每 24 字节的节点存储空间。

---

## 5. 调试与排查：RenderDoc 问题记录

基于 GPU 链表的 OIT 问题比较隐蔽，通常需要针对 Atomic 和 SSBO 进行细致检查：

### OIT-LL-15 · Atomic Counter 帧间未清零导致链表节点越界
* **现象**：第一帧渲染完美，但从第二帧起，半透明物体出现大范围随机色块、网格闪烁，且控制台很快报错或 GPU 驱动崩溃。
* **原因**：每帧开始渲染透明物体前，遗漏了使用 `glBufferSubData` 把全局的 `atomicBuffer_` 计数器重新写回 0。这导致新一帧的片元分配索引直接在上帧最大值上递增，迅速超出了 `MaxNodes` 上限导致越界丢弃。
* **定位过程**：
  1. Capture 抓取第二帧的开头。
  2. 观察 Transparent Pass 执行前的 **Atomic Counter Buffer** 数据。
  3. 发现其初始计数值非 0，而是上一帧绘制结束后的最大值。
* **修复方法**：在 `renderTransparentPass()` 每次运行透明绘制前，先向原子计数器写入一个 0。

### OIT-LL-16 · Transparent 到 Composite 之间缺少 Memory Barrier
* **现象**：半透明合成效果不完整，网格边缘时隐时现，静止时画面看起来有局部坏点，随视角旋转闪烁。
* **原因**：在透明片元写入 SSBO (Pass 2) 与合并全屏 Shading (Pass 3) 之间没有加上 `glMemoryBarrier` 进行数据强制刷新，导致 Pass 3 采样时拿到了过时或空的数据。
* **定位过程**：在 RenderDoc 检查 Transparent 绘制到 Composite 绘制之间的命令事件，发现缺失了 MemoryBarrier 执行。
* **修复方法**：在 `renderCompositePass()` 头部补充添加 `glMemoryBarrier` 调用。

### OIT-LL-17 · 透明收集通道误开启深度写入
* **现象**：多个半透明物体前后折射关系发生混乱，只渲染了其中一两个，且先画的透明物体意外把后面的物体切掉了。
* **原因**：透明收集通道 (Pass 2) 开启了深度测试却忘记执行 `glDepthMask(GL_FALSE)`。导致先进行光栅化的透明网格把自身的深度值写入了共享的 `opaqueDepthTexture_` 中，阻止了后续原本能通过测试的更远透明片元通过测试。
* **定位过程**：
  1. 在 RenderDoc 中定位到 Transparent Pass 的 `glDrawElements`。
  2. 观察 **Pipeline State**，发现其 **Depth Mask** 为 `GL_TRUE`。
* **修复方法**：在 Pass 2 的绘制开始前显式调用 `glDepthMask(GL_FALSE)`，在 Pass 3 开始时重新恢复 `glDepthMask(GL_TRUE)`。
