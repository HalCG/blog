# 字符示意图 → Mermaid 迁移清单

> 本清单由脚本扫描生成（含框线字符的文章共 225 篇）。**每改完一篇，立即把对应项勾选为 `[x]`**，任务中断后按此清单续作。
> 博文根目录：`blog/`；站点已接入 vitepress-plugin-mermaid（见 site/.vitepress/config.ts，mermaid 别名指向 mermaid.esm.min.mjs）。

## 转换规则（试点定稿，qt/01 与 cpp/10 为参考样例）

1. **图型选择**：
   - 报文/消息交互、时序过程 → `sequenceDiagram`（状态用 `Note over` 标注）
   - 步骤流程、调用链、数据流 → `flowchart TD`（纵向）或 `flowchart LR`（横向）
   - 分区/包含结构（如滑动窗口、内存区间）→ `flowchart` + `subgraph`
   - 类关系/继承 → `classDiagram`；状态机 → `stateDiagram-v2`
2. **防文字截断**（用户反馈重点）：节点内文字要短；长文字用 `<br/>` 主动分行（每行 ≤ 14 个汉字）；长解释放到图外正文或引用块，不塞进节点。
3. **中文直接用**：Mermaid 是 SVG 渲染，无对齐问题；专业术语可中英并存，如 `半连接队列 (SYN Queue)`。
4. **节点文字含 `()`、`:`、`{}` 等特殊字符时必须用双引号包裹**：`A["调用 accept()"]`。
5. **不适合 Mermaid 的图不硬转**：字节布局、内存排布、目录树、代码执行示例等保留代码块；若其中中文破坏对齐，对齐敏感区改 ASCII、中文放行尾注释。表格类字符图可改 Markdown 表格。
6. **只改示意图，不动正文**；一个文件所有图改完并自查语法后才算完成。
7. 文件里若只是表格线/分隔线而非示意图，直接勾选并在行尾注明 `（无示意图）`。

## 进度清单

### cpp（11 篇）

- [x] cpp/01-软件设计七大原则与设计模式本质.md（框线 33 行）（无示意图）
- [x] cpp/02-C++编译机制-声明与定义及头文件防重包含规则.md（框线 33 行）（无示意图）
- [x] cpp/03-CMake与VSCode项目构建体系详解.md（框线 44 行）
- [x] cpp/04-C++内存模型：指针与引用、深浅拷贝及四种类型转换详解.md（框线 41 行）（无示意图）
- [x] cpp/05-C++面向对象深剖：动态多态（RTTI）与静态成员继承.md（框线 28 行）
- [x] cpp/06-C++资源管理哲学：RAII机制、智能指针与Pimpl防火墙.md（框线 44 行）（无示意图）
- [x] cpp/07-C++11右值引用、移动语义与完美转发详解.md（框线 39 行）（无示意图）
- [x] cpp/08-C++多线程并发控制：原子量、锁与信号量详解.md（框线 58 行）（无示意图）
- [x] cpp/09-TCP-IP底层基础：网络分层模型与以太网路由寻址.md（框线 66 行）
- [x] cpp/10-TCP核心机制：三次握手、四次挥手与滑动窗口流量控制.md（框线 49 行）
- [x] cpp/11-TCP与UDP协议核心对比及I-O多路复用（select-epoll）机制.md（框线 63 行）

### qt（4 篇）

- [x] qt/01-Qt信号槽原理与多线程连接类型.md（框线 30 行）
- [x] qt/02-Qt事件循环与多线程（QThread、QEventLoop、QtConcurrent）详解.md（框线 37 行）（无示意图）
- [x] qt/03-Qt核心架构：QObject树与d_ptr、q_ptr私有实现机制.md（框线 55 行）
- [x] qt/04-Qt工程实战：中文字符编码与内存泄漏检测.md（框线 47 行）（无示意图）

### OpenGL应用（16 篇）

