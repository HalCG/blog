# OpenGL 如何处理 Retina/高 DPI 显示屏下视口与窗口尺寸不一致

随着 Retina 屏幕（苹果设备的视网膜屏）以及 Windows/Linux 平台下各种高分屏（High-DPI Display）的普及，图形开发者面临着一个经典的问题：**创建的窗口大小与 OpenGL 实际渲染的帧缓冲区大小不一致**。这会导致画面模糊、只渲染在屏幕左下角或者鼠标交互位置错乱等一系列现象。

本文将深入解析高 DPI 的技术本质，并给出在 OpenGL（配合 GLFW 框架）中优雅适配高分屏的完整解决方案。

---

## 一、 逻辑像素与物理像素（高 DPI 的本质）

在传统显示器上，设备的一个像素（Pixel）就对应屏幕上的一个物理发光点（即像素比例为 1:1）。
然而在高 DPI 屏幕（如 Retina 屏）上，为了让文字和 UI 看起来更加细腻且大小合适，操作系统引入了**逻辑像素（Logical Pixels / Points）**和**物理像素（Physical Pixels）**的分离机制：

- **逻辑像素（窗口尺寸）**：操作系统用来管理 UI 大小和布局的单位。例如，在代码中创建一个 $800 \times 600$ 的窗口，指的是逻辑像素。
- **物理像素（帧缓冲尺寸）**：屏幕上实际存在的物理发光点个数。在 Retina 屏幕上，物理像素数通常是逻辑像素数的 2 倍甚至更高。
- **内容缩放比（DPI Scale Factor）**：物理像素与逻辑像素的比例关系。例如在 MacBook 屏幕上，缩放比通常为 2.0，此时一个 $800 \times 600$ 的窗口，其内部对应的物理帧缓冲区实际上是 $1600 \times 1200$。

---

## 二、 视口与窗口不一致导致的问题

在 OpenGL 程序中，我们使用 `glfwCreateWindow(800, 600, ...)` 创建窗口。
- **GLFW**：其窗口大小管理 API（如窗体大小设置、鼠标光标位置回调等）默认使用的是操作系统的**逻辑像素**。
- **OpenGL**：底层的 `glViewport(0, 0, width, height)` 以及 `glReadPixels` 指令，需要的是**物理像素（实际帧缓冲的大小）**。

### 典型失败表现
如果你直接把逻辑窗口大小（$800 \times 600$）传给 `glViewport`，OpenGL 将只会在 $1600 \times 1200$ 的物理帧缓冲区左下角 $800 \times 600$ 的区域内进行绘制，导致画面**缩成屏幕的四分之一**，其余地方呈一片漆黑；或者画面因为被强行拉伸而变得**模糊重影**。

---

## 三、 核心解决方案：帧缓冲区尺寸

要彻底解决这一问题，核心原则是：**永远不要用窗口的逻辑大小来设置 OpenGL 的 Viewport，必须使用帧缓冲区的物理像素大小。**

### 1. 使用 `glfwGetFramebufferSize` 获取实际尺寸
GLFW 提供了专门的 API 用来获取以像素为单位的物理帧缓冲区大小：

```cpp
int scrWidth, scrHeight;
// 获取实际渲染像素大小
glfwGetFramebufferSize(window, &scrWidth, &scrHeight);
glViewport(0, 0, scrWidth, scrHeight);
```

### 2. 监听帧缓冲区变化回调
当用户拖动窗口改变大小时，我们必须注册帧缓冲区大小变化的回调函数，而不是窗口大小变化的回调：

```cpp
// 1. 定义帧缓冲区大小变化回调函数
void framebuffer_size_callback(GLFWwindow* window, int width, int height)
{
    // 回调函数传入的 width 和 height 已经是由 GLFW 转换好的物理像素大小
    glViewport(0, 0, width, height);
}

// 2. 在初始化主窗口时进行注册
glfwSetFramebufferSizeCallback(window, framebuffer_size_callback);
```
**关键区别**：请始终使用 `glfwSetFramebufferSizeCallback`，避免使用 `glfwSetWindowSizeCallback`（后者返回的是逻辑像素，在 Retina 屏幕上会导致视口设置偏小）。

### 3. macOS 下的特殊控制（Cocoa Retina Framebuffer）
如果你确实希望在 Retina 屏幕上禁用高 DPI 渲染，让帧缓冲区大小强制退化到逻辑像素大小，可以使用 GLFW 提供的 macOS/Cocoa 平台专属 Hint：

```cpp
// 禁用 Retina 缩放（⚠️ 注意：这是 macOS/Cocoa 特定选项，在 Windows/Linux 上无效）
glfwWindowHint(GLFW_COCOA_RETINA_FRAMEBUFFER, GLFW_FALSE);
```
**注意**：这虽然让视口与窗口大小一致了，但也意味着你主动放弃了高分辨率抗锯齿的精细画质，画面在 Retina 屏上会显得粗糙多锯齿。通常不推荐这样做。

