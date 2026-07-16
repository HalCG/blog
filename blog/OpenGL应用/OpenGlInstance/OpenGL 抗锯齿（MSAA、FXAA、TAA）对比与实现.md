# OpenGL 抗锯齿（MSAA、FXAA、TAA）对比与实现

实时渲染中，几何边缘、高频细线以及像素硬纹理会在屏幕上产生明显的 **锯齿（Aliasing）**。为了探究并直观对比各类抗锯齿技术的性能与表现，本篇总结基于一个**运行时可切换**的对比 Demo 展开：在相同的测试场景和相同的前向渲染管线中，自由切换并测量四种 AA 模式，拆解其架构实现与关键着色器代码。

---

## 1. 核心概念与抗锯齿模式

Demo 实现了以下四种抗锯齿模式，它们在渲染管线中所处的位置和原理各不相同：

| 模式 | 类型 | 核心思路 |
| :--- | :--- | :--- |
| **None** | 无 AA | 作为基线。场景直接渲染到单采样离屏 FBO 中，再原样复制（Blit）输出到屏幕。 |
| **MSAA** | 硬件几何 AA | 光栅化阶段对每个像素进行多重采样（Multi-sampling），并在输出前由硬件驱动进行多样本解析（Resolve）。 |
| **FXAA** | 后处理 AA | 快速近似抗锯齿（Fast Approximate Anti-Aliasing）。在图像渲染完毕后，利用后处理着色器全屏检测高频亮度边缘，并沿垂直于边缘的方向进行定向插值模糊。 |
| **TAA** | 时间 AA | 时间抗锯齿（Temporal Anti-Aliasing）。每帧在子像素级别对投影矩阵施加微小抖动，并在后处理阶段利用历史缓冲区（History Buffer）将多帧图像通过重投影（Reprojection）进行时空累积。 |

---

## 2. 总体架构与 FBO 设计

为了确保对比的公平性，四种模式共用同一套场景绘制器（`SceneRenderer`）与测试几何体。所有的 AA 状态和后处理操作均在**独立的离屏帧缓冲（FBO）**上切换，而系统窗口默认的 FBO 彻底禁用 MSAA，以确保不受外界环境干扰。

### 2.1 离屏 FBO 设计

* **`SingleSampleFbo`（单采样帧缓冲）**
  * 提供 `color` 附件（`GL_RGBA8` 2D 纹理）和 `depth` 附件（`GL_DEPTH_COMPONENT32F` 32位浮点深度纹理）。
  * 它是 **None、FXAA 和 TAA** 的直接渲染目标。
  * 特别地，深度附件的 32 位浮点纹理为 TAA 提供了精确的世界空间位置重建支持。
* **`MsaaFbo`（多重采样帧缓冲）**
  * 绑定多重采样纹理（`GL_TEXTURE_2D_MULTISAMPLE`），包括多采样颜色和深度附件。
  * 它是 **MSAA** 模式的渲染目标。输出到屏幕时，通过 `glBlitFramebuffer` 驱动显卡执行多采样到单采样的 **Resolve 解析**。

---

## 3. 抗锯齿算法的 C++ 与 Shader 实现

### 3.1 FXAA（快速近似抗锯齿）

FXAA 是一种纯后处理算法，其 C++ 侧非常轻量，仅需绑定当前单采样渲染的 Color 纹理，然后画一个铺满屏幕的 Quad 即可。

