# VTK 设计模式：责任链模式

> 系列：[Qt / VTK 设计模式](../README.md) · VTK 10/10  
> 参考：[vtkObject.cxx InvokeEvent](https://github.com/Kitware/VTK/blob/master/Common/Core/vtkObject.cxx)、[vtkCommand::AbortFlag](https://github.com/Kitware/VTK/blob/master/Common/Core/vtkCommand.h)  
> 进阶：[VTK 观察者+命令深度专题](../vtk-observer-and-command-pattern.md)

---

## 引子

鼠标左键按下：3D 测量 Widget 正在编辑时，它应该先处理事件，相机旋转就不该再动——多个监听者排成链，**有人处理完就喊停**。VTK 事件系统的 `priority`、`AbortFlag`、`GrabFocus` 正是责任链。

---

## 要解决什么问题

所有 observer 都处理同一事件：

```cpp
// 旋转 + 框选 + 测量 同时响应 → 混乱
```

需要：**按顺序尝试，直到有人负责并中断**。

---

## GoF 责任链结构

| 角色 | VTK 对应 |
|------|----------|
| Handler | 每个 `vtkCommand` observer |
| 链顺序 | priority + 插入顺序 + Passive/Focus 阶段 |
| 停止传递 | `AbortFlagOn()` |

---

## VTK 中的落点

### InvokeEvent 三阶段（见 vtkObject.cxx）

1. **Passive observers** — 只读，不 abort
2. **Focus observers** — `GrabFocus` 的命令优先
3. **Remainder** — 其余按优先级

任一非 Passive 阶段，若 `GetAbortFlag()` 为真，**立即 return**，后续 handler 不执行。

### 3D Widget 典型用法

Widget 选中 → 处理 `LeftButtonPressEvent` → `AbortFlagOn()` → InteractorStyle 不再旋转。

### priority

```cpp
widgetCmd->SetPriority(1.0f);
styleCmd->SetPriority(0.0f);
obj->AddObserver(vtkCommand::LeftButtonPressEvent, widgetCmd, 1.0f);
```

高优先级先执行（详见 VTK observer order 文档）。

---

## 底层逻辑

```cpp
cmd->SetAbortFlag(0);
cmd->Execute(self, event, callData);
if (cmd->GetAbortFlag())
  return 1;  // 链截断
```

`GrabFocus` 设置 `vtkSubjectHelper::Focus1/Focus2`，Focus 阶段只执行焦点命令。

**与观察者模式关系**：观察者负责订阅；责任链负责 **同一事件的多 handler 顺序与中断**。

---

## 代码示例

### 消费事件的命令

```cpp
class ConsumePress : public vtkCommand {
public:
  static ConsumePress* New() { return new ConsumePress; }
  void Execute(vtkObject*, unsigned long eventId, void*) override {
    if (eventId == vtkCommand::LeftButtonPressEvent) {
      std::cout << "Handled, abort chain\n";
      this->AbortFlagOn();
    }
  }
};

vtkNew<ConsumePress> cmd;
interactor->AddObserver(vtkCommand::LeftButtonPressEvent, cmd, 1.0);
```

### GrabFocus（概念）

```cpp
// vtkInteractorObserver 子类在 Enabled 时
this->GrabFocus(this->EventCallbackCommand, nullptr);
```

释放时 `ReleaseFocus()`。

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| 责任链 vs 广播 | 广播全部执行；责任链可中途停止 |
| AbortFlag vs Passive | Passive 不 abort；主动 handler 可 abort |
| Qt eventFilter | 类似「返回 true 吃掉事件」 |

---

## 最佳实践与陷阱

1. **只有确实消费事件时才 AbortFlagOn**
2. **Passive observer 不要做有副作用的修改**
3. **依赖顺序时显式设 priority**
4. **Focus 用完要 ReleaseFocus**
5. **调试链顺序** 可临时 log 每个 Execute

---

## 重点与注意

> **重点**：`InvokeEvent` 分 Passive → Focus → Remainder 三阶段；`AbortFlag` 为 true 时**后续 handler 全部跳过**。  
> **重点**：`GrabFocus` 让指定 `vtkCommand` 在 Focus 阶段优先处理事件，适合 3D Widget 「接管」鼠标。  
> **注意**：责任链（顺序处理 + 可中断）与观察者（订阅通知）在 VTK 里共用一套 API，要能讲清分工。  
> **注意**：只有确实**消费**了事件才应 `AbortFlagOn()`，否则会导致 InteractorStyle 永远收不到输入。  
> **注意**：与 Qt `eventFilter` 返回 true 吃掉事件，思想类似但机制不同。

---

## 小结

VTK 责任链模式内建于 **InvokeEvent 的分阶段分发与 AbortFlag**，是交互 Widget 与 Style 共存的核心机制。

**延伸阅读**

- [VTK 观察者+命令深度专题](../vtk-observer-and-command-pattern.md)
- 上一篇：[09 组合](09-composite.md)
- 系列索引：[README](../README.md)