- [x] OpenGL应用/OpenGL 从内建变量到UBO.md（框线 82 行）
- [x] OpenGL应用/OpenGL 单缓冲区渲染导致闪烁与撕裂的技术原因及解决方案.md（框线 79 行）
- [x] OpenGL应用/OpenGL 调试方式详解.md（框线 67 行）（无示意图）
- [x] OpenGL应用/OpenGL 几何着色器（Geometry Shader）详解.md（框线 100 行）
- [x] OpenGL应用/OpenGL 离屏多重采样抗锯齿 (Off-screen MSAA) 详解.md（框线 73 行）
- [x] OpenGL应用/OpenGL 如何处理 Retina或高 DPI 显示屏下视口与窗口尺寸不一致.md（框线 50 行）（无示意图）
- [x] OpenGL应用/OpenGL 深度测试及Early-Z详解.md（框线 204 行）
- [x] OpenGL应用/OpenGL 实例化渲染：构建小行星带 (Asteroid Field).md（框线 81 行）
- [x] OpenGL应用/OpenGL 数据管理：从基础 Buffer 到 AZDO（零驱动开销）数据传输.md（框线 79 行）
- [x] OpenGL应用/OpenGL 透视投影中 w 分量的获取及使用.md（框线 78 行）
- [x] OpenGL应用/OpenGL 为什么法线矩阵定义为“模型矩阵左上角 3x3 部分的逆矩阵的转置.md（框线 72 行）
- [x] OpenGL应用/OpenGL 中 Face Culling（面剔除）的具体实现.md（框线 84 行）
- [x] OpenGL应用/OpenGL 中 Spotlight 的聚光、衰减与柔和边缘效果实现.md（框线 114 行）
- [x] OpenGL应用/OpenGL 中为什么 RBO 不能被着色器采样.md（框线 79 行）
- [x] OpenGL应用/OpenGL Framebuffer及其附件使用详解.md（框线 82 行）
- [x] OpenGL应用/OpenGL VAO（Vertex Array Object）的主要作用与状态管理.md（框线 74 行）

### OpenGlInstance（6 篇）

- [x] OpenGlInstance/OpenGL 抗锯齿（MSAA、FXAA、TAA）对比与实现.md（框线 81 行）（无示意图）
- [x] OpenGlInstance/OpenGL Forward、Deferred、Forward+ 三种渲染路径对比与实现.md（框线 143 行）
- [x] OpenGlInstance/OpenGL OIT 深度剥离（Depth Peeling）实现.md（框线 111 行）
- [x] OpenGlInstance/OpenGL OIT 随机透明（Stochastic Transparency）实现.md（框线 57 行）（无示意图）
- [x] OpenGlInstance/OpenGL OIT 之 Linked List 实现（上篇）：原理、流程与缓冲区设计.md（框线 160 行）
- [x] OpenGlInstance/OpenGL OIT 逐像素链表（Linked List）实现.md（框线 72 行）（无示意图）

### vtk-examples（49 篇）

