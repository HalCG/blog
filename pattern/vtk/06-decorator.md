# VTK 设计模式：装饰模式

> 系列：[Qt / VTK 设计模式](../README.md) · VTK 06/10  
> 参考：[vtkLODActor](https://vtk.org/doc/nightly/html/classvtkLODActor.html)、[vtkAlgorithm](https://vtk.org/doc/nightly/html/classvtkAlgorithm.html)

---

## 引子

同一个 `vtkActor`，交互时用低精度网格，静止后再换高精度——`vtkLODActor` 在外部接口不变的前提下，**叠加**了 LOD 行为。这是装饰模式：**透明地增强对象职责**。

---

## 要解决什么问题

继承链爆炸：

```cpp
class FastActor : public vtkActor {};
class TexturedFastActor : public FastActor {};
// 每种组合一个子类
```

装饰用组合替代继承，动态叠加能力。

---

## GoF 装饰结构

| 角色 | VTK 示例 |
|------|----------|
| Component | `vtkActor` / `vtkProp` |
| Decorator | `vtkLODActor` |
| 附加行为 | 交互时低模、静止时高模 |

---

## VTK 中的落点

### vtkLODAactor

- 持有多个 `vtkMapper` 或分辨率级别
- 根据交互状态自动切换
- 对外仍表现为 `vtkProp`，可 `AddActor` 到 renderer

### Algorithm 包装链

虽更接近 Pipeline，但部分 Filter 在 **不改变下游接口** 的前提下增加功能：

```
vtkPolyData → vtkCleanPolyData → vtkSmoothPolyDataFilter → mapper
```

每个 Filter「装饰」了数据流上的处理步骤（严格说是 Pipe and Filter，但装饰思想相通）。

### vtkGlyph3D

将点数据「装饰」为图标几何，输入输出端口仍符合 Algorithm 约定。

---

## 底层逻辑

`vtkLODActor` 监听交互事件或根据帧率：

- `StartInteractionEvent` → 使用低分辨率 mapper
- `EndInteractionEvent` → 恢复高分辨率

**关键**：客户端代码仍按普通 Actor 使用，不知晓内部切换细节。

---

## 代码示例

```cpp
#include <vtkLODActor.h>
#include <vtkPolyDataMapper.h>

vtkNew<vtkPolyDataMapper> hiRes;
hiRes->SetInputConnection(highPoly->GetOutputPort());

vtkNew<vtkPolyDataMapper> loRes;
loRes->SetInputConnection(lowPoly->GetOutputPort());

vtkNew<vtkLODActor> actor;
actor->SetMapper(hiRes);
actor->AddLODMapper(loRes);
actor->SetNumberOfCloudPoints(10000);

renderer->AddActor(actor);
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| 装饰 vs 继承 | 装饰运行时组合；继承编译期固定 |
| 装饰 vs 代理 | 代理常控制访问；装饰增强功能 |
| LOD Actor vs Decimation Filter | 前者渲染策略；后者永久改几何 |

---

## 最佳实践与陷阱

1. **确保 LOD 各级几何对齐**，避免切换时跳动
2. **交互事件监听别泄漏** observer
3. **大场景优先 GPU LOD / 层次细节** 而非单一 Actor 装饰
4. **Filter 链过长** 注意 Update 开销
5. **区分装饰与缓存**（`vtkAlgorithm` 内部 MTime 缓存不是装饰）

---

## 重点与注意

> **重点**：装饰模式 = **保持对外接口不变，叠加额外行为**；`vtkLODActor` 对外仍是 `vtkProp`，内部按交互状态切换 LOD。  
> **重点**：用组合替代「为每种增强都写一个子类」导致的继承爆炸。  
> **注意**：装饰（增强职责）与代理（控制访问）不同；LOD 是增强渲染行为，不是替身。  
> **注意**：Filter 链更像 Pipe-and-Filter 架构，与 `vtkLODActor` 的装饰语义有重叠但层次不同。

---

## 小结

VTK 装饰模式典型代表是 **`vtkLODActor`**：保持接口，动态增强渲染行为。

**延伸阅读**

- 上一篇：[05 策略](05-strategy.md) · 下一篇：[07 工厂](07-factory.md)
- 系列索引：[README](../README.md)