#### 3.1.1 Shader 实现（fxaa.frag 核心逻辑）
```glsl
#version 420 core
layout(location = 0) out vec4 FragColor;

in vec2 textureCoord;

uniform sampler2D uInputTex;     // 离屏渲染的场景彩色图像
uniform vec2 uTexelSize;         // 纹理元素尺寸，即 (1.0/width, 1.0/height)

// RGB 到亮度的换算公式
float rgbToLuma(vec3 rgb) {
    return dot(rgb, vec3(0.299, 0.587, 0.114));
}

void main() {
    // 1. 采集当前片元 M 及上下左右四邻域的像素，并计算对应的亮度 (Luma)
    vec3 rgbM = texture(uInputTex, textureCoord).rgb;
    float lumaM = rgbToLuma(rgbM);
    float lumaN = rgbToLuma(texture(uInputTex, textureCoord + vec2(0.0, uTexelSize.y)).rgb);
    float lumaS = rgbToLuma(texture(uInputTex, textureCoord - vec2(0.0, uTexelSize.y)).rgb);
    float lumaE = rgbToLuma(texture(uInputTex, textureCoord + vec2(uTexelSize.x, 0.0)).rgb);
    float lumaW = rgbToLuma(texture(uInputTex, textureCoord - vec2(uTexelSize.x, 0.0)).rgb);

    // 2. 检测亮度的最大和最小值，计算对比度差值
    float lumaMin = min(lumaM, min(min(lumaN, lumaS), min(lumaE, lumaW)));
    float lumaMax = max(lumaM, max(max(lumaN, lumaS), max(lumaE, lumaW)));
    float lumaRange = lumaMax - lumaMin;

    // 对比度低，说明处于平坦区域，不需要模糊，直接输出原色
    if (lumaRange < max(0.0312, lumaMax * 0.125)) {
        FragColor = vec4(rgbM, 1.0);
        return;
    }

    // 3. 计算水平和垂直方向上的差值，判断边缘的大致走向
    float edgeHoriz = abs((lumaN + lumaS) - 2.0 * lumaM) * 2.0 +
                      abs((lumaN + lumaS) - (lumaW + lumaE)); // 简化近似
    float edgeVert  = abs((lumaE + lumaW) - 2.0 * lumaM) * 2.0 +
                      abs((lumaE + lumaW) - (lumaN + lumaS));

    bool isHorizontal = (edgeHoriz >= edgeVert);

    // 4. 定向模糊采样混合
    float stepLength = isHorizontal ? uTexelSize.y : uTexelSize.x;
    vec2 offset = isHorizontal ? vec2(0.0, stepLength) : vec2(stepLength, 0.0);

    vec3 rgbNeg = texture(uInputTex, textureCoord - offset * 0.5).rgb;
    vec3 rgbPos = texture(uInputTex, textureCoord + offset * 0.5).rgb;
    vec3 rgbBlend = (rgbNeg + rgbPos) * 0.5;

    // 5. 亮度安全保护：防止过渡模糊导致噪影
    float lumaBlend = rgbToLuma(rgbBlend);
    if (lumaBlend < lumaMin || lumaBlend > lumaMax) {
        FragColor = vec4(rgbM, 1.0); // 混合超出邻域范围，退回原色
    } else {
        FragColor = vec4(rgbBlend, 1.0);
    }
}
```

---

### 3.2 TAA（时间抗锯齿）

TAA 的核心思想是通过时间换空间。其核心要素包括：**子像素抖动**、**历史缓冲区 Ping-Pong 交替**、**世界坐标重投影** 以及 **邻域颜色裁剪（Neighborhood Clamping）**。

#### 3.2.1 抖动计算（Jitter）
Demo 使用低差异序列 **Halton(2, 3)** 生成 16 个周期的子像素偏移。C++ 侧将算出的微小偏移量（NDC 空间）累加到投影矩阵的第三列：
```cpp
// TaaPass::nextJitter 计算 NDC 范围的 jitter 偏移量，并对投影矩阵进行平移
glm::vec2 jitter = taaPass_.nextJitter(width, height);
camera.projection[2][0] += jitter.x * 2.0f; // 累加至 NDC x 轴平移
camera.projection[2][1] += jitter.y * 2.0f; // 累加至 NDC y 轴平移
```

#### 3.2.2 TaaPass C++ 逻辑与 Ping-Pong 机制
TAA 后处理需要从当前帧和历史帧读取，并写入新的历史帧。为避免读写冲突，`TaaPass` 内部使用 Ping-Pong 机制交替使用两张 `RGBA16F` 浮点历史纹理：
```cpp
void TaaPass::apply(GLuint currentTex, GLuint depthTex, const glm::mat4 &invVP, const glm::mat4 &prevVP, bool hasHistory) {
    int writeIndex = 1 - currentIndex_; // 0 读 1 写，或者 1 读 0 写

    // 绑定写入的历史 FBO
    glBindFramebuffer(GL_FRAMEBUFFER, historyFbo_[writeIndex]);
    glDisable(GL_DEPTH_TEST);

    shader_->use();
    // 激活并传递纹理单元
    glActiveTexture(GL_TEXTURE0); glBindTexture(GL_TEXTURE_2D, currentTex); // 当前彩色图
    glActiveTexture(GL_TEXTURE1); glBindTexture(GL_TEXTURE_2D, depthTex);   // 当前深度图
    glActiveTexture(GL_TEXTURE2); glBindTexture(GL_TEXTURE_2D, history_[currentIndex_]); // 历史彩色图 (只读)

    shader_->setInt("uCurrentColor", 0);
    shader_->setInt("uCurrentDepth", 1);
    shader_->setInt("uHistoryColor", 2);
    // 传递上帧和本帧矩阵，以及混合比例 (Blend Factor)
    shader_->setMat4("uInvViewProj", invVP);
    shader_->setMat4("uPrevViewProj", prevVP);
    shader_->setFloat("uBlendFactor", hasHistory ? 0.1f : 1.0f); // 首帧直接写入
    shader_->setBool("uHasHistory", hasHistory && validHistory_);

    drawFullscreen(); // 全屏 Quad 混合

    // 交换 Ping-Pong 读写索引
    currentIndex_ = writeIndex;
    validHistory_ = true;
}
```

