# OpenGL Framebuffer（帧缓冲）及其附件使用详解

在 OpenGL 默认情况下，所有的渲染结果都会直接输出到屏幕的默认帧缓冲区中。然而，现代渲染管线离不开**离屏渲染（Off-screen Rendering）**。通过使用自定义**帧缓冲对象（FBO - Framebuffer Object）**，我们可以将场景渲染到非屏幕的图像目标中，从而实现后期处理特效、阴影贴图（Shadow Mapping）、反射、延迟渲染等高级图形技术。

本文将详细探讨 FBO 的核心组成、工作原理、数据流向，并详解**多渲染目标（MRT）**与**帧缓冲拷贝（Blit）**的实现。

---

## 一、 核心概念与 FBO 的结构

### 1. 默认帧缓冲区 vs 自定义帧缓冲区
- **默认帧缓冲区**：由窗口系统在创建 OpenGL 上下文时自动创建并管理（ID 为 `0`）。它直接连接到显示器屏幕。
- **自定义帧缓冲区 (FBO)**：由开发者在显存中手动创建。FBO 本身并不存储任何图像数据，它只是一系列用来管理和路由渲染输出的**插槽（Slots）**，这些插槽被称为**附件挂载点（Attachment Points）**。

### 2. 帧缓冲区的附件挂载结构

FBO 至少需要附加一个附件（Color、Depth 或 Stencil）才能被称为“完整”的帧缓冲区。

```
                    【 帧缓冲对象 (FBO) 结构示意图 】
 ┌───────────────────────────────────────────────────────────────┐
 │                   FBO (Framebuffer Object)                    │
 ├──────────────────────┬──────────────────────┬─────────────────┤
 │ 颜色挂载点 0         │ 深度挂载点           │ 模板挂载点      │
 │ (GL_COLOR_ATTACH0)   │ (GL_DEPTH_ATTACHMENT)│ (GL_STENCIL_ATT)│
 └──────────┬───────────┴──────────┬───────────┴────────┬────────┘
            │                      │                    │
            ▼ 关联                 ▼ 关联               ▼ 关联
     ┌──────────────┐       ┌──────────────┐     ┌──────────────┐
     │  纹理附件    │       │ 渲染缓冲(RBO)│     │ 渲染缓冲(RBO)│
     │ (可读写纹理) │       │ (只写深度缓冲)│     │ (只写模板缓冲)│
     └──────────────┘       └──────────────┘     └──────────────┘
```

### 3. 附件类型对比：纹理附件 vs 渲染缓冲对象 (RBO)

- **纹理附件（Texture Attachment）**：
  - **特点**：渲染完成后，可以像普通纹理一样在后续的着色器中进行采样读取。
  - **适用场景**：后期处理（Post-processing）、阴影贴图、反射贴图等需要读取渲染结果的场景。
- **渲染缓冲对象（RBO - Renderbuffer Object）**：
  - **特点**：只写不读。RBO 的内存排布经过了底层的深度优化，专门针对只写场景（例如深度测试和模板测试）。
  - **适用场景**：深度缓冲、模板缓冲等在后续着色器中**不需要读取**，仅用于内部管线测试的附件。

---

## 二、 离屏渲染与数据流向

离屏渲染通常采取“两步走”的数据流向：

```
第一步：渲染到离屏 FBO ────────► 写入纹理附件 ────────► 场景图元信息暂存
                                                           │
                                                           ▼
第二步：绑定默认屏幕 FBO ◄────── 进行像素处理 ◄───── FS 采样该离屏纹理 (在全屏四边形上)
```

---

## 三、 自定义帧缓冲区的实现步骤

