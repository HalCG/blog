# Qt 设计模式：工厂模式

> 系列：[Qt / VTK 设计模式](../README.md) · Qt 06/11  
> 参考：Qt 6 [QStyleFactory](https://doc.qt.io/qt-6/qstylefactory.html)、[Plugins](https://doc.qt.io/qt-6/plugins.html)

---

## 引子

`QStyleFactory::create("Fusion")` 一行代码拿到不同平台的样式实现——调用方不需要 `new QWindowsStyle` 还是 `new QFusionStyle`。这是工厂模式：**按条件创建对象，隐藏具体类型**。

---

## 要解决什么问题

```cpp
QStyle* s;
if (platform == "windows") s = new QWindowsStyle;
else if (platform == "mac") s = new QMacStyle;
```

痛点：创建逻辑散落、新增平台要改多处、链接依赖所有具体类。

---

## GoF 工厂结构

| 类型 | Qt 示例 |
|------|---------|
| 简单工厂 | `QStyleFactory::create(name)` |
| 工厂方法 | 各插件的 `createInstance()` |
| 抽象工厂 | 较少直接用；`QPlatformIntegration` 可类比 |

---

## Qt 中的落点

### QStyleFactory

```cpp
QStringList keys = QStyleFactory::keys();  // "windows", "fusion", ...
QApplication::setStyle(QStyleFactory::create("Fusion"));
```

内部根据字符串查找注册的样式工厂。

### 插件工厂（Q_PLUGIN_METADATA）

```cpp
class MyPlugin : public QObject, public MyInterface {
  Q_OBJECT
  Q_PLUGIN_METADATA(IID "com.example.MyInterface" FILE "myplugin.json")
  Q_INTERFACES(MyInterface)
};
```

`QPluginLoader` 加载 `.dll/.so`，`qobject_cast` 到接口。

### QFormBuilder / .ui

从 XML 动态 `setupUi`，按类名 `QPushButton`、`QLineEdit` 反射式创建——UI 工厂。

---

## 底层逻辑

`QStyleFactory` 使用 Qt 插件机制：

1. 编译期或运行期注册 `QStylePlugin`
2. `create(key)` 遍历插件实例
3. 返回 `QStyle*` 由调用方或 `QApplication` 持有

插件元数据由 **moc + JSON** 生成，避免硬编码类名。

---

## 代码示例

### 简单工厂封装

```cpp
std::unique_ptr<QIODevice> createDevice(const QString& kind) {
  if (kind == "file") return std::make_unique<QFile>();
  if (kind == "buffer") return std::make_unique<QBuffer>();
  return nullptr;
}
```

### 加载插件

```cpp
QPluginLoader loader("myplugin.dll");
QObject* plugin = loader.instance();
if (auto* iface = qobject_cast<MyInterface*>(plugin)) {
  iface->doWork();
}
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| 工厂 vs 单例 | 工厂每次可创建新实例；单例全局唯一 |
| `QObject::create` 不存在 | Qt 用 插件/moc/ui 加载器 代替通用反射工厂 |
| Builder | Builder 分步组装复杂对象；工厂一次返回产品 |

---

## 最佳实践与陷阱

1. **插件接口用纯虚接口 + Q_DECLARE_INTERFACE**
2. **检查 `loader.errorString()`** 加载失败时
3. **样式工厂返回的指针** 通常由 `QApplication::setStyle` 接管所有权
4. **避免在头文件 include 所有具体 Style** 减少编译依赖
5. **单元测试用注入工厂** 替代真实插件

---

## 重点与注意

> **重点**：`QStyleFactory::create(key)` 根据字符串返回具体 `QStyle`，调用方不依赖 `QWindowsStyle` 等子类头文件。  
> **重点**：插件工厂靠 `Q_PLUGIN_METADATA` + `QPluginLoader` 在**运行期**加载，是简单工厂的扩展。  
> **注意**：工厂（负责创建对象）与单例（保证全局唯一）解决的问题不同，不要混为一谈。  
> **注意**：`QFormBuilder` 按类名从 `.ui` 反射创建控件，本质也是工厂思想。

---

## 小结

Qt 工厂模式体现在 **QStyleFactory、插件体系、UI 加载器**，核心是延迟绑定具体类型。

**延伸阅读**

- 上一篇：[05 模板方法](05-template-method.md) · 下一篇：[07 单例](07-singleton.md)
- 系列索引：[README](../README.md)