- [x] vtk-examples/01-VTK-策略模式详解：InteractorStyle、Mapper、Picker-与可替换算法.md（框线 281 行）
- [x] vtk-examples/02-VTK-中的观察者模式与命令模式：机制、渲染链路与本质.md（框线 257 行）
- [x] vtk-examples/03-VTK-交互系统详解：vtkRenderWindowInteractor-内部流程.md（框线 205 行）
- [x] vtk-examples/04-Python-VTK-Canny-边缘检测：从数学原理到代码实现.md（框线 153 行）
- [x] vtk-examples/05-Python-VTK-Sobel-边缘检测：从数学原理到代码实现.md（框线 303 行）
- [x] vtk-examples/06-关于-vtkTransform-中-PreMultiply-与-PostMultiply-的正确理解.md（框线 28 行）（无示意图）
- [x] vtk-examples/07-vtkCenterOfMass查找点集的质心.md（框线 7 行）（无示意图）
- [x] vtk-examples/08-vtkBoarderWidget及图片坐标包含计算.md（框线 8 行）（无示意图）
- [x] vtk-examples/09-vtkSliderWidget动态调整vtkCellLocator空间单元切分level.md（框线 9 行）（无示意图）
- [x] vtk-examples/10-使用-VTK-中的单元定位器来查找最近的点.md（框线 15 行）（无示意图）
- [x] vtk-examples/11-计算结构化数据集范围内给定位置的单元格-ID.md（框线 13 行）（无示意图）
- [x] vtk-examples/12-获取对象边及边对应的顶点索引.md（框线 5 行）（无示意图）
- [x] vtk-examples/13-显示图像数据和单元格中心.md（框线 7 行）（无示意图）
- [x] vtk-examples/14-从-polydata-中获取数组-及-vtkDoubleArray、vtkIntArray互转.md（框线 7 行）（无示意图）
- [x] vtk-examples/15-vtkCardinalSpline类进行基本的插值操作.md（框线 10 行）（无示意图）
- [x] vtk-examples/16-锚定3D空间对象位置并标注.md（框线 7 行）（无示意图）
- [x] vtk-examples/17-在图像上添加标记和数字.md（框线 10 行）（无示意图）
- [x] vtk-examples/18-二维曲线旋转形成三维曲面.md（框线 9 行）（无示意图）
- [x] vtk-examples/19-对多面体数据进行裁剪和加盖的功能.md（框线 27 行）（无示意图）
- [x] vtk-examples/20-Canny边缘检测.md（框线 7 行）（无示意图）
- [x] vtk-examples/21-模拟被观察物体的位置和方向.md（框线 5 行）（无示意图）
- [x] vtk-examples/22-vtk创建颜色属性正方体.md（框线 14 行）（无示意图）
- [x] vtk-examples/23-折线的可视化及不规则柱体的绘制.md（框线 12 行）（无示意图）
- [x] vtk-examples/24-计算两个球体(vtkActor)的交集.md（框线 6 行）（无示意图）
- [x] vtk-examples/25-vtkActor添加鼠标悬浮显示提示_tip功能_vtkBalloonWidget.md（框线 5 行）（无示意图）
- [x] vtk-examples/26-创建一个带有背景图层和前景图层的渲染窗口.md（框线 10 行）（无示意图）
- [x] vtk-examples/27-背面剔除_BackfaceCullingOn.md（框线 9 行）（无示意图）
- [x] vtk-examples/28-VTK-读取、预处理、处理和可视化医学图像数据的过程.md（框线 30 行）（无示意图）
- [x] vtk-examples/29-添加自定义信息_vtkInformation.md（框线 8 行）（无示意图）
- [x] vtk-examples/30-通过预定义颜色查找表上色_vtkLookupTable_vtkColorTransferFunction.md（框线 22 行）（无示意图）
- [x] vtk-examples/31-多actor实体组合并统一应用变换_vtkAssembly.md（框线 13 行）（无示意图）
- [x] vtk-examples/32-vtk数组操作.md（框线 9 行）（无示意图，+---+ 为 table->Dump() 程序输出，保留代码块）
- [x] vtk-examples/33-polydata标量数学运算_vtkArrayCalculator.md（框线 14 行）（无示意图）
- [x] vtk-examples/34-鼠标点击位置获取几何体对象_vtkAreaPicker_vtkInteractorStyleRubberBandPick.md（框线 17 行）（无示意图）
- [x] vtk-examples/35-三维控件中定位一个点_vtkPointWidget.md（框线 34 行）（无示意图）
- [x] vtk-examples/36-vtk数据集的整合与附加_vtkAppendFilter.md（框线 7 行）（无示意图）
- [x] vtk-examples/37-场景中的解剖学方向标记_vtkAnnotatedCubeActor.md（框线 39 行）（无示意图）
- [x] vtk-examples/38-自定义vtkActor动画场景及事件_vtkAnimationScene.md（框线 8 行）（无示意图）
- [x] vtk-examples/39-点信息标注_BillboardTextActor3D.md（框线 4 行）（无示意图）
- [x] vtk-examples/40-vtk夹角计算控件.md（框线 9 行）（无示意图）
- [x] vtk-examples/41-数据源、映射器的复用.md（框线 17 行）（无示意图）
- [x] vtk-examples/42-3D可视化字母出现频率_vtkLinearExtrusionFilter.md（框线 39 行）（无示意图）
- [x] vtk-examples/43-vtk粗配准及其变换.md（框线 16 行）（无示意图）
- [x] vtk-examples/44-手动仿射变换.md（框线 25 行）（无示意图）
- [x] vtk-examples/45-如何优雅的打印多维数组vtkDenseArray.md（框线 8 行）（无示意图，+---+ 为 Dump() 程序输出，保留代码块）
- [x] vtk-examples/46-添加多个单元对象.md（框线 9 行）（无示意图）
- [x] vtk-examples/47-3D数据过滤为2D数据集并渲染.md（框线 19 行）（无示意图，正文箭头流程为行内文字，未硬转）
- [x] vtk-examples/48-vtk多维数组.md（框线 6 行）（无示意图）
- [x] vtk-examples/49-识别鼠标选中actor_vtkInteractorStyleTrackballActor.md（框线 12 行）（无示意图，破损表格线已修复为 Markdown 表格）

### vtk-source（11 篇）

