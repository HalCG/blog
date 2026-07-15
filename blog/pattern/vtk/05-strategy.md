# VTK 设计模式：策略模式

> 系列：[Qt / VTK 设计模式](../README.md) · VTK 05/10  
> 参考：[vtkInteractorStyle](https://vtk.org/doc/nightly/html/classvtkInteractorStyle.html)、[vtkMapper](https://vtk.org/doc/nightly/html/classvtkMapper.html)  
> **详细版**：[05 策略模式详解](05-strategy-detail.md)

---

## 引子

同一渲染窗口，切换「轨道球旋转」和「橡皮筋框选」——不是改一堆 if-else，而是 `SetInteractorStyle` 换策略对象。VTK 交互与映射层是策略模式的典型战场。

---

## 要解决什么问题

```cpp
if (mode == Trackball) onMouseRotate();
else if (mode == RubberBand) onMouseSelect();
```

痛点：交互逻辑耦合、无法运行时热切换、测试困难。

---

## GoF 策略结构

| 角色 | VTK 示例 |
|------|----------|
| Strategy | `vtkInteractorStyleTrackballCamera` |
| Context | `vtkRenderWindowInteractor` |
| 切换 | `interactor->SetInteractorStyle(style)` |

---

## VTK 中的落点

### vtkInteractorStyle 族

- `vtkInteractorStyleTrackballCamera` — 轨道球
- `vtkInteractorStyleRubberBand2D` — 2D 框选
- `vtkInteractorStyleImage` — 图像窗宽窗位
- ParaView：`vtkPVInteractorStyle` 扩展多操纵器

### vtkMapper 族

同一 `vtkActor`，不同映射策略：

- `vtkPolyDataMapper` — 多边形
- `vtkGPUVolumeRayCastMapper` — 体绘制
- `vtkGlyph3DMapper` — 点精灵

---

## 底层逻辑

`vtkInteractorStyle` 继承 `vtkInteractorObserver`：

- 注册到 `vtkRenderWindowInteractor`
- 接收 `InvokeEvent(LeftButtonPressEvent, ...)`
- 虚函数 `OnLeftButtonDown()` 等由子类实现不同算法

切换策略时：

```cpp
interactor->SetInteractorStyle(newStyle);
```

旧 style 引用计数释放，新 style 开始接收事件。

---

## 代码示例

```cpp
#include <vtkRenderWindowInteractor.h>
#include <vtkInteractorStyleTrackballCamera.h>
#include <vtkInteractorStyleRubberBand2D.h>

void useTrackball(vtkRenderWindowInteractor* iren) {
  vtkNew<vtkInteractorStyleTrackballCamera> style;
  iren->SetInteractorStyle(style);
}

void useRubberBand(vtkRenderWindowInteractor* iren) {
  vtkNew<vtkInteractorStyleRubberBand2D> style;
  iren->SetInteractorStyle(style);
}
```

ParaView 还在同一 style 上 **组合多个 vtkCameraManipulator**，按鼠标按键再分策略——策略嵌套策略。

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| InteractorStyle vs Command | Style 是持续策略；Command 常指单次回调 |
| Mapper 策略 vs Filter | Filter 改数据；Mapper 决定如何画 |
| 3D Widget | 也可截获事件，常与 Style 配合 AbortFlag |

---

## 最佳实践与陷阱

1. **自定义 Style 优先继承最接近的现有子类**
2. **切换 Style 后检查 Enabled 与 CurrentRenderer**
3. **Volume 与 Poly 数据选错 Mapper 会空渲染或崩溃**
4. **多视口时每个 interactor 可独立 Style**
5. **记录默认 Style** 便于退出工具模式时恢复

---

## 重点与注意

> **重点**：`SetInteractorStyle` 在**运行期**切换交互算法，是策略模式的典型 API。  
> **重点**：`vtkMapper` 族决定「画什么、怎么画」（多边形 / 体绘制 / Glyph），与 `vtkInteractorStyle` 管输入是同一模式的两类场景。  
> **注意**：Strategy（换算法）与 State（随内部状态自动切换）不同；Style 由客户端显式设置。  
> **注意**：换 Mapper 不匹配数据类型（如对 `vtkImageData` 用 `vtkPolyDataMapper`）会导致空渲染或崩溃。

---

## 小结

VTK 策略模式核心在 **InteractorStyle（交互）** 与 **Mapper（绘制路径）** 的可替换族。

**延伸阅读**

- **详细版**：[05 策略模式详解](05-strategy-detail.md)（InteractorStyle / Mapper / Picker 全展开）
- 上一篇：[04 迭代器](04-iterator.md) · 下一篇：[06 装饰](06-decorator.md)
- 系列索引：[README](../README.md)
