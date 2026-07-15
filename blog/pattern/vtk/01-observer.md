# VTK 设计模式：观察者模式与事件广播

> 系列：[Qt / VTK 设计模式](../README.md) · VTK 01/10  
> 参考：[vtkObject.cxx](https://github.com/Kitware/VTK/blob/master/Common/Core/vtkObject.cxx)、[vtkCommand.h](https://github.com/Kitware/VTK/blob/master/Common/Core/vtkCommand.h)  
> 进阶：[VTK 观察者+命令深度专题](../vtk-observer-and-command-pattern.md)

---

## 引子

`vtkRenderer` 开始绘制前会发 `StartEvent`，结束时发 `EndEvent`；`vtkAlgorithm` 滤波时发 `ProgressEvent`。任何 `vtkObject` 都可以被「订阅」——这就是 VTK 的观察者模式。

---

## 要解决什么问题

若渲染前后处理写死在 `vtkRenderer::Render()` 里：

```cpp
// 伪代码：每加一个功能都要改 Render()
LogRenderStart();
CustomShaderHook();
ActualRender();
LogRenderEnd();
```

痛点：框架类膨胀、插件无法扩展、模块间紧耦合。

VTK 用 **AddObserver + InvokeEvent** 把扩展点外挂出来。

---

## GoF 观察者结构

| 角色 | VTK 对应 |
|------|----------|
| Subject | `vtkObject` 子类 |
| Observer | `vtkCommand`（回调体，见下一篇） |
| 注册 | `AddObserver(event, cmd, priority)` |
| 通知 | `InvokeEvent(event, callData)` |

---

## VTK 中的落点

核心 API（`vtkObject.h`）：

```cpp
unsigned long AddObserver(unsigned long event, vtkCommand*, float priority = 0.0f);
void RemoveObserver(unsigned long tag);
vtkTypeBool InvokeEvent(unsigned long event, void* callData = nullptr);
```

内部由 **`vtkSubjectHelper`** 维护 observer 列表（见 `vtkObject.cxx`）。

常见事件：

| 事件 | 典型发射者 |
|------|------------|
| `ModifiedEvent` | 任意 `vtkObject::Modified()` |
| `StartEvent` / `EndEvent` | `vtkRenderer`、`vtkAlgorithm` |
| `ProgressEvent` | 长时间算法 |
| `LeftButtonPressEvent` | `vtkInteractorStyle` |

---

## 底层逻辑

### InvokeEvent 分发（概念）

`vtkSubjectHelper::InvokeEvent` 分阶段执行：

1. **Passive 观察者**：只读监听，不应改变状态
2. **Focus 观察者**：`GrabFocus` 后优先处理
3. **Remainder**：其余按优先级与插入顺序

详见进阶专题：[vtk-observer-and-command-pattern.md](../vtk-observer-and-command-pattern.md)

### ModifiedEvent 与渲染

```
polyData->Modified()
  → mapper->Modified()
  → actor->Modified()
  → （应用层 observer）renderWindow->Render()
```

数据变化通过观察者链驱动视图更新，而非轮询 `GetMTime()`。

---

## 代码示例

### 监听渲染生命周期

```cpp
class RenderProbe : public vtkCommand {
public:
  static RenderProbe* New() { return new RenderProbe; }
  void Execute(vtkObject* caller, unsigned long eventId, void*) override {
    if (eventId == vtkCommand::StartEvent)
      std::cout << "Render start\n";
    else if (eventId == vtkCommand::EndEvent)
      std::cout << "Render end\n";
  }
};

vtkNew<RenderProbe> probe;
renderer->AddObserver(vtkCommand::StartEvent, probe);
renderer->AddObserver(vtkCommand::EndEvent, probe);
renderWindow->Render();
```

### 进度条

```cpp
void OnProgress(vtkObject*, unsigned long, void* callData) {
  double* p = static_cast<double*>(callData);
  if (p) UpdateProgressBar(*p);
}

vtkNew<vtkCallbackCommand> cb;
cb->SetCallback([](vtkObject* o, unsigned long e, void* d, void* cd) {
  static_cast<decltype(OnProgress)*>(cd)(o, e, d);
});
cb->SetClientData(reinterpret_cast<void*>(+[] (vtkObject* a, unsigned long b, void* c) {
  OnProgress(a, b, c);
}));
filter->AddObserver(vtkCommand::ProgressEvent, cb);
filter->Update();
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| VTK Observer vs Qt 信号槽 | VTK 基于 C++ 虚函数 + 引用计数；Qt 有 moc 与线程队列 |
| `Modified()` vs `InvokeEvent` | `Modified()` 更新 MTime 并触发 `ModifiedEvent` |
| Pipeline `Update()` vs 事件 | `Update()` 是数据拉取；事件是副作用通知 |

---

## 最佳实践与陷阱

1. **析构前 `RemoveObserver`**，避免悬空 `this`
2. **`ModifiedEvent` 回调保持轻量**，勿做重计算
3. **需要严格顺序时设置 priority**（见 [observer invocation order](https://docs.vtk.org/en/latest/advanced/observer_invocation_order.html)）
4. **弄清 callData 类型**——因发射者而异
5. **Passive observer 里不要 Add/Remove observer**

---

## 重点与注意

> **重点**：凡继承 `vtkObject` 的对象都可 `AddObserver`；`InvokeEvent` 由内部 `vtkSubjectHelper` 按优先级分发。  
> **重点**：`Modified()` 会更新 `MTime` 并触发 `ModifiedEvent`，是数据驱动重绘的常见链路。  
> **注意**：VTK 观察者与 Qt 信号槽**层次不同**：前者无 moc、靠 `vtkCommand` + 引用计数，常出现在渲染/算法生命周期。  
> **注意**：同一 `eventId` 可挂多个 observer；需要固定顺序时必须显式设 **priority**。

---

## 小结

VTK 观察者模式的本质是：**vtkObject 作为事件总线，InvokeEvent 广播，vtkCommand 执行回调**。

**延伸阅读**

- 下一篇：[02 vtkCommand 与事件回调](02-command.md)
- 深度专题：[vtk-observer-and-command-pattern.md](../vtk-observer-and-command-pattern.md)
- 系列索引：[README](../README.md)