- [x] vtk-source/01-vtkOpenGLRenderer-详细解析.md（框线 326 行）
- [x] vtk-source/02-vtkOpenGLCamera源码详解.md（框线 58 行）
- [x] vtk-source/03-vtkOpenGLProperty-详细解析.md（框线 241 行）
- [x] vtk-source/04-ScopedValue-泛型模板类和-ScopedglDepthMask的-RAII-实现.md（框线 154 行）
- [x] vtk-source/05-vtkOpenGLActor详解.md（框线 217 行）
- [x] vtk-source/06-vtkTransform、vtkMatrix4x4、vtkTransformPolyDataFilter、vtkActor.md（框线 95 行）（无示意图）
- [x] vtk-source/07-深入理解-vtkPolyDataNormals.md（框线 53 行）（无示意图）
- [x] vtk-source/08-vtkPolyData-详解.md（框线 51 行）（无示意图）
- [x] vtk-source/09-VTK管线中Modified()-和Update()的底层逻辑解析.md（框线 51 行）（无示意图）
- [x] vtk-source/10-VTK-与-OpenGL-渲染机制浅析.md（框线 86 行）（无示意图）
- [x] vtk-source/11-vtkSmartPointer机制解析.md（框线 118 行）（无示意图）

### vtk-python（3 篇）

- [x] vtk-python/Python VTK Canny 边缘检测：从数学原理到代码实现/canny_vtk_blog.md（框线 112 行）（无示意图，已含 mermaid）
- [x] vtk-python/Python VTK Sobel 边缘检测：从数学原理到代码实现/sobel_vtk_blog.md（框线 122 行）
- [x] vtk-python/VTK 交互系统详解：vtkRenderWindowInteractor 内部流程/vtk_interactor_blog.md（框线 204 行）

### pattern（53 篇）

- [x] pattern/ljz-design-patterns/01-intro.md（框线 39 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/02-oop-principles.md（框线 47 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/03-template-method.md（框线 28 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/04-strategy.md（框线 28 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/05-observer.md（框线 26 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/06-decorator.md（框线 25 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/07-bridge.md（框线 26 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/08-factory-method.md（框线 25 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/09-abstract-factory.md（框线 24 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/10-prototype.md（框线 25 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/11-builder.md（框线 28 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/12-singleton.md（框线 26 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/13-flyweight.md（框线 27 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/14-facade.md（框线 24 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/15-proxy.md（框线 26 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/16-adapter.md（框线 26 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/17-mediator.md（框线 24 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/18-state.md（框线 25 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/19-memento.md（框线 25 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/20-composite.md（框线 23 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/21-iterator.md（框线 23 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/22-chain-of-responsibility.md（框线 23 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/23-command.md（框线 27 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/24-visitor.md（框线 24 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/25-interpreter.md（框线 25 行）（已为 mermaid，无框线残留）
- [x] pattern/ljz-design-patterns/26-summary.md（框线 61 行）（已为 mermaid，补充节点引号修复）
- [x] pattern/ljz-design-patterns/code/README.md（框线 10 行）（无示意图）
- [x] pattern/ljz-design-patterns/README.md（框线 50 行）（无示意图）
- [x] pattern/qt/01-observer-signals-slots.md（框线 63 行）
- [x] pattern/qt/02-composite-qobject-tree.md（框线 50 行）
- [x] pattern/qt/03-command-undo-action.md（框线 46 行）
- [x] pattern/qt/04-strategy.md（框线 36 行）（无示意图）
- [x] pattern/qt/05-template-method.md（框线 42 行）
- [x] pattern/qt/06-factory.md（框线 35 行）（无示意图）
- [x] pattern/qt/07-singleton.md（框线 42 行）（无示意图）
- [x] pattern/qt/08-proxy.md（框线 34 行）（无示意图）
- [x] pattern/qt/09-flyweight.md（框线 42 行）（无示意图）
- [x] pattern/qt/10-mediator.md（框线 41 行）
- [x] pattern/qt/11-mvc-model-view.md（框线 35 行）（无示意图）
- [x] pattern/README.md（框线 47 行）（无示意图）
- [x] pattern/software-design-principles-and-patterns.md（框线 199 行）
- [x] pattern/vtk-observer-and-command-pattern.md（框线 278 行）（已为 mermaid）
- [x] pattern/vtk/01-observer.md（框线 47 行）
- [x] pattern/vtk/02-command.md（框线 65 行）
- [x] pattern/vtk/03-pipeline-filter.md（框线 40 行）
- [x] pattern/vtk/04-iterator.md（框线 32 行）（无示意图）
- [x] pattern/vtk/05-strategy-detail.md（框线 283 行）
- [x] pattern/vtk/05-strategy.md（框线 42 行）（无示意图）
- [x] pattern/vtk/06-decorator.md（框线 36 行）（无示意图）
- [x] pattern/vtk/07-factory.md（框线 40 行）
- [x] pattern/vtk/08-prototype.md（框线 35 行）（无示意图）
- [x] pattern/vtk/09-composite.md（框线 40 行）
- [x] pattern/vtk/10-chain-of-responsibility.md（框线 41 行）（无示意图）

