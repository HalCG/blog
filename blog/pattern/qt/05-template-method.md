# Qt 设计模式：模板方法模式

> 系列：[Qt / VTK 设计模式](../README.md) · Qt 05/11  
> 参考：Qt 6 [QThread](https://doc.qt.io/qt-6/qthread.html)、[The Event System](https://doc.qt.io/qt-6/eventsandfilters.html)

---

## 引子

你写 `QThread` 子类时只实现 `run()`，线程的创建、启动、结束由基类定好骨架——子类填「可变的那一步」。这是模板方法模式的日常用法。

---

## 要解决什么问题

每个线程类都复制一遍：

```cpp
void threadMain() { setup(); work(); cleanup(); }
```

痛点：骨架重复、容易漏步骤、难以保证算法骨架一致。

---

## GoF 模板方法结构

| 角色 | Qt 示例 |
|------|---------|
| AbstractClass | `QThread` |
| templateMethod() | `QThread::start()` → 内部调用 `run()` |
| primitiveOperation() | 子类 `run()` |

---

## Qt 中的落点

### 1. QThread::run()

```cpp
class WorkerThread : public QThread {
protected:
  void run() override {
    // 只有这里是子类定制
    for (int i = 0; i < 100; ++i) emit progress(i);
  }
};
```

基类固定：线程入口、事件循环可选、`exec()` 等。

### 2. QWidget::paintEvent() / event()

`QWidget::event()` 分发到 `paintEvent`、`mousePressEvent` 等——框架定义分发骨架，子类重写钩子。

### 3. QAbstractItemView

`paint()` 流程固定，子类实现 `data()` 访问（通过 Model）和特定绘制细节。

---

## 底层逻辑

模板方法 = **好莱坞原则**：「Don't call us, we'll call you.」

```
start()
  → 平台线程创建
  → run()  [子类实现]
  → 线程结束清理
```

`paintEvent` 链：

```
QApplication::notify
  → QWidget::event
  → case QEvent::Paint: paintEvent(e);  // 子类可 override
```

---

## 代码示例

```cpp
class DownloadThread : public QThread {
  Q_OBJECT
protected:
  void run() override {
    // 骨架外的可变部分
    QByteArray data = fetchUrl(m_url);
    emit finished(data);
  }
signals:
  void finished(const QByteArray&);
private:
  QUrl m_url;
};

// 使用
DownloadThread* t = new DownloadThread;
connect(t, &DownloadThread::finished, this, &Controller::onData);
t->start();
```

现代 Qt 更推荐 `QThreadPool` + `QRunnable` 或 `QtConcurrent`，但 `QThread::run()` 仍是理解模板方法的经典入口。

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| 模板方法 vs 策略 | 模板方法继承定骨架；策略组合换算法 |
| 模板方法 vs 工厂 | 工厂创建对象；模板方法定义流程 |
| `run()` vs `QObject::moveToThread` | 后者把对象放到线程，槽在 worker 线程执行 |

---

## 最佳实践与陷阱

1. **不要 override `QThread::start()` 来塞业务**，用 `run()` 或 worker 对象
2. **UI 更新用信号槽 QueuedConnection**，不要在 `run()` 里直接碰 QWidget
3. **`paintEvent` 里只做绘制**，不重计算布局
4. **调用基类 `paintEvent`** 当需要默认背景等行为时
5. **理解 `event()` 与具体 `xxxEvent()` 的分工**

---

## 重点与注意

> **重点**：模板方法 = 基类定**算法骨架**，子类 override **可变步骤**；`QThread::start()` 流程固定，只有 `run()` 由你实现。  
> **重点**：`QWidget::event()` 根据 `event->type()` 分发到 `mousePressEvent` / `paintEvent` 等，是模板方法 + 中介者的组合。  
> **注意**：现代 Qt 更推荐 `moveToThread` + worker 对象 + 信号槽，而非频繁继承 `QThread`。  
> **注意**：模板方法（继承定流程）与策略模式（组合换算法）是两种扩展方式，别混用概念。

---

## 小结

Qt 模板方法模式藏在 **线程入口、事件分发、绘制流程** 里：框架定顺序，子类填步骤。

**延伸阅读**

- 上一篇：[04 策略](04-strategy.md) · 下一篇：[06 工厂](06-factory.md)
- 系列索引：[README](../README.md)