### 1. 配置 FBO 流程代码
```cpp
// 1. 创建并绑定帧缓冲对象 (FBO)
unsigned int fbo;
glGenFramebuffers(1, &fbo);
glBindFramebuffer(GL_FRAMEBUFFER, fbo);

// 2. 创建颜色附件纹理 (Color Attachment)
unsigned int textureColorBuffer;
glGenTextures(1, &textureColorBuffer);
glBindTexture(GL_TEXTURE_2D, textureColorBuffer);
// 此时 NULL 表示仅为纹理分配显存，不填充初始数据
glTexImage2D(GL_TEXTURE_2D, 0, GL_RGB, SCR_WIDTH, SCR_HEIGHT, 0, GL_RGB, GL_UNSIGNED_BYTE, NULL);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
// 将该纹理关联到 FBO 的颜色挂载点 0
glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, textureColorBuffer, 0);

// 3. 创建深度和模板 RBO 附件 (Depth & Stencil Attachment)
unsigned int rbo;
glGenRenderbuffers(1, &rbo);
glBindRenderbuffer(GL_RENDERBUFFER, rbo);
// 分配 RBO 存储空间：24位深度 + 8位模板打包格式
glRenderbufferStorage(GL_RENDERBUFFER, GL_DEPTH24_STENCIL8, SCR_WIDTH, SCR_HEIGHT);
// 将该 RBO 关联到 FBO 的深度和模板联合挂载点
glFramebufferRenderbuffer(GL_FRAMEBUFFER, GL_DEPTH_STENCIL_ATTACHMENT, GL_RENDERBUFFER, rbo);

// 4. 检查 FBO 是否配置完整
if(glCheckFramebufferStatus(GL_FRAMEBUFFER) != GL_FRAMEBUFFER_COMPLETE)
    std::cout << "ERROR::FRAMEBUFFER:: Framebuffer is not complete!" << std::endl;

// 5. 解绑 FBO，恢复默认屏幕渲染
glBindFramebuffer(GL_FRAMEBUFFER, 0);
```

---

## 四、 高级特性 1：多渲染目标（MRT - Multiple Render Targets）

在延迟渲染（Deferred Shading）或提取 Bloom 高光等高级技术中，我们需要在**单次绘制（One Draw Call）**中，将片元着色器的不同计算结果分别输出到**多个不同的颜色纹理附件**中。这就是多渲染目标（MRT）。

```
                        【 MRT 数据输出流程 】
                           [ 片元着色器 (FS) ]
                            /               \
              layout(location=0)          layout(location=1)
                          /                   \
                         ▼                     ▼
                 [ 颜色附件 0 ]          [ 颜色附件 1 ]
                 (例如: 正常颜色)        (例如: 材质法线或高光)
```

### 1. C++ 端配置
需要为 FBO 关联多个颜色纹理，并显式通知 OpenGL 开启哪些输出插槽：
```cpp
// 1. 创建并关联两个颜色纹理附件到同一个 FBO 上
glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT0, GL_TEXTURE_2D, colorTex0, 0);
glFramebufferTexture2D(GL_FRAMEBUFFER, GL_COLOR_ATTACHMENT1, GL_TEXTURE_2D, colorTex1, 0);

// 2. 指定绘制输出路由（核心调用，通知 OpenGL 将哪些插槽激活）
unsigned int attachments[2] = { GL_COLOR_ATTACHMENT0, GL_COLOR_ATTACHMENT1 };
glDrawBuffers(2, attachments); 
```

### 2. GLSL 片元着色器配置
在着色器中，利用 `layout (location = X)` 直接将输出变量映射到对应的挂载点上：
```glsl
#version 330 core

// 映射到 GL_COLOR_ATTACHMENT0
layout (location = 0) out vec4 FragColor;
// 映射到 GL_COLOR_ATTACHMENT1
layout (location = 1) out vec4 NormalColor;

in vec3 FragNormal;

void main()
{
    // 输出正常场景颜色
    FragColor = vec4(1.0, 0.5, 0.2, 1.0);
    // 输出法线信息（常用于 G-Buffer 延迟渲染）
    NormalColor = vec4(normalize(FragNormal), 1.0);
}
```

---

## 五、 高级特性 2：帧缓冲拷贝（Framebuffer Blitting）

