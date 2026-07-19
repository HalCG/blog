# Qt / VTK 设计模式博文系列

> 基于 Qt 6 与 VTK 官方 API / Kitware 源码撰写，每篇独立讲解一种设计模式。  
> 更新日期：2026-07-19 · 共 **23 篇**（Qt 12 + VTK 11）

---

## 通识导读（建议先读）

| 文章 | 说明 |
|------|------|
| [**软件设计原则与模式本质总览**](software-design-principles-and-patterns.md) | SOLID、DRY、深模块原则全景，设计模式本质，变化点管理与重构坏味道 |
| [设计模式的思考](design-patterns-reflections.md) | 学习路径、误用与过度设计、易混辨析、工程实践长文 |

### 书籍笔记

| 书 | 说明 |
|----|------|
| [书籍总索引](books/README.md) | 两本书对照与阅读顺序 |
| [程序员修炼之道 · 全书思考](books/pragmatic-programmer/00-overview.md) | 务实哲学、DRY、工具与过程（9 章分章） |
| [程序员修炼之道 · 读后感](books/pragmatic-programmer/book-summary-reflection.md) | 整书浓缩 + 知识点表 + 读后感 |
| [软件设计的哲学 · 全书思考](books/software-design-philosophy/00-overview.md) | 复杂度、深模块、战略编程（22 章分章） |
| [软件设计的哲学 · 读后感](books/software-design-philosophy/book-summary-reflection.md) | 整书浓缩 + 原则/红旗 + 读后感 |

GoF 系统课见姊妹系列：[ljz-design-patterns/](../ljz-design-patterns/README.md)

---

## 系列导读

Qt 与 VTK 都是「框架内置设计模式」的典型代表。本系列将 GoF 经典模式与框架真实 API 对应起来，每篇包含：

**引子 → 痛点 → GoF 结构 → 框架落点 → 底层机制 → 代码示例 → 易混淆点 → 最佳实践 → 重点与注意 → 延伸阅读**

每篇文末 **「重点与注意」** 用 blockquote 标出高频考点与易错点（不写面试题形式，便于速记复习）。

### VTK 事件系统进阶（推荐阅读）

Observer 与 Command 在 VTK 中高度融合，深度剖析见：

**[vtk/01-observer-command-detail.md](vtk/01-observer-command-detail.md)**

入门可先读 [vtk/01-observer.md](vtk/01-observer.md) 与 [vtk/02-command.md](vtk/02-command.md)，再读进阶专题。

---

## 推荐阅读顺序

### 零基础路径（6 篇）

1. [Qt 观察者：信号与槽](qt/01-observer-signals-slots.md)
2. [Qt 组合：QObject 树](qt/02-composite-qobject-tree.md)
3. [Qt 命令：撤销栈与 QAction](qt/03-command-undo-action.md)
4. [VTK 观察者](vtk/01-observer.md)
5. [VTK vtkCommand（事件回调）](vtk/02-command.md)
6. [VTK 管道](vtk/03-pipeline-filter.md)

### 按主题交叉阅读

| 主题 | Qt | VTK |
|------|----|-----|
| 通知机制 | [01 观察者](qt/01-observer-signals-slots.md) | [01 观察者](vtk/01-observer.md) |
| 行为封装 / 回调 | [03 命令](qt/03-command-undo-action.md)（GoF 撤销） | [02 vtkCommand](vtk/02-command.md)（Observer 回调体） |
| 结构组织 | [02 组合](qt/02-composite-qobject-tree.md) | [09 组合](vtk/09-composite.md) |
| 可替换算法 | [04 策略](qt/04-strategy.md) | [05 策略](vtk/05-strategy.md) |
| 对象创建 | [06 工厂](qt/06-factory.md) | [07 工厂](vtk/07-factory.md) |
| 内存与垃圾回收 | [09 享元](qt/09-flyweight.md)(COW) | [11 引用计数与 RAII](vtk/11-reference-counting-raii.md) |
| 接口隔离与二进制兼容 | [12 Pimpl/d-指针](qt/12-d-pointer-pimpl.md) | — |
| 数据流 | — | [03 管道](vtk/03-pipeline-filter.md) |
| UI 架构 | [11 MVC](qt/11-mvc-model-view.md) | ParaView 自建层 |

---

## Qt 完整目录（12 篇）

| # | 模式 | 文章 |
|---|------|------|
| 01 | 观察者 | [qt/01-observer-signals-slots.md](qt/01-observer-signals-slots.md) |
| 02 | 组合 | [qt/02-composite-qobject-tree.md](qt/02-composite-qobject-tree.md) |
| 03 | 命令 | [qt/03-command-undo-action.md](qt/03-command-undo-action.md) |
| 04 | 策略 | [qt/04-strategy.md](qt/04-strategy.md) |
| 05 | 模板方法 | [qt/05-template-method.md](qt/05-template-method.md) |
| 06 | 工厂 | [qt/06-factory.md](qt/06-factory.md) |
| 07 | 单例 | [qt/07-singleton.md](qt/07-singleton.md) |
| 08 | 代理 | [qt/08-proxy.md](qt/08-proxy.md) |
| 09 | 享元 | [qt/09-flyweight.md](qt/09-flyweight.md) |
| 10 | 中介者 | [qt/10-mediator.md](qt/10-mediator.md) |
| 11 | MVC/MV | [qt/11-mvc-model-view.md](qt/11-mvc-model-view.md) |
| 12 | Pimpl/d-指针 | [qt/12-d-pointer-pimpl.md](qt/12-d-pointer-pimpl.md) |