### point-cloud（25 篇）

- [x] point-cloud/01-introduction.md（框线 120 行）（已转为 Markdown 表格，保留知识图谱大纲和数据格式示意）
- [x] point-cloud/02-environment-setup.md（框线 57 行）（已转为 Markdown 表格）
- [x] point-cloud/03-pca-mathematics.md（框线 113 行）（已转为 Mermaid，保留几何投影和对比框）
- [x] point-cloud/04-kernel-pca.md（框线 120 行）（已将核映射转为 Mermaid，保留去噪对比）
- [x] point-cloud/05-pca-normal-estimation.md（框线 91 行）（无示意图）
- [x] point-cloud/06-pca-filtering.md（框线 102 行）（无示意图）
- [x] point-cloud/07-binary-search-tree.md（框线 170 行）（保留树结构示意图）
- [x] point-cloud/08-kd-tree.md（框线 140 行）（已转为 Markdown 表格，保留树/空间划分图）
- [x] point-cloud/09-octree.md（框线 143 行）（已转为 Mermaid，保留体素细分图）
- [x] point-cloud/10-clustering-intro.md（框线 129 行）（已将家族树转为 Markdown 表格，决策树转为 Mermaid）
- [x] point-cloud/11-kmeans-clustering.md（框线 165 行）（已将 Lloyd 迭代转为 Mermaid，保留质心分布和失效示意图）
- [x] point-cloud/12-gmm-clustering.md（框线 128 行）（已将 EM 迭代转为 Mermaid，保留协方差示意图和汽车对比）
- [x] point-cloud/13-em-algorithm.md（框线 115 行）（已将 EM 框架转为 Mermaid，保留 ELBO 曲线图）
- [x] point-cloud/14-spectral-clustering.md（框线 122 行）（已将谱聚类流程转为 Mermaid，保留同心环和 Fiedler 向量示意图）
- [x] point-cloud/15-meanshift-dbscan.md（框线 140 行）（已将 MeanShift 和 DBSCAN 流程转为 Mermaid，保留点分类和漂移轨迹）
- [x] point-cloud/16-least-squares-fitting.md（框线 78 行）（保留几何投影代码块）
- [x] point-cloud/17-hough-transform.md（框线 126 行）（已将 2D 霍夫流程转为 Mermaid，保留极坐标和对偶示意图）
- [x] point-cloud/18-ransac-fitting.md（框线 119 行）（已将 RANSAC 流程转为 Mermaid，保留 LS 对比示意图）
- [x] point-cloud/19-keypoints-intro.md（框线 72 行）（无示意图）
- [x] point-cloud/20-iss-keypoints.md（框线 108 行）（已将 ISS 算法流程转为 Mermaid 且修复阈值 typo，保留对比示意图）
- [x] point-cloud/21-pfh-fpfh-descriptors.md（框线 88 行）（无示意图，保留 Darboux 坐标系和邻域关系图）
- [x] point-cloud/22-shot-descriptors.md（框线 101 行）（无示意图，保留球面分区和 LRF 符号消歧图）
- [x] point-cloud/23-icp-registration.md（框线 98 行）（已将 ICP 算法流程转为 Mermaid，保留误差定义对比图）
- [x] point-cloud/24-ndt-registration.md（框线 83 行）（无示意图，保留体素化高斯拟合及走廊对比图）
- [x] point-cloud/25-ransac-registration.md（框线 138 行）（已将配准架构、RANSAC 粗配准和技术全景图转为 Mermaid，保留三角形匹配）

### point-cloud-applied（6 篇）

- [x] point-cloud-applied/01-基础与三维空间索引.md（框线 64 行）（保留八等分卦限空间网格图）
- [x] point-cloud-applied/02-特征提取：PCA与法向量估计.md（框线 50 行）（无示意图）
- [x] point-cloud-applied/03-点云分割与聚类实战.md（框线 40 行）（无示意图）
- [x] point-cloud-applied/04-几何拟合与模型检测.md（框线 39 行）（无示意图）
- [x] point-cloud-applied/05-特征点检测与局部特征描述子.md（框线 36 行）（无示意图）
- [x] point-cloud-applied/06-点云配准与对齐实战.md（框线 60 行）（已将粗/精配准管线图转为 Mermaid）

