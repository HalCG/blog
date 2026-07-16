---
title: VTK 与 OpenGL 渲染机制浅析
description: ## 前言    文章来源：[VTK 与 OpenGL 渲染机制浅析](https://www.cnblogs.com/chendasxian/p/19055145)  在医疗影像可视化开发过程中，**VTK（Visualization Toolkit）** 是一个常用的开源、跨平台可视化库。 无论
---

# VTK 与 OpenGL 渲染机制浅析


## 前言



文章来源：[VTK 与 OpenGL 渲染机制浅析](https://www.cnblogs.com/chendasxian/p/19055145)
 在医疗影像可视化开发过程中，**VTK（Visualization Toolkit）** 是一个常用的开源、跨平台可视化库。 无论是集成在 **WPF**、**Qt**，还是作为后端渲染部署在 **Linux** 上，它都有广泛的应用场景。



VTK 功能十分强大，提供了丰富的组件：



- **数据结构**：点集、网格、图像、体数据等
- **过滤器**：平滑、裁剪、表面提取
- **渲染器**：2D/3D 显示
- **交互控件**：交互式操作支持


这些能力帮助开发者快速搭建可视化应用。 借助 VTK，可以实现：



- **医学影像可视化**：CT/MRI 三维重建、表面提取
- **工业仿真结果可视化**：流体、应力场、有限元分析结果
- **科学数据绘制**：体渲染、等值面、切片、点云
- **高级渲染功能**：体绘制、光照、着色器扩展、交互式可视化


VTK 使用 **管道机制**，以需求驱动的方式来更新和渲染，从而减少重复绘制。
 在绘制过程中，涉及的主要类如下，有一种常见的比喻，将它们概括为：



- 舞台：`vtkWindow`
- 演员：`vtkActor`
- 导演：`vtkRender`
- 映射器：`vtkMapper`
- 数据源：`vtkDataSource`


这个比喻相当贴切，但前提是你已经理解了 **VTK 的渲染原理**。



需要注意的是，**VTK 并不直接实现底层渲染**，而是依赖后端图形 API（主要是 **OpenGL**）来完成绘制工作。 它通过一层抽象封装来管理数据与 OpenGL 资源，使开发者无需手写繁琐的 `glDraw*` 调用，也能实现复杂的可视化效果。
 本篇随笔将简要介绍 **OpenGL 的绘制原理**，并结合源码分析 VTK 的具体实现。



---



## OpenGL 渲染原理



### 渲染管线



首先需要明确：**OpenGL 不是一个库，而是一个标准**，由各个硬件厂商具体实现。 正因为 VTK 的底层基于 OpenGL，它才能够实现跨平台可用。



![](https://i-blog.csdnimg.cn/img_convert/9eb78044a51627e8741b7b440c7c8d9a.png)



从接口层面看，OpenGL 的渲染 API 并不复杂，真正的难点在于背后的数学与渲染管线设计。 常见的渲染结构包括：



-

**VBO（Vertex Buffer Object）**：存储顶点信息，并上传到 GPU


-

**EBO/IBO（Element/Index Buffer Object）**：记录顶点索引，决定绘制哪些点


-

**VAO（Vertex Array Object）**：维护并记录 VBO 与 EBO 的绑定关系


-

着色器（Shader）



：




- **顶点着色器（Vertex Shader）**：处理顶点数据，将其转换为空间位置
- **片段着色器（Fragment Shader）**：处理片元（像素），定义最终的颜色输出



一个典型的渲染 Demo 步骤如下：



- 定义顶点数据与索引数据
- 将数据上传到 GPU
- 将 VBO 与 EBO 的关系绑定到 VAO
- 编写顶点着色器：将顶点数据解释为空间位置
- 编写片段着色器：将像素渲染为橙色


通过这一系列步骤，就可以绘制出一个最基本的三角形，demo如下。



---



### 一个简单的 OpenGL 渲染示例



```
// 片段着色器源码
const char* fragmentShaderSource = R"(
#version 330 core
out vec4 FragColor;

void main()
{
    FragColor = vec4(1.0, 0.5, 0.2, 1.0); // 橙色
}
)";

int main()
{
        // 初始化 GLFW
        glfwInit();
        glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
        glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
        glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

        // 创建窗口
        GLFWwindow* window = glfwCreateWindow(800, 600, "OpenGL Triangle", NULL, NULL);
        if (window == NULL)
        {
                std::cout << "创建窗口失败!" << std::endl;
                glfwTerminate();
                return -1;
        }
        glfwMakeContextCurrent(window);

        if (glewInit() != GLEW_OK) {
                std::cout << "Failed to initialize GLEW" << std::endl;
        }

        // 定义三角形顶点数据
        float vertices[] = {
                 0.0f,  0.5f, 0.0f,  // 顶点 0
                -0.5f, -0.5f, 0.0f,  // 顶点 1
                 0.5f, -0.5f, 0.0f   // 顶点 2
        };

        unsigned int indices[] = {
                0, 1, 2   // 三角形
        };

        // 生成 VAO, VBO, EBO
        unsigned int VAO, VBO, EBO;
        glGenVertexArrays(1, &VAO);
        glGenBuffers(1, &VBO);
        glGenBuffers(1, &EBO);

        // 绑定 VAO
        glBindVertexArray(VAO);

        // 绑定 VBO 并传输顶点数据
        glBindBuffer(GL_ARRAY_BUFFER, VBO);
        glBufferData(GL_ARRAY_BUFFER, sizeof(vertices), vertices, GL_STATIC_DRAW);

        // 绑定 EBO 并传输索引数据
        glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, EBO);
        glBufferData(GL_ELEMENT_ARRAY_BUFFER, sizeof(indices), indices, GL_STATIC_DRAW);

        // 设置顶点属性指针
        glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
        glEnableVertexAttribArray(0);

        // 编译顶点着色器
        unsigned int vertexShader = glCreateShader(GL_VERTEX_SHADER);
        glShaderSource(vertexShader, 1, &vertexShaderSource, NULL);
        glCompileShader(vertexShader);

        // 编译片段着色器
        unsigned int fragmentShader = glCreateShader(GL_FRAGMENT_SHADER);
        glShaderSource(fragmentShader, 1, &fragmentShaderSource, NULL);
        glCompileShader(fragmentShader);

        // 链接着色器程序
        unsigned int shaderProgram = glCreateProgram();
        glAttachShader(shaderProgram, vertexShader);
        glAttachShader(shaderProgram, fragmentShader);
        glLinkProgram(shaderProgram);

        // 删除着色器对象（已经链接进程序）
        glDeleteShader(vertexShader);
        glDeleteShader(fragmentShader);

        // 渲染循环
        while (!glfwWindowShouldClose(window))
        {
                // 清屏
                glClearColor(0.2f, 0.3f, 0.3f, 1.0f);
                glClear(GL_COLOR_BUFFER_BIT);

                // 使用着色器程序
                glUseProgram(shaderProgram);

                // 绘制三角形
                glBindVertexArray(VAO);
                glDrawElements(GL_TRIANGLES, 3, GL_UNSIGNED_INT, 0);

                // 交换缓冲区并处理事件
                glfwSwapBuffers(window);
                glfwPollEvents();
        }

        // 清理资源
        glDeleteVertexArrays(1, &VAO);
        glDeleteBuffers(1, &VBO);
        glDeleteBuffers(1, &EBO);

        glfwTerminate();
        return 0;
}

```


![](https://i-blog.csdnimg.cn/img_convert/a43e1f993720aae7168cc18300b46f4d.png)



## 一个简单的 VTK 渲染示例



vtk本身是按需构建，在配置管道之后，vtkWIndow的Render方法，会将需求向上传递，由vtkRenderer去逐个绘制vtkActor，vtkActor通过mapper向上获取输入，并将输入转换成opengl相关的信息，让GPU去绘制。下面的代码还是绘制三角形。



```
#include <vtkActor.h>
#include <vtkCellArray.h>
#include <vtkPoints.h>
#include <vtkPolyData.h>
#include <vtkPolyDataMapper.h>
#include <vtkProperty.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>
#include <vtkRenderer.h>
#include <vtkSmartPointer.h>
#include <vtkTriangle.h>

#include <vtkAutoInit.h>
VTK_MODULE_INIT(vtkRenderingOpenGL2);
VTK_MODULE_INIT(vtkInteractionStyle);

int main()
{
  // 1. 创建顶点
  vtkSmartPointer<vtkPoints> points = vtkSmartPointer<vtkPoints>::New();
  points->InsertNextPoint(0.0, 0.5, 0.0);   // 顶点 0
  points->InsertNextPoint(-0.5, -0.5, 0.0); // 顶点 1
  points->InsertNextPoint(0.5, -0.5, 0.0);  // 顶点 2

  // 2. 创建三角形单元
  vtkSmartPointer<vtkTriangle> triangle = vtkSmartPointer<vtkTriangle>::New();
  triangle->GetPointIds()->SetId(0, 0);
  triangle->GetPointIds()->SetId(1, 1);
  triangle->GetPointIds()->SetId(2, 2);

  vtkSmartPointer<vtkCellArray> triangles = vtkSmartPointer<vtkCellArray>::New();
  triangles->InsertNextCell(triangle);

  // 3. 创建 PolyData
  vtkSmartPointer<vtkPolyData> polyData = vtkSmartPointer<vtkPolyData>::New();
  polyData->SetPoints(points);
  polyData->SetPolys(triangles);

  // 4. Mapper
  vtkSmartPointer<vtkPolyDataMapper> mapper = vtkSmartPointer<vtkPolyDataMapper>::New();
  mapper->SetInputData(polyData);

  // 5. Actor
  vtkSmartPointer<vtkActor> actor = vtkSmartPointer<vtkActor>::New();
  actor->SetMapper(mapper);
  actor->GetProperty()->SetColor(1.0, 0.5, 0.0); // 橙色

  // 6. Renderer
  vtkSmartPointer<vtkRenderer> renderer = vtkSmartPointer<vtkRenderer>::New();
  renderer->AddActor(actor);
  renderer->SetBackground(0.2, 0.3, 0.3); // 背景颜色

  // 7. RenderWindow
  vtkSmartPointer<vtkRenderWindow> renderWindow = vtkSmartPointer<vtkRenderWindow>::New();
  renderWindow->AddRenderer(renderer);
  renderWindow->SetSize(800, 600);

  // 8. Interactor
  vtkSmartPointer<vtkRenderWindowInteractor> interactor =
    vtkSmartPointer<vtkRenderWindowInteractor>::New();
  interactor->SetRenderWindow(renderWindow);

  renderWindow->Render();
  interactor->Start();

  return 0;
}

```


![](https://i-blog.csdnimg.cn/img_convert/fcdcaf0db6247466ece8c39094573981.png)



### VTK 渲染管道流程解析



#### 1. 数据源（Data Source）



在 VTK 中，多边形数据由 **`vtkPolyData`** 管理：



- **`vtkPoints`**：存放 CPU 端的顶点信息
- **`vtkCell`**：描述多边形的拓扑关系，即哪些点构成了什么多边形（例如 Demo 中的三角形）


这种设计与 OpenGL 的结构有些相似：



- `vtkPoints` ≈ **Vertex Buffer Object (VBO)**
- `vtkCell` ≈ **Element Buffer Object (EBO/IBO)**


---



### 2. 渲染调用顺序



沿着 VTK 渲染管道，主要调用链如下：



- **`vtkWindow::Render()`**


- 调用 `DoStereoRender()`
- 进一步调用窗口中的 **`vtkRenderer::Render()`**
 ![](https://i-blog.csdnimg.cn/img_convert/cb4755d0256e7dc1dcab1162beae3c34.png)
 ![](https://i-blog.csdnimg.cn/img_convert/76e37a822a523fe9778365d306f36a82.png)

- **`vtkRenderer::Render()`**


- 实际由其子类 **`vtkOpenGLRenderer`** 执行绘制
- 在更新非透明多边形时，调用 **`vtkActor::RenderOpaqueGeometry()`**
 ![](https://i-blog.csdnimg.cn/img_convert/c19134984bdf9e09462eeb0606bff5a5.png)
 ![](https://i-blog.csdnimg.cn/img_convert/0388971290de6d9217a0f976b8f6af92.png)

- **`vtkActor::RenderOpaqueGeometry()`**


- 调用其子类 **`vtkOpenGLActor::Render()`**
- 由 Actor 转而驱动 **`vtkMapper::Render()`**
 ![](https://i-blog.csdnimg.cn/img_convert/0d96edeb940c1a678188e330787487aa.png)
 ![](https://i-blog.csdnimg.cn/img_convert/f5e760faf7094336a2cf9b3a1706a010.png)

- **`vtkMapper::Render()`**


- 实际由 **`vtkOpenGLPolyDataMapper::RenderPiece()`** 实现
 ![](https://i-blog.csdnimg.cn/img_convert/832d5b332db453be88b887186b07e2c4.png)



---



#### 3. 数据到 GPU 的映射



在 `vtkOpenGLPolyDataMapper::RenderPiece()` 中，核心逻辑分为两步：



- **`RenderPieceStart()`**


- 将 `vtkPolyData` 转换为 **OpenGL 的 VBO**（顶点缓冲对象）
 ![](https://i-blog.csdnimg.cn/img_convert/794da868b18486b2b8f08ffe52347a14.png)

- **`RenderPieceDraw()`**


- 处理 **Actor 的属性**（位置、颜色等）
- 处理 **Renderer 的相机参数（`vtkCamera`）**
- 将上述信息转化为 **顶点着色器（Vertex Shader）** 和 **片段着色器（Fragment Shader）** 的输入
- 最终调用 OpenGL API 完成绘制
 ![](https://i-blog.csdnimg.cn/img_convert/3b63134a1c3ca76fb0074c48a938e07a.png)



---



## 总结



到此，我们可以完整地理解 VTK 的渲染过程。



在 VTK 中，**真正触发渲染的核心在于 `vtkMapper`**：



- **向上获取输入数据**：`vtkMapper` 会从数据源（如 `vtkPolyData`）获取几何信息，并将其转换为 GPU 可识别的 **Vertex Buffer Object (VBO)**
- **向下传递渲染设置**：`vtkMapper` 会获取 `vtkActor` 和 `vtkRenderer` 的属性（颜色、位置、相机参数等），并将这些信息转化为着色器可用的输入


在上述过程中，我们可以直接自定义 `vtkPolyData`（例如三角形）。
 对于一些常见模型，VTK 提供了封装好的几何源类，如：



- `vtkCubeSource`（立方体）
- `vtkSphereSource`（球体）
- `vtkImageSource` (图片）


这些类可以自动生成对应的 `vtkPolyData`，免去手动构建顶点和拓扑结构的步骤。



如果数据类型不仅限于多边形，VTK 还定义了其他类型的 `Mapper` 来处理不同的数据。
 此外，如果想实现自定义模型，也可以继承 **`vtkAlgorithm`**，根据自己的生成规则来构建数据源。