## VTK 完整目录（11 篇）

| # | 模式 | 文章 |
|---|------|------|
| 01 | 观察者 | [vtk/01-observer.md](vtk/01-observer.md) |
| 02 | vtkCommand（事件回调） | [vtk/02-command.md](vtk/02-command.md) |
| 03 | 管道/过滤器 | [vtk/03-pipeline-filter.md](vtk/03-pipeline-filter.md) |
| 04 | 迭代器 | [vtk/04-iterator.md](vtk/04-iterator.md) |
| 05 | 策略 | [vtk/05-strategy.md](vtk/05-strategy.md) · [详解](vtk/05-strategy-detail.md) |
| 06 | 装饰 | [vtk/06-decorator.md](vtk/06-decorator.md) |
| 07 | 工厂 | [vtk/07-factory.md](vtk/07-factory.md) |
| 08 | 原型 | [vtk/08-prototype.md](vtk/08-prototype.md) |
| 09 | 组合 | [vtk/09-composite.md](vtk/09-composite.md) |
| 10 | 责任链 | [vtk/10-chain-of-responsibility.md](vtk/10-chain-of-responsibility.md) |
| 11 | 引用计数与 RAII | [vtk/11-reference-counting-raii.md](vtk/11-reference-counting-raii.md) |

---

## Qt vs VTK 模式对照表

| 模式 | Qt 典型落点 | VTK 典型落点 |
|------|-------------|--------------|
| 观察者 | `connect` 信号槽 | `AddObserver` / `InvokeEvent` |
| 命令 / 回调 | `QUndoCommand`、`QAction`（GoF） | `vtkCommand::Execute`（事件回调，非撤销栈） |
| 组合 | `QObject` 父子树 | `vtkAssembly` / `vtkProp` |
| 策略 | `QStyle`、`QIODevice`、`QAbstractItemModel` | `vtkInteractorStyle`、`vtkMapper` |
| 模板方法 | `QThread::run()`、`paintEvent` | `vtkAlgorithm::RequestData`（骨架固定） |
| 工厂 | `QStyleFactory`、插件 | `vtkObjectFactory`、`::New()` |
| 单例 | `QApplication::instance()` | 较少，多用 `New()` 单实例 |
| 代理 | `QSortFilterProxyModel` | 较少，Filter 包装 |
| 享元 | 隐式共享、`QIcon` 缓存 | 数组共享、`ShallowCopy` |
| 中介者 | 事件循环、`eventFilter` | Interactor 事件分发 |
| MVC | Model/View 框架 | ParaView Representation 层 |
| 管道 | （较少） | `vtkAlgorithm` Pipeline |
| 责任链 | `eventFilter` 链 | `AbortFlag` + priority |
| 原型 | 隐式共享 + `clone` 语义弱 | `DeepCopy` / `ShallowCopy` |
| 装饰 | `QStyle` 代理绘制 | `vtkLODActor` |
| 迭代器 | `Java-style` 容器迭代器 | `vtkCollection`、`vtkCellIterator` |

---

## 易混淆概念速查

| 名称 | Qt | VTK |
|------|----|-----|
| Command | `QUndoCommand`（GoF 撤销） | `vtkCommand`（Observer 事件回调，名字易混） |
| 观察者 | 信号槽 | `AddObserver` |
| 工厂 | `QStyleFactory` | `vtkObjectFactory` |

---

## 其他博文

- [**软件设计原则与模式本质总览**](software-design-principles-and-patterns.md)
- [书籍笔记：程序员修炼之道 & 软件设计的哲学](books/README.md)
- [设计模式的思考：学习、误用与工程实践](design-patterns-reflections.md)
- [VTK 观察者+命令深度专题](vtk/01-observer-command-detail.md)
- [VTK 策略模式详解](vtk/05-strategy-detail.md)（InteractorStyle / Mapper / Picker）
- [VTK 交互系统：vtkRenderWindowInteractor](../VTK%20交互系统详解：vtkRenderWindowInteractor%20内部流程/vtk_interactor_blog.md)
- [Python VTK Sobel 边缘检测](../Python%20VTK%20Sobel%20边缘检测：从数学原理到代码实现/sobel_vtk_blog.md)
- [Python VTK Canny 边缘检测](../Python%20VTK%20Canny%20边缘检测：从数学原理到代码实现/canny_vtk_blog.md)

---

## 官方参考

- [Qt Documentation](https://doc.qt.io/qt-6/)
- [VTK Documentation](https://docs.vtk.org/)
- [VTK GitHub](https://github.com/Kitware/VTK)
- [ParaView GitHub](https://github.com/Kitware/ParaView)