---

## 四、 完整代码示例

下面是一个安全适配 Retina 与普通显示器的典型 OpenGL 初始化框架：

```cpp
#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>

void framebuffer_size_callback(GLFWwindow* window, int width, int height) {
    glViewport(0, 0, width, height);
}

int main() {
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    // 1. 创建逻辑大小为 800x600 的窗口
    GLFWwindow* window = glfwCreateWindow(800, 600, "Retina Display Adapter", NULL, NULL);
    if (!window) {
        std::cout << "Failed to create GLFW window" << std::endl;
        glfwTerminate();
        return -1;
    }
    glfwMakeContextCurrent(window);
    
    // 2. 注册物理帧缓冲变化回调
    glfwSetFramebufferSizeCallback(window, framebuffer_size_callback);

    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
        std::cout << "Failed to initialize GLAD" << std::endl;
        return -1;
    }

    // 3. 初始设置：获取当前设备实际对应的帧缓冲大小并设置 Viewport
    int frameWidth, frameHeight;
    glfwGetFramebufferSize(window, &frameWidth, &frameHeight);
    glViewport(0, 0, frameWidth, frameHeight);

    // 渲染循环...
    while (!glfwWindowShouldClose(window)) {
        glClearColor(0.2f, 0.3f, 0.3f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        glfwSwapBuffers(window);
        glfwPollEvents();
    }

    glfwTerminate();
    return 0;
}
```

---

## 五、 进阶：鼠标输入坐标的重映射（逻辑转物理）

在高 DPI 设备上，除了画面显示问题，**鼠标交互（点击检测、射线检测）**是另一个重灾区。
- **冲突起因**：通过 `glfwSetCursorPosCallback` 获取到的鼠标坐标 $(x_{mouse}, y_{mouse})$ 是以**逻辑像素**为单位的（例如窗口右上角为 $(800, 600)$）。
- **问题**：如果我们在片段着色器中做点击判定，或者调用 `glReadPixels` 读取鼠标指针下某像素的颜色/深度，传入的必须是**物理坐标**（例如右上角为 $(1600, 1200)$）。
- **解决思路**：必须利用缩放比例（Content Scale）对鼠标坐标进行重映射。

### 1. 查询当前内容缩放比
GLFW 提供了 `glfwGetWindowContentScale` 函数：
```cpp
float xscale, yscale;
glfwGetWindowContentScale(window, &xscale, &yscale);
```

### 2. 坐标转换公式与示例
在鼠标移动或点击回调中，我们可以做如下计算：

```cpp
void mouse_button_callback(GLFWwindow* window, int button, int action, int mods)
{
    if (button == GLFW_MOUSE_BUTTON_LEFT && action == GLFW_PRESS)
    {
        double xpos, ypos;
        // 1. 获取 GLFW 中的逻辑鼠标坐标（以左上角为原点）
        glfwGetCursorPos(window, &xpos, &ypos);
        
        // 2. 获取当前窗口的缩放比例
        float xscale, yscale;
        glfwGetWindowContentScale(window, &xscale, &yscale);
        
        // 3. 转换为物理像素坐标
        int pixelX = static_cast<int>(xpos * xscale);
        int pixelY = static_cast<int>(ypos * yscale);
        
        // 4. 注意：OpenGL 的 Viewport 坐标系原点在左下角，而操作系统原点在左上角
        int frameWidth, frameHeight;
        glfwGetFramebufferSize(window, &frameWidth, &frameHeight);
        // 将 Y 轴翻转，得到符合 OpenGL 规范的物理像素坐标
        int glPixelY = frameHeight - pixelY;
        
        std::cout << "Logical Mouse Pos: (" << xpos << ", " << ypos << ")" << std::endl;
        std::cout << "Physical Pixel Pos: (" << pixelX << ", " << glPixelY << ")" << std::endl;
        
        // 此时可以使用 pixelX 和 glPixelY 安全地调用 glReadPixels 读取深度等
    }
}
```

---

## 六、 总结

1. **逻辑像素（窗口空间）** 与 **物理像素（帧缓冲空间）** 在 Retina 和高 DPI 屏幕上是分离的，比例取决于内容缩放系数（Scale Factor）。
2. 在 OpenGL 中，涉及渲染指令（`glViewport`）、裁剪测试（`glScissor`）、读取像素（`glReadPixels`）等操作时，**必须使用以物理像素为单位的帧缓冲尺寸**，而非窗口大小。
3. 始终使用 `glfwGetFramebufferSize` 和 `glfwSetFramebufferSizeCallback` 来获取并监听视口大小。
4. 在处理鼠标点击检测或 UI 交互时，要调用 `glfwGetWindowContentScale` 将鼠标的逻辑坐标乘以缩放比并翻转 $Y$ 轴，方可映射为正确的 OpenGL 像素位置。