#### 3.2.3 着色器实现（taa.frag）
```glsl
#version 420 core
layout(location = 0) out vec4 FragColor;

in vec2 textureCoord;

uniform sampler2D uCurrentColor;
uniform sampler2D uCurrentDepth;
uniform sampler2D uHistoryColor;

uniform mat4 uInvViewProj;  // 当前帧逆 VP 矩阵
uniform mat4 uPrevViewProj; // 上一帧 VP 矩阵
uniform vec2 uTexelSize;
uniform float uBlendFactor; // 混合因子 (一般 0.1)
uniform bool uHasHistory;

// 重投影：利用当前帧的深度和上一帧的 VP 矩阵，寻找上一帧当前像素的 UV 坐标
vec2 getReprojectedUV(vec2 uv, float depthVal) {
    float zVal = depthVal * 2.0 - 1.0;
    vec4 ndc = vec4(uv * 2.0 - 1.0, zVal, 1.0);
    vec4 worldPos = uInvViewProj * ndc;
    worldPos /= worldPos.w;

    vec4 prevNdc = uPrevViewProj * worldPos;
    prevNdc /= prevNdc.w;
    return prevNdc.xy * 0.5 + 0.5;
}

// 邻域裁剪：使用当前像素周围 3x3 范围的色彩包围盒，将历史颜色约束在合理区间内
vec3 clampHistoryColor(vec3 historyColor, vec2 uv) {
    vec3 minColor = texture(uCurrentColor, uv).rgb;
    vec3 maxColor = minColor;

    // 遍历 3x3 范围内的像素
    for (int y = -1; y <= 1; ++y) {
        for (int x = -1; x <= 1; ++x) {
            vec2 offset = vec2(float(x), float(y)) * uTexelSize;
            vec3 neighbor = texture(uCurrentColor, uv + offset).rgb;
            minColor = min(minColor, neighbor);
            maxColor = max(maxColor, neighbor);
        }
    }

    return clamp(historyColor, minColor, maxColor);
}

void main() {
    vec3 current = texture(uCurrentColor, textureCoord).rgb;

    if (!uHasHistory) {
        FragColor = vec4(current, 1.0);
        return;
    }

    float depth = texture(uCurrentDepth, textureCoord).r;
    vec2 prevUV = getReprojectedUV(textureCoord, depth);

    // 边缘越界检查，若重投影超出视界，直接采用当帧原色
    if (prevUV.x < 0.0 || prevUV.x > 1.0 || prevUV.y < 0.0 || prevUV.y > 1.0) {
        FragColor = vec4(current, 1.0);
        return;
    }

    vec3 history = texture(uHistoryColor, prevUV).rgb;
    history = clampHistoryColor(history, textureCoord); // 裁剪历史颜色防止鬼影

    // 进行历史和当前颜色的插值混合 (90% 历史 + 10% 本帧)
    vec3 finalColor = mix(history, current, uBlendFactor);
    FragColor = vec4(finalColor, 1.0);
}
```

---

## 4. 常见问答与注意事项

### 4.1 在 TAA 模式下，为什么哪怕相机静止不动，Demo 依然不停在后台“出帧”渲染？
因为 TAA 的多帧混合是依赖每帧不同的**子像素抖动（Jitter）**来增加采样密度的。如果画面静止时也停止渲染，TAA 将无法收集到多样本的历史积累，边缘就无法从粗糙阶梯变平滑。为了保持连续不断的子像素级微调，TAA 必须在静止时也每帧生成 Halton 偏移并持续触发渲染流程。

