# Qt 事件循环与多线程（QThread、QEventLoop、QtConcurrent）详解

在设计 GUI 应用程序时，保持界面的流畅响应是用户体验的第一要素。在主线程（UI 线程）中执行任何耗时较长的操作（如大文件读写、网络数据等待、复杂图像处理）都会导致界面“冻结”卡死。

为了解决这一问题，我们需要深入理解 Qt 的**事件循环机制**，并掌握 **QThread**、**QEventLoop** 以及 **QtConcurrent** 这三种不同的异步控制手段。

---

## 1. 事件循环与 UI 线程阻塞

Qt 的主函数中，最后一步通常是执行：
```cpp
QApplication a(argc, argv);
return a.exec(); // 开启主事件循环
```
`a.exec()` 本质上是一个 `while` 死循环，它不断从操作系统获取鼠标点击、键盘输入、窗口重绘等消息，包装成事件并分发给对应的 `QWidget` 处理。

### 1.1 UI 线程卡死与临时方案 `processEvents()`
如果某个槽函数内执行了一个长达数秒的循环，主事件循环就无法继续轮询，界面随之卡死。

* **临时方案**：在耗时循环中手动调用 `QCoreApplication::processEvents()` 强制刷新事件队列。
  ```cpp
  for (int i = 0; i < 1000000; i++) {
      do_heavy_work();
      QCoreApplication::processEvents(); // 强制处理挂起的事件，保持界面刷新
  }
  ```
* **⚠️ 安全警示**：**不推荐在正式项目中使用此方法**。因为在处理挂起事件时，用户可能会再次点击同一个按钮，引发函数的重入（Reentrancy），导致不可预测的逻辑混乱或崩溃。

---

## 2. 局部事件循环（QEventLoop）的精妙应用

有些场景下，我们需要在代码的当前行**等待某个异步信号**（如等待网络请求返回、等待动画结束），但又不能让主界面卡死。此时可以使用 **`QEventLoop` 开启局部事件循环**：

```cpp
#include <QEventLoop>
#include <QTimer>

void delay_wait() {
    QEventLoop loop;
    
    // 设置定时器，3秒后发出 timeout 信号
    QTimer::singleShot(3000, &loop, &QEventLoop::quit); 
    
    // 开启局部事件循环。代码在此处“阻塞”等待，但底层依然在正常处理界面刷新和点击事件！
    loop.exec(); 
    
    // 3秒后定时器退出循环，代码继续往下执行
    do_next_steps();
}
```

---

## 3. QThread 的两种使用模式与正确退出方式

`QThread` 是 Qt 提供的底层线程管理类，主要有两种实现模式：

### 3.1 模式一：重写 `run()` 函数（继承模式 - 较老）
* **做法**：继承 `QThread`，重写其 `run()` 函数。只有 `run()` 内部的代码是在子线程中运行的。
* **⚠️ 注意**：该 `QThread` 实例对象本身的成员变量和槽函数仍然属于创建它的线程（通常是主线程），这在跨线程数据存取时容易出错。

### 3.2 模式二：`moveToThread()`（对象移动模式 - 推荐）
* **做法**：编写一个继承自 `QObject` 的工作类（Worker），通过 `moveToThread` 将其移动到子线程中。此时，该工作类的所有槽函数都将在子线程中执行。

```cpp
// 1. 定义工作类
class Worker : public QObject {
    Q_OBJECT
public slots:
    void doWork() {
        // 在子线程中执行的耗时计算
        emit resultReady();
    }
signals:
    void resultReady();
};

// 2. 在主线程中装配使用
void start_thread() {
    QThread* thread = new QThread();
    Worker* worker = new Worker();
    
    worker->moveToThread(thread); // 移动对象到子线程
    
    // 线程启动后，自动触发工作类的计算
    connect(thread, &QThread::started, worker, &Worker::doWork);
    // 计算完成后，清理线程和对象
    connect(worker, &Worker::resultReady, thread, &QThread::quit);
    connect(thread, &QThread::finished, worker, &QObject::deleteLater);
    connect(thread, &QThread::finished, thread, &QObject::deleteLater);
    
    thread->start(); // 启动线程
}
```

### 3.3 ⚠️ 线程的安全终止
千万不要在外部直接调用 `thread->terminate()` 强制杀死线程，这可能导致线程持有的锁未释放、文件句柄未关闭。
* **正确做法**：在工作循环中设置一个原子布尔标志（如 `std::atomic``<bool>`` is_running`）。需要停止时在主线程修改该标志，子线程循环检测到后安全退出 `run()` 函数，最后主线程调用 `thread->wait()` 等待其彻底结束。

---

## 4. QtConcurrent 与 QThread 的抉择

`QtConcurrent` 是建立在全局线程池（`QThreadPool`）之上的高级多线程框架。

| 特性维度 | QThread | QtConcurrent |
| :--- | :--- | :--- |
| **控制粒度** | **低层直接控制**（可精细控制生命周期、绑定特定 CPU 核心等） | **高层抽象**（无需管理线程创建与释放） |
| **运行开销** | 每次新建线程有明显的系统调用开销 | 自动复用全局**线程池**，无重复创建开销 |
| **适用任务** | **常驻后台**的长时监听任务、需建立特定事件循环的网络通信 | **计算密集型**、可独立拆分的短时并行计算任务 |
| **参数传递** | 依靠信号槽跨线程投递 | `QFuture` 机制或直接 Lambda 捕获 |

### QtConcurrent 极简运行示例：
```cpp
#include <QtConcurrent>
#include <QFuture>

void run_quick_task() {
    // 抛入线程池异步执行，无需手动 new 线程，无需手动析构
    QFuture<void> future = QtConcurrent::run([]() {
        do_heavy_calculation();
    });
}
```
