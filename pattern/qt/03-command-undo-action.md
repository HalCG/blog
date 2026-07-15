# Qt 设计模式：命令模式、QUndoStack 与 QAction

> 系列：[Qt / VTK 设计模式](../README.md) · Qt 03/11  
> 参考：Qt 6 [QUndoStack](https://doc.qt.io/qt-6/qundostack.html)、[QAction](https://doc.qt.io/qt-6/qaction.html)

---

## 引子

画图软件里你画了一条线、撤消、再重做——每一步操作被封装成「命令对象」压栈。Qt 用 `QUndoCommand` 和 `QUndoStack` 把这件事做成了标准库；而菜单里的每一个 `QAction`，也是把「用户意图」封装成可触发、可禁用、可快捷键绑定的命令。

---

## 要解决什么问题

直接在菜单槽函数里写业务：

```cpp
void onDelete() { model->remove(selected); /* 没有 undo */ }
```

痛点：无法撤销、无法宏命令合并、UI 状态（enable/disable）与操作逻辑缠在一起。

---

## GoF 命令结构

```
Invoker ──▶ Command::execute()
                ├── ConcreteCommandA
                └── ConcreteCommandB
```

| 角色 | Qt 对应 |
|------|---------|
| Command | `QUndoCommand` 子类 |
| Invoker | `QUndoStack::push()` |
| Receiver | 命令内部持有的 model/document |
| 可选 | `undo()` / `redo()` |

---

## Qt 中的落点

### QUndoStack / QUndoCommand

- `redo()`：首次 `push` 时调用
- `undo()`：撤消时调用
- `id()` + `mergeWith()`：连续同类操作合并（如连续输入字符）

### QAction

- 封装 **文本、图标、快捷键、checkable 状态**
- `triggered` 信号连接实际逻辑
- `QUndoAction` 直接绑定 `QUndoStack` 的 undo/redo

---

## 底层逻辑

### push 时发生了什么

```cpp
void QUndoStack::push(QUndoCommand* cmd) {
  // 1. 若不在栈顶，丢弃 redo 分支
  // 2. 调用 cmd->redo()
  // 3. 尝试与栈顶 mergeWith（id 相同）
  // 4. 入栈，发射 indexChanged / canUndoChanged
}
```

### 命令合并

```cpp
int InsertTextCommand::id() const { return 1; }

bool InsertTextCommand::mergeWith(const QUndoCommand* other) {
  auto* o = static_cast<const InsertTextCommand*>(other);
  if (o->m_pos != m_pos + m_text.size()) return false;
  m_text += o->m_text;
  return true;
}
```

连续快速输入多次 `push`，栈上仍是一个命令对象，undo 一次删掉整段。

---

## 代码示例

### 最小 Undo 命令

```cpp
class MoveCommand : public QUndoCommand {
public:
  MoveCommand(QGraphicsItem* item, const QPointF& oldPos, const QPointF& newPos)
    : m_item(item), m_old(oldPos), m_new(newPos) {
    setText("Move item");
  }
  void undo() override { m_item->setPos(m_old); }
  void redo() override { m_item->setPos(m_new); }
private:
  QGraphicsItem* m_item;
  QPointF m_old, m_new;
};

// 使用
stack.push(new MoveCommand(item, oldPos, item->pos()));
```

### QAction 解耦 UI

```cpp
auto* saveAction = new QAction(tr("&Save"), this);
saveAction->setShortcut(QKeySequence::Save);
saveAction->setIcon(QIcon(":/icons/save.png"));
connect(saveAction, &QAction::triggered, this, &Editor::saveDocument);
menu->addAction(saveAction);
toolBar->addAction(saveAction);  // 同一命令，两处 UI
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| `QUndoCommand` vs `QAction` | 前者管 undo/redo 语义；后者管 UI 呈现与触发 |
| `QUndoCommand` vs VTK `vtkCommand` | **名字相近、完全不同**：VTK 是事件回调，不是撤销栈 |
| Command vs 信号槽 | 命令强调状态变更的可逆封装；信号槽是通知机制 |

---

## 最佳实践与陷阱

1. **`push` 后栈获得命令所有权**，不要手动 `delete`
2. **`redo()` 里写实际变更**，构造函数里少做副作用
3. **大操作拆成宏命令** `beginMacro` / `endMacro`
4. **QAction 用 `setEnabled` 反映状态**，而非在槽里判断后 return
5. **线程**：`QUndoStack` 应在 GUI 线程使用

---

## 重点与注意

> **重点**：`QUndoCommand::redo()` 在 **首次 `push` 时调用**，不是构造函数里；`undo()` 在撤消时调用。  
> **重点**：`id()` 相同且 `mergeWith()` 返回 true 时，连续操作会**合并成栈顶一条命令**（如连续输入文字）。  
> **注意**：`QUndoCommand`（可撤销）与 `QAction`（UI 动作封装）层次不同，但常配合：`QUndoAction` 直接绑到 `QUndoStack`。  
> **注意**：`push` 之后栈拥有命令指针，**不要再手动 delete**。  
> **注意**：与 VTK 的 `vtkCommand` **完全不是一回事**——后者是事件回调，没有 undo/redo 语义。

---

## 小结

Qt 命令模式两条线：`QUndoCommand` 解决 **可撤销编辑**；`QAction` 解决 **UI 动作封装**。二者常配合使用。

**延伸阅读**

- [QUndoFramework](https://doc.qt.io/qt-6/qundo-framework.html)
- 上一篇：[02 组合](02-composite-qobject-tree.md) · 下一篇：[04 策略](04-strategy.md)
- 系列索引：[README](../README.md)
