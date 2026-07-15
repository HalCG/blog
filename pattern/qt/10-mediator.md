# Qt 设计模式：中介者模式

> 系列：[Qt / VTK 设计模式](../README.md) · Qt 10/11  
> 参考：Qt 6 [The Event System](https://doc.qt.io/qt-6/eventsandfilters.html)、[QApplication::notify](https://doc.qt.io/qt-6/qcoreapplication.html#notify)

---

## 引子

按钮、滑块、窗口之间如果互相 `connect` 成网状，改一个功能要动十条线。Qt 事件系统充当 **中介者**：对象不直接找对方，而把 `QEvent` 交给中央分发器。

---

## 要解决什么问题

多控件直接互连：

```cpp
connect(slider, &QSlider::valueChanged, spinBox, &QSpinBox::setValue);
connect(spinBox, QOverload<int>::of(&QSpinBox::valueChanged), slider, &QSlider::setValue);
// N 个控件 → N² 连接
```

中介者集中协调，或统一过滤事件。

---

## GoF 中介者结构

| 角色 | Qt 对应 |
|------|---------|
| Mediator | `QCoreApplication` 事件循环 |
| Colleague | 各 `QObject` / `QWidget` |
| 通信 | `postEvent` / `sendEvent` / `notify` |

---

## Qt 中的落点

### 1. 事件循环

```
QCoreApplication::exec()
  → 取事件队列
  → notify(receiver, event)
  → receiver->event(event)
```

### 2. event() 与具体处理函数

`QWidget::event()` 根据 `event->type()` 分发到 `mousePressEvent`、`keyPressEvent` 等——**模板方法 + 中介** 结合。

### 3. installEventFilter

```cpp
bool Filter::eventFilter(QObject* watched, QEvent* event) {
  if (watched == target && event->type() == QEvent::KeyPress)
    return true;  // 吃掉事件，不再传递
  return QObject::eventFilter(watched, event);
}
target->installEventFilter(filter);
```

在对象收到事件前/后插入中介逻辑，无需改 target 源码。

### 4. 信号槽作为补充中介

有时用单一 `Controller` QObject 连接所有控件，也是中介者思想（应用层）。

---

## 底层逻辑

`QCoreApplication::notify` 可全局重写（调试、统计、沙箱）：

```cpp
bool MyApp::notify(QObject* receiver, QEvent* event) {
  // 全局中介逻辑
  return QApplication::notify(receiver, event);
}
```

事件传递顺序（简化）：

1. `notify`
2. 若有过滤器，`eventFilter` 链
3. `receiver->event()`
4. 可能传播到父 widget（部分事件）

---

## 代码示例

### 全局快捷键过滤

```cpp
class ShortcutFilter : public QObject {
protected:
  bool eventFilter(QObject* obj, QEvent* ev) override {
    if (ev->type() == QEvent::KeyPress) {
      auto* ke = static_cast<QKeyEvent*>(ev);
      if (ke->key() == Qt::Key_F1) { showHelp(); return true; }
    }
    return QObject::eventFilter(obj, ev);
  }
};

app.installEventFilter(new ShortcutFilter(&app));
```

### 应用层 Controller 中介

```cpp
class FormController : public QObject {
  FormController(QSlider* s, QSpinBox* b) {
    connect(s, &QSlider::valueChanged, b, &QSpinBox::setValue);
    connect(b, QOverload<int>::of(&QSpinBox::valueChanged), s, &QSlider::setValue);
  }
};
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| 中介者 vs 观察者 | 中介者集中协调；观察者广播订阅 |
| `eventFilter` vs 信号槽 | 过滤器拦截低层 QEvent；信号槽是高层语义 |
| `notify` vs `postEvent` | `sendEvent` 同步；`postEvent` 排队 |

---

## 最佳实践与陷阱

1. **eventFilter 返回 true** 表示事件已处理，不再传递
2. **过滤器注意生命周期**，parent 设为被监视对象或 app
3. **避免在 notify 里递归死循环**
4. **复杂 UI 用 Controller 中介**，避免控件互相 connect
5. **与信号槽分工**：输入用事件；业务通知用信号

---

## 重点与注意

> **重点**：`QCoreApplication::notify(receiver, event)` 是所有 Qt 事件的**中央分发入口**，是中介者模式的核心。  
> **重点**：`installEventFilter` 可在对象处理事件前/后插入逻辑；`eventFilter` 返回 `true` 表示事件**已消费**，不再传递。  
> **注意**：中介者（集中协调）与观察者（广播订阅）互补：事件循环是中介；信号槽是观察者。  
> **注意**：重写 `notify` 影响全局，调试完记得调用基类实现，否则可能吞掉事件。

---

## 小结

Qt 中介者模式的核心是 **事件循环 + notify + eventFilter**，统一对象间交互路径。

**延伸阅读**

- 上一篇：[09 享元](09-flyweight.md) · 下一篇：[11 MVC](11-mvc-model-view.md)
- 系列索引：[README](../README.md)