当我们开启了**多重采样抗锯齿（MSAA）**时，离屏渲染的 FBO 内部附加的必须是多重采样纹理（Multisample Texture）。由于这种纹理不能直接被常规着色器采样，我们必须先将多重采样 FBO 的内容**“解析（Resolve / Copy）”**到一个普通的单采样纹理 FBO 中。

这需要使用 `glBlitFramebuffer` 来在显存中实现超高速的 FBO 数据拷贝或下采样：

```cpp
// 1. 绑定源 FBO (包含 MSAA 图像)
glBindFramebuffer(GL_READ_FRAMEBUFFER, msaaFBO);
// 2. 绑定目标 FBO (包含普通单采样纹理)
glBindFramebuffer(GL_DRAW_FRAMEBUFFER, normalFBO);

// 3. 执行快速位块拷贝 (Blit)
// 参数：源矩形区间 (X0,Y0,X1,Y1) -> 目标矩形区间 (X0,Y0,X1,Y1)
// 遮罩：这里仅拷贝颜色缓存 (也可以拷贝深度/模板)
glBlitFramebuffer(0, 0, SCR_WIDTH, SCR_HEIGHT, 
                   0, 0, SCR_WIDTH, SCR_HEIGHT, 
                   GL_COLOR_BUFFER_BIT, GL_NEAREST);

// 4. 解绑 FBO
glBindFramebuffer(GL_FRAMEBUFFER, 0);
```

---

## 六、 离屏渲染与后期处理完整渲染循环

```cpp
while (!glfwWindowShouldClose(window)) {
    // ===== 第一步：离屏渲染 (写入自定义 FBO 纹理) =====
    glBindFramebuffer(GL_FRAMEBUFFER, fbo);
    glEnable(GL_DEPTH_TEST); // 开启深度测试
    
    glClearColor(0.1f, 0.1f, 0.1f, 1.0f);
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    
    drawScene(); // 绘制你的复杂 3D 场景

    // ===== 第二步：后期处理 (渲染全屏四边形并输出到屏幕) =====
    glBindFramebuffer(GL_FRAMEBUFFER, 0); // 回到默认屏幕 FBO
    glDisable(GL_DEPTH_TEST);             // 2D 后期不需要深度测试
    
    glClearColor(1.0f, 1.0f, 1.0f, 1.0f); 
    glClear(GL_COLOR_BUFFER_BIT);         // 仅清空屏幕颜色
    
    postProcessingShader.use();
    glBindVertexArray(quadVAO);
    // 绑定第一步中渲染好的离屏颜色纹理
    glBindTexture(GL_TEXTURE_2D, textureColorBuffer); 
    glDrawArrays(GL_TRIANGLES, 0, 6);     // 绘制一个盖满屏幕的矩形
}
```

### 经典的后期处理 GLSL 片元着色器示例 (反色效果)
```glsl
#version 330 core
out vec4 FragColor;
in vec2 TexCoords;

uniform sampler2D screenTexture; // 传入的离屏颜色纹理

void main()
{
    // 对屏幕图像进行像素级反色处理
    vec3 originalColor = texture(screenTexture, TexCoords).rgb;
    vec3 invertedColor = vec3(1.0) - originalColor;
    
    FragColor = vec4(invertedColor, 1.0);
}
```

---

## 七、 性能优化建议

1. **按需解绑和清空**：如果确定每帧都会完全重写 FBO 的内容，可以适当避免清空无用的附件。
2. **避免频繁创建/销毁 FBO**：在初始化时一次性创建好所需大小的 FBO 及其附件，运行时仅切换绑定。如果视口分辨率（Viewport）发生变化，使用 `glTexImage2D` 重新为绑定的纹理分配内存，而不是重新生成 FBO。
3. **首选 RBO 作为 Depth/Stencil 缓冲**：比深度纹理具有更好的硬件读写带宽。
4. **共享 Depth/Stencil 缓冲**：在复杂的延迟渲染中，如果多个 FBO 分辨率一致，可以共享同一个 RBO 以减少显存开销。