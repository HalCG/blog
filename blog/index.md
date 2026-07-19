# <svg style="overflow: visible;" class="inline-icon welcome-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg> 欢迎来到 Leo 的个人空间

你好！我是 Leo。很高兴你能逛到我的个人小站。

这里是我记录思考、技术实践和日常生活碎片的地方。技术是工作，生活是自己。所以这个空间不仅有严谨的**图形学代码、C++/Qt底层原理与数学公式**，未来还会逐渐分享关于**个人健康、运动健身、日常生活感悟**等随笔。希望这是一个轻松、真实且有温度的位置。

## <svg style="overflow: visible;" class="inline-icon section-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg> 本站内容分类与指引

您可以通过**左侧的导航侧边栏**随时翻阅所有的主题。目前这里主要沉淀了以下内容：

### <svg style="overflow: visible;" class="inline-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg> C++ 核心与网络开发
聚焦 C++ 语言底层机制、高并发并发控制以及网络底层原理：
*   **语言与编译特性**：包括 [C++ 声明与定义编译机制](/cpp/02-C++编译机制-声明与定义及头文件防重包含规则)、[C++ 指针与引用内存模型及四种转型](/cpp/04-C++内存模型：指针与引用、深浅拷贝及四种类型转换详解)、[C++11 右值引用与移动语义](/cpp/07-C++11右值引用、移动语义与完美转发详解)。
*   **并发控制**：包括 [C++ 多线程并发控制：原子量、锁与信号量](/cpp/08-C++多线程并发控制：原子量、锁与信号量详解)。
*   **网络底层原理**：包括 [网络分层与以太网路由寻址](/cpp/09-TCP-IP底层基础：网络分层模型与以太网路由寻址)、[TCP 三次握手/四次挥手及滑动窗口流量控制](/cpp/10-TCP核心机制：三次握手、四次挥手与滑动窗口流量控制)、[I/O 多路复用 (select/epoll) 机制对比](/cpp/11-TCP与UDP协议核心对比及I-O多路复用（select-epoll）机制)。

### <svg style="overflow: visible;" class="inline-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg> Qt 系统开发与工程实战
深入剖析 Qt 核心框架设计精髓与大型项目实战解决方案：
*   **核心机制**：[Qt 信号槽底层原理与多线程连接类型](/qt/01-Qt信号槽原理与多线程连接类型)、[QObject 对象树机制与 d_ptr/q_ptr 隐藏实现模式](/qt/03-Qt核心架构：QObject树与d_ptr、q_ptr私有实现机制)。
*   **多线程与事件**：[Qt 事件循环与多线程（QThread、QEventLoop、QtConcurrent）详解](/qt/02-Qt事件循环与多线程（QThread、QEventLoop、QtConcurrent）详解)。
*   **工程实战**：[中文字符编码与内存泄漏检测实战](/qt/04-Qt工程实战：中文字符编码与内存泄漏检测)。

### <svg style="overflow: visible;" class="inline-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> 计算机图形学与三维可视化 (OpenGL/VTK)
深耕底层三维渲染管线与科学可视化应用：
*   **现代 OpenGL 渲染**：包括 [Early-Z 深度测试与Early-Z 优化](/OpenGL应用/OpenGL%20深度测试及Early-Z详解)、[实例化渲染小行星带](/OpenGL应用/OpenGL%20实例化渲染：构建小行星带%20(Asteroid%20Field))、[离屏多重采样抗锯齿 (MSAA) 详解](/OpenGL应用/OpenGL%20离屏多重采样抗锯齿%20(Off-screen%20MSAA)%20详解)。
*   **VTK 科学可视化**：包括 [VTK 观察者与命令模式](/pattern/vtk-observer-and-command-pattern)、[复用数据源与映射器实战](/vtk-examples/41-数据源、映射器的复用)、[Canny](/vtk-examples/04-Python-VTK-Canny-边缘检测：从数学原理到代码实现) 与 [Sobel 边缘检测](/vtk-examples/05-Python-VTK-Sobel-边缘检测：从数学原理到代码实现) 图像滤波。
*   **VTK 源码机制**：包括 [ScopedValue 的 RAII 状态恢复模式](/vtk-source/04-ScopedValue-泛型模板类和-ScopedglDepthMask的-RAII-实现) 以及 [vtkSmartPointer 智能指针引用计数机制](/vtk-source/11-vtkSmartPointer机制解析)。

### <svg style="overflow: visible;" class="inline-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path></svg> 三维点云处理 (PCL/Open3D)
从数学几何基础出发，涵盖算法理论推导与工程应用代码：
*   **点云算法理论**：包含 [KD-Tree 与八叉树空间索引原理](/point-cloud/08-kd-tree)、[K-Means 与高斯混合模型聚类](/point-cloud/11-kmeans-clustering)、[最小二乘与 RANSAC 拟合几何估计](/point-cloud/16-least-squares-fitting)。
*   **点云工程实战**：包含 [PCA 法向量估计](/point-cloud-applied/02-特征提取：PCA与法向量估计)、[点云分割与聚类实战](/point-cloud-applied/03-点云分割与聚类实战)、[ICP 与 NDT 点云配准对齐实战](/point-cloud-applied/06-点云配准与对齐实战)。

### <svg style="overflow: visible;" class="inline-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> 读书笔记与软件设计哲学
精读计算机经典著作，沉淀软件开发手艺人的道与术：
*   **经典模式演进**：整理了 GoF 经典 23 种设计模式的 C++ / Qt 还原实现。可以从 [设计模式导言](/pattern/ljz-design-patterns/01-intro) 开始阅读。
*   **优秀书籍精读**：包括 [《程序员修炼之道》手艺人修炼笔记](/books/pragmatic-programmer/00-overview) 以及 [《软件设计哲学》工程解耦理念](/books/software-design-philosophy/00-overview)。

## <svg style="overflow: visible;" class="inline-icon section-icon" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg> 便捷小工具

*   **快捷搜索**：在键盘上敲击 <kbd>Ctrl</kbd> + <kbd>K</kbd>（Mac 上为 <kbd>Cmd</kbd> + <kbd>K</kbd>），可以呼出全文搜索框，输入任何关键字（如：`Early-Z` 或 `信号`）即可秒级直达相关内容。
*   **主题切换**：本站右上角有太阳/月亮图标，支持一键在“浅色模式 / 深色模式”之间切换，提供最舒适的阅读光线。
*   **公式与代码**：文章内的数学公式已使用 LaTeX 进行离线矢量渲染，代码段支持一键复制，让阅读体验更纯粹。

感谢你的阅读！不妨点开**左侧导航栏**的某个章节，随意看点什么吧。如果你有什么想法或建议，也欢迎随时交流。

<style>
/* 矢量图标样式微调 */
.inline-icon {
  display: inline-block;
  color: var(--vp-c-brand-1); /* 使用系统的主题色 */
  vertical-align: middle;
  margin-right: 8px;
  transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* 根据标题层级自动调整图标大小与对齐 */
h1 .welcome-icon {
  width: 32px;
  height: 32px;
  vertical-align: -6px;
  color: var(--vp-c-brand-1);
}

h2 .section-icon {
  width: 26px;
  height: 26px;
  vertical-align: -4px;
}

h3 .inline-icon {
  width: 20px;
  height: 20px;
  vertical-align: -3px;
}

/* 悬停动效：标题被悬停时，前面的 SVG 图标会产生缩放和微调 */
h1:hover .welcome-icon,
h2:hover .section-icon,
h3:hover .inline-icon {
  transform: scale(1.18) rotate(3deg);
}
</style>
