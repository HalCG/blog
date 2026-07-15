# Qt 设计模式：单例模式

> 系列：[Qt / VTK 设计模式](../README.md) · Qt 07/11  
> 参考：Qt 6 [QCoreApplication](https://doc.qt.io/qt-6/qcoreapplication.html)、[Q_GLOBAL_STATIC](https://doc.qt.io/qt-6/threads-modules.html#q-global-static)

---

## 引子

整个 GUI 程序只有一个 `QApplication` 实例，全局用 `QApplication::instance()` 访问——这是 Qt 里最有名的单例。

---

## 要解决什么问题

全局状态若散落：

```cpp
extern Settings g_settings;  // 多 cpp 定义冲突、初始化顺序不确定
```

单例承诺：**类型全局唯一 + 统一访问点**。

---

## GoF 单例结构

```cpp
class Singleton {
public:
  static Singleton& instance();
private:
  Singleton() = default;
  Singleton(const Singleton&) = delete;
};
```

---

## Qt 中的落点

| 单例 | 访问方式 |
|------|----------|
| `QCoreApplication` / `QApplication` | `QCoreApplication::instance()` |
| `QGuiApplication` | 同上（GUI 程序） |
| 模块级静态 | `Q_GLOBAL_STATIC(MyClass, staticInstance)` |

`QApplication` 在 `main()` 里构造时注册为全局实例；`instance()` 返回 `QCoreApplication*` 需向下转型为 `QApplication*`。

---

## 底层逻辑

### Q_GLOBAL_STATIC

Qt 推荐用于 **惰性、线程安全的函数局部静态替代**（尤其插件/库中）：

```cpp
Q_GLOBAL_STATIC(MyRegistry, registry)
// 使用：registry()->add(...)
```

内部使用原子指针 + 析构钩子，避免静态初始化顺序灾难。

### 为什么不鼓励手写 Meyers Singleton  everywhere

- 单元测试难替换
- 隐式全局依赖
- 与 Qt 对象树所有权哲学冲突

Qt 更倾向于：**显式传递 context** 或 **依赖注入**，单例仅用于真正的进程级资源（事件循环、剪贴板、样式等）。

---

## 代码示例

```cpp
int main(int argc, char* argv[]) {
  QApplication app(argc, argv);

  // 任何地方（有 QApplication 后）
  QWidget* w = QApplication::activeWindow();

  return app.exec();
}
```

### 可测试的「伪单例」替代

```cpp
class ISettings { public: virtual ~ISettings() = default; virtual QString path() const = 0; };

class AppContext {
public:
  static void setSettings(ISettings* s) { settings = s; }
  static ISettings* settings;
};
// 测试注入 MockSettings
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| `QApplication::instance()` vs 手写单例 | 前者由框架管理生命周期 |
| 单例 vs 静态全局变量 | 单例延迟初始化、可控制访问 |
| `QSingleton` 不存在 | 用 `Q_GLOBAL_STATIC` 或 DI |

---

## 最佳实践与陷阱

1. **GUI 程序不要多个 QApplication**
2. **在 `main` 栈上构造 QApplication**，不要 `new` 后不析构
3. **库代码避免单例**，用 `QObject` parent 传递上下文
4. **多线程访问单例** 仍需同步或使用线程局部替代
5. **插件中访问 `qApp`** 前确保应用已创建

---

## 重点与注意

> **重点**：`QApplication` 在 `main` 构造时注册为全局唯一实例，`QCoreApplication::instance()` 是进程级单例的典型。  
> **重点**：`Q_GLOBAL_STATIC` 提供**惰性初始化 + 线程安全**的模块级单例，比手写 Meyers Singleton 更适合库代码。  
> **注意**：单例方便但**难单元测试**；库层更推荐依赖注入或显式传递 `QObject` 上下文。  
> **注意**：GUI 程序只能有一个 `QApplication`；`QCoreApplication` 用于无 GUI 控制台程序。  
> **注意**：不要把「全局唯一」滥用成「到处 `::instance()`」——那会让隐藏依赖爆炸。

---

## 小结

Qt 单例最典型的是 **QApplication**；现代 Qt 更推荐 **Q_GLOBAL_STATIC + 接口注入** 平衡便利与可测试性。

**延伸阅读**

- 上一篇：[06 工厂](06-factory.md) · 下一篇：[08 代理](08-proxy.md)
- 系列索引：[README](../README.md)