### 4.2 重投影之后，为什么必须要对采样得到的历史颜色进行 Neighbor Clamping？
时间累积最大的副作用是运动时产生错位叠影——**鬼影（Ghosting）**。当相机移动或者场景中物体运动时，上一帧该像素对应的 3D 物体可能已经被遮挡或移走，重投影采到的历史颜色实际上属于“旧背景”或“已移走物体的颜色”。如果不进行裁剪强行混合，这些错位颜色就会像残影一样拖拽出来。通过 3x3 邻域裁剪，如果采到的历史颜色和当前像素周围的颜色极不相称，就会被强行塞进合理的颜色区间中，从而彻底消除或减轻鬼影。

---

## 5. 调试与排查：RenderDoc 问题记录

在抗锯齿 Demo 开发中遇到的硬件和 Ping-Pong 贴图错误总结如下：

### AA-01 · MSAA 模式下 Scene 仍写入单采样 FBO
* **现象**：按键盘 `2` 切换到 MSAA 模式后，画面无任何边缘柔化表现，锯齿坚硬。
* **原因**：应用层管线重构分发时，在 MSAA 分支依然调用了单采样 FBO 的绑定接口：`singleFbo_.bind()`，导致场景绘制时硬件没有以多重采样模式进行光栅化，后续的 Resolve 步骤自然没有有效数据。
* **定位过程**：
  1. 用 RenderDoc 抓帧，选中第一个 mesh Draw 事件。
  2. 进入 **Pipeline State**，查看 **Framebuffer** 的 Color attachment。
  3. 发现其 **Samples** 标志位为 `1`，而预期的多重采样 FBO 属性应为 `4`。
* **修复方法**：将 MSAA 分支修改为正确的 `msaaFbo_.bind()`。

### AA-02 · MSAA Resolve Blit 宽高尺寸或源目标绑定有误
* **现象**：画面大范围闪烁，右侧或上侧局部像素花屏缺失，或者抗锯齿效果极弱。
* **原因**：`Framebuffer.cpp` 的 `resolveColorToDefault` 成员函数在使用 `glBlitFramebuffer` 拷贝缓冲区时，源与目标的视口边界坐标设定错误，导致没有完全覆盖视窗；或者把单采样的 Color 误当成了源 FBO。
* **定位过程**：在 RenderDoc 检查 Post Pass 之前的 `glBlitFramebuffer` 行为，核对 **READ_FRAMEBUFFER** 和 **DRAW_FRAMEBUFFER** 的 ID 及多采样属性，并在预览中查看 blit 覆盖的矩形宽和高是否吻合窗口尺寸。
* **修复方法**：更正 Blit 边界参数，使其保持与窗口同步 resize。

### AA-03 · FXAA 误读深度纹理进行处理
* **现象**：开启 FXAA 模式后，场景原图色彩缺失，屏幕上仅显示轮廓伪彩色，或者全屏显现灰度图案。
* **原因**：在调用 `applyFxaa` 后处理着色器时，绑定的 uniform texture 指向了离屏单采样帧缓冲的深度纹理 ID，导致边缘检测算法直接在深度值上计算，输出全错。
* **定位过程**：
  1. 选中 FXAA 全屏绘制事件。
  2. 切换至 **Texture Viewer** 面板，检查绑定在 Texture Unit 0 的纹理图像。
  3. 发现当前绑定的并非彩色场景图，而是 Depth Component 图。
* **修复方法**：在 C++ 的 `applyFxaa` 参数中更正为传入 `singleFbo_.colorTexture()`。

### AA-04 · TAA 读写同一历史缓冲区导致重投影失效
* **现象**：TAA 开启后拖动相机产生严重的白色网格错影与重影，不随时间收敛，有时局部色彩被快速渲染为死黑或高亮。
* **原因**：在 TaaPass 的 `apply()` 方法中，绑定的输入 `uHistoryColor` 的纹理 ID 错绑成了即将被渲染写入的同一张历史纹理，使得 Shader 在同一个绘图 Pass 内部对同一贴图既读又写，破坏了 Ping-Pong 设计，导致纹理被写入脏数据。
* **定位过程**：
  1. Capture 抓取两帧，发现 Taa Draw 对应的 **Texture Unit 2** 纹理 ID 和输出 FBO 绑定的贴图 ID 是一致的。
  2. 这样同一张贴图在 Pipeline 中既作为 Texture Attachment 0 (Write)，又作为 Texture Binding 2 (Read)。
* **修复方法**：严格在 `history_[readIndex]` 进行采样，在 `history_[writeIndex]` 对应的 Framebuffer 执行渲染，并在每次 apply 的最后进行 `read/write` 索引更替交换。