### books（38 篇）

- [x] books/pragmatic-programmer/00-overview.md（框线 82 行）（已为 Mermaid）
- [x] books/pragmatic-programmer/01-chapter-philosophy.md（框线 30 行）（无示意图）
- [x] books/pragmatic-programmer/02-chapter-approach.md（框线 31 行）（无示意图）
- [x] books/pragmatic-programmer/03-chapter-tools.md（框线 28 行）（无示意图）
- [x] books/pragmatic-programmer/04-chapter-paranoia.md（框线 27 行）（无示意图）
- [x] books/pragmatic-programmer/05-chapter-bend.md（框线 29 行）（无示意图）
- [x] books/pragmatic-programmer/06-chapter-concurrency.md（框线 26 行）（无示意图）
- [x] books/pragmatic-programmer/07-chapter-coding.md（框线 29 行）（无示意图）
- [x] books/pragmatic-programmer/08-chapter-before-project.md（框线 26 行）（无示意图）
- [x] books/pragmatic-programmer/09-chapter-projects.md（框线 28 行）（无示意图）
- [x] books/pragmatic-programmer/book-summary-reflection.md（框线 90 行）（已为 Mermaid）
- [x] books/pragmatic-programmer/README.md（框线 11 行）（无示意图）
- [x] books/README.md（框线 27 行）（已为 Mermaid）
- [x] books/software-design-philosophy/00-overview.md（框线 79 行）（已为 Mermaid）
- [x] books/software-design-philosophy/01-chapter-introduction.md（框线 24 行）（无示意图）
- [x] books/software-design-philosophy/02-chapter-complexity.md（框线 25 行）（无示意图）
- [x] books/software-design-philosophy/03-chapter-strategic.md（框线 25 行）（无示意图）
- [x] books/software-design-philosophy/04-chapter-deep-modules.md（框线 23 行）（无示意图）
- [x] books/software-design-philosophy/05-chapter-information-hiding.md（框线 24 行）（无示意图）
- [x] books/software-design-philosophy/06-chapter-general-purpose.md（框线 25 行）（无示意图）
- [x] books/software-design-philosophy/07-chapter-layers.md（框线 24 行）（无示意图）
- [x] books/software-design-philosophy/08-chapter-pull-complexity.md（框线 26 行）（无示意图）
- [x] books/software-design-philosophy/09-chapter-together-apart.md（框线 24 行）（无示意图）
- [x] books/software-design-philosophy/10-chapter-define-errors.md（框线 25 行）（无示意图）
- [x] books/software-design-philosophy/11-chapter-design-twice.md（框线 26 行）（无示意图）
- [x] books/software-design-philosophy/12-chapter-why-comments.md（框线 29 行）（无示意图）
- [x] books/software-design-philosophy/13-chapter-comment-content.md（框线 29 行）（无示意图）
- [x] books/software-design-philosophy/14-chapter-naming.md（框线 33 行）（无示意图）
- [x] books/software-design-philosophy/15-chapter-comments-first.md（框线 28 行）（无示意图）
- [x] books/software-design-philosophy/16-chapter-modifying-code.md（框线 30 行）（无示意图）
- [x] books/software-design-philosophy/17-chapter-consistency.md（框线 30 行）（无示意图）
- [x] books/software-design-philosophy/18-chapter-obvious.md（框线 30 行）（无示意图）
- [x] books/software-design-philosophy/19-chapter-trends.md（框线 31 行）（无示意图）
- [x] books/software-design-philosophy/20-chapter-performance.md（框线 31 行）（无示意图）
- [x] books/software-design-philosophy/21-chapter-what-matters.md（框线 30 行）（无示意图）
- [x] books/software-design-philosophy/22-chapter-conclusion.md（框线 29 行）（无示意图）
- [x] books/software-design-philosophy/book-summary-reflection.md（框线 99 行）（已为 Mermaid）
- [x] books/software-design-philosophy/README.md（框线 20 行）（无示意图）

### (根目录)（3 篇）

- [x] glmdeterminant.md（框线 15 行）（无示意图）
- [x] index.md（框线 33 行）（无示意图）
- [x] vercel-deployment.md（框线 36 行）（已将发布流程图转为 Mermaid，保留 Vercel UI 示意图）

