# VTK 设计模式：管道与过滤器（Pipeline / Filter）

> 系列：[Qt / VTK 设计模式](../README.md) · VTK 03/10  
> 参考：[vtkAlgorithm](https://vtk.org/doc/nightly/html/classvtkAlgorithm.html)、[VTK Pipeline Guide](https://docs.vtk.org/en/latest/guides/pipeline.html)

---

## 引子

读取 STL → 平滑 → 降采样 → 映射显示，在 VTK 里不是写四个函数顺序调用，而是把四个 **Algorithm** 插成一条管道，最后 `Update()` 一次，数据自下而上流动。这是 VTK 最核心的架构模式。

---

## 要解决什么问题

命令式串联：

```cpp
auto mesh = readStl(path);
smooth(mesh);
decimate(mesh);
show(mesh);
```

痛点：中间结果难缓存、并行难调度、无法按需计算、模块难复用。

---

## 模式本质

VTK Pipeline 更接近 **Pipe and Filter** 架构，而非 GoF 的 Command：

```
[Source] → [Filter] → [Filter] → [Mapper] → [Actor]
```

| 概念 | 说明 |
|------|------|
| 端口 | `GetOutputPort()` / `SetInputConnection()` |
| 拉取 | 下游 `Update()` 驱动上游执行 |
| 元数据 | `vtkInformation` 描述数据类型与需求 |

---

## VTK 中的落点

### vtkAlgorithm 子类

- **Source**：无输入（`vtkSphereSource`）
- **Filter**：有输入输出（`vtkSmoothPolyDataFilter`）
- **Mapper**：几何 → 图形原语（`vtkPolyDataMapper`）

### 连接方式（现代 API）

```cpp
filter->SetInputConnection(reader->GetOutputPort());
mapper->SetInputConnection(filter->GetOutputPort());
```

### Update 链

```cpp
mapper->Update();  // 触发整条依赖链的 RequestData
```

---

## 底层逻辑

### 执行四请求（概念）

`vtkAlgorithm` 内部管线（简化）：

1. `REQUEST_INFORMATION`
2. `REQUEST_UPDATE_EXTENT`
3. `REQUEST_DATA`
4. 实际 `RequestData()` 子类实现

**拉取式**：只有末端 `Update()` 才真正计算；中间节点可因 `MTime` 缓存跳过。

### 与事件系统的关系

滤波执行时：

```cpp
this->InvokeEvent(vtkCommand::StartEvent, nullptr);
// ... RequestData ...
this->InvokeEvent(vtkCommand::ProgressEvent, &progress);
this->InvokeEvent(vtkCommand::EndEvent, nullptr);
```

Pipeline 负责 **数据流**；Observer/Command 负责 **进度与钩子**——二者互补。

---

## 代码示例

### 最小管道

```cpp
#include <vtkSTLReader.h>
#include <vtkSmoothPolyDataFilter.h>
#include <vtkPolyDataMapper.h>
#include <vtkActor.h>
#include <vtkRenderer.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>

vtkNew<vtkSTLReader> reader;
reader->SetFileName("model.stl");

vtkNew<vtkSmoothPolyDataFilter> smooth;
smooth->SetInputConnection(reader->GetOutputPort());
smooth->SetNumberOfIterations(20);

vtkNew<vtkPolyDataMapper> mapper;
mapper->SetInputConnection(smooth->GetOutputPort());

vtkNew<vtkActor> actor;
actor->SetMapper(mapper);

vtkNew<vtkRenderer> renderer;
renderer->AddActor(actor);

vtkNew<vtkRenderWindow> renWin;
renWin->AddRenderer(renderer);

vtkNew<vtkRenderWindowInteractor> iren;
iren->SetRenderWindow(renWin);
renWin->Render();
iren->Start();
```

### 多输出 / 分支

```cpp
clipper->SetInputConnection(reader->GetOutputPort());
mapperA->SetInputConnection(clipper->GetOutputPort(0));
mapperB->SetInputConnection(clipper->GetOutputPort(1));
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| Pipeline vs Command | Pipeline 管数据流；Command 管事件回调 |
| `ShallowCopy` vs 管道连接 | 连接共享管线逻辑；拷贝是快照 |
| `vtkExecutive` | 调度器，控制何时执行各 Algorithm |

---

## 最佳实践与陷阱

1. **优先 `SetInputConnection` 而非 `SetInputData`**（除非故意断开管道）
2. **大数据注意 `Update()` 范围**，可用 `UpdatePiece` / 流式读取
3. **检查 `GetOutput()` 前确保 `Update()` 成功**
4. **Progress observer 别阻塞主线程**
5. **理解 Executive 的 MTime**，避免误以为每次都重算

---

## 重点与注意

> **重点**：VTK Pipeline 是 **拉取式**：末端 `Update()` 向上游请求数据，不是 Source 主动 push。  
> **重点**：现代 API 用 `SetInputConnection(port)` 连接端口，比 `SetInputData` 更能利用 MTime 缓存与按需计算。  
> **注意**：Pipeline 是**数据流架构**，不是 GoF Command；`StartEvent/ProgressEvent` 只是算法执行时的观察者钩子。  
> **注意**：`vtkAlgorithm` 与 `vtkMapper` 都在 Pipeline 里，但 Mapper 负责「几何 → 图形原语」，别与 Filter 职责混淆。

---

## 小结

VTK Pipeline 是 **过滤器链 + 拉取式执行 + 可缓存的数据对象**，支撑了 VTK 模块化算法生态。

**延伸阅读**

- [VTK Pipeline Documentation](https://docs.vtk.org/en/latest/guides/pipeline.html)
- 上一篇：[02 命令](02-command.md) · 下一篇：[04 迭代器](04-iterator.md)
- 系列索引：[README](../README.md)
