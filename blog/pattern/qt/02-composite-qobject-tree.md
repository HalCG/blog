# Qt 设计模式：组合模式与 QObject 树

> 系列：[Qt / VTK 设计模式](../README.md) · Qt 02/11  
> 参考：Qt 6 [Object Trees & Ownership](https://doc.qt.io/qt-6/objecttrees.html)

---

## 引子

关掉主窗口，里面的按钮、标签、布局器一起销毁——你不需要手动 `delete` 每一个子控件。这不是魔法，而是 Qt **组合模式 + 对象树所有权** 的默认行为。

---

## 要解决什么问题

若每个子控件都由父窗口指针手动管理：

```cpp
~MainWindow() {
  delete m_okBtn;
  delete m_cancelBtn;
  delete m_layout; // 顺序错了就 double-free
}
```

痛点：生命周期难维护、层次结构不清晰、异常不安全。

---

## GoF 组合结构

```
Component
 ├── Leaf
 └── Composite ── contains ──▶ Component*
```

| 角色 | Qt 对应 |
|------|---------|
| Component | `QObject` |
| Composite | 有子对象的 `QObject`（如 `QWidget`） |
| Leaf | 无子节点的 `QObject` |
| 统一接口 | `children()`、`setParent()` |

---

## Qt 中的落点

- `QObject::setParent(QObject* parent)` 建立父子关系
- 父对象销毁时，**按任意顺序**销毁所有子对象
- `QWidget` 在此基础上还有 **布局树** 与 **窗口层级**

---

## 底层逻辑

### 1. 构造时指定 parent

```cpp
QPushButton* btn = new QPushButton("OK", dialog);  // dialog 为 parent
```

`QObject` 私有实现会把 `btn` 加入 `dialog` 的 `children` 列表。

### 2. 析构顺序

`~QObject()` 大致逻辑（概念）：

1. 发射 `destroyed()` 信号
2. 从父的 children 列表移除自己
3. **delete 所有子对象**
4. 清理与己相关的 `connect`

因此：**子先于父销毁**（由父的析构触发），你不需要反向 delete。

### 3. Widget 与组合的关系

`QWidget` 继承 `QObject` + `QPaintDevice`：

- **QObject 父子**：管内存与信号槽线程亲和
- **QWidget 父子**：还影响坐标系、可见性、`WA_DeleteOnClose` 等

布局器（`QLayout`）是另一种组合：控件通过 `layout->addWidget()` 组织，但所有权仍常归于 parent widget。

---

## 代码示例

### 对象树与自动销毁

```cpp
void buildUi() {
  auto* dialog = new QDialog;
  auto* ok = new QPushButton("OK", dialog);
  auto* cancel = new QPushButton("Cancel", dialog);
  Q_UNUSED(ok);
  Q_UNUSED(cancel);
  dialog->exec();
  delete dialog;  // ok、cancel 自动销毁
}
```

### 遍历子对象

```cpp
void printTree(QObject* obj, int indent = 0) {
  qDebug().noquote() << QString(indent, ' ') << obj->metaObject()->className();
  for (QObject* child : obj->children())
    printTree(child, indent + 2);
}
```

### `QObject::findChild` 组合式查找

```cpp
QPushButton* btn = parent->findChild<QPushButton*>("okButton");
```

在树上按类型/对象名查找，体现「整体-部分」统一访问。

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| `QObject` parent vs `QLayout` | 布局不自动获得 widget 的 QObject 所有权（旧 API 需注意）；现代写法仍推荐 parent widget |
| `deleteLater()` vs 组合析构 | `deleteLater()` 在事件循环下一轮删除，用于跨线程或避免重入 |
| 组合 vs 聚合 | Qt 父子是强所有权（组合）；弱引用用 `QPointer` 或 `QWeakPointer` |

---

## 最佳实践与陷阱

1. **长生命周期对象设 parent** 或交给智能指针，避免泄漏
2. **栈上 QWidget 不要错误 setParent 到堆对象** 导致双重释放
3. **`QObject(nullptr)` 作为 parent** 表示无父、需自己管理或使用智能指针
4. **线程亲和**：子对象默认与父同线程；`moveToThread` 后父子关系仍影响销毁顺序
5. **不要在子对象析构里访问已析构的父**（连接应已断开，但仍需警惕）

---

## 重点与注意

> **重点**：`setParent` 建立组合关系后，父对象析构会 **delete 所有子对象**，这是 Qt 内存管理的核心约定。  
> **重点**：`QObject` 父子树管的是**对象生命周期与线程亲和**；`QLayout` 管的是**几何布局**，两套树不要混为一谈。  
> **注意**：`deleteLater()` 不是立刻删除，而是向对象所属线程的事件队列投递删除事件——跨线程销毁对象必须用此法。  
> **注意**：parent 为 `nullptr` 的对象要自己 `delete` 或交给智能指针；堆上创建 Widget 却不设 parent 是常见泄漏来源。  
> **注意**：子对象可以 `moveToThread`，但仍在父析构时被 delete；别在线程未停时就让父对象销毁。

---

## 小结

Qt 组合模式的本质是：**用 QObject 树统一表达「部分-整体」结构与生命周期**。这是整个 Qt 框架的骨架。

**延伸阅读**

- [Object Trees & Ownership](https://doc.qt.io/qt-6/objecttrees.html)
- 上一篇：[01 观察者](01-observer-signals-slots.md) · 下一篇：[03 命令](03-command-undo-action.md)
- 系列索引：[README](../README.md)
