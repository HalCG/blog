# Qt 设计模式：策略模式

> 系列：[Qt / VTK 设计模式](../README.md) · Qt 04/11  
> 参考：Qt 6 [QIODevice](https://doc.qt.io/qt-6/qiodevice.html)、[QAbstractItemModel](https://doc.qt.io/qt-6/qabstractitemmodel.html)、[QStyle](https://doc.qt.io/qt-6/qstyle.html)

---

## 引子

同一段 `readAll()` 代码，可以从文件读、从网络读、从内存缓冲区读——接口不变，后端随便换。这就是策略模式：**一族算法，可互换**。

---

## 要解决什么问题

```cpp
if (type == File) readFromFile();
else if (type == Network) readFromSocket();
// 每加一种来源改一处
```

痛点：违反开闭原则、测试难 mock、调用方与实现细节耦合。

---

## GoF 策略结构

| 角色 | Qt 示例 |
|------|---------|
| Strategy 接口 | `QIODevice::read()` |
| ConcreteStrategy | `QFile`、`QTcpSocket`、`QBuffer` |
| Context | 持有 `QIODevice*` 的业务代码 |

---

## Qt 中的典型落点

### 1. QIODevice 家族

```cpp
void processIO(QIODevice* dev) {
  while (!dev->atEnd())
    handle(dev->readLine());
}

QFile file("data.txt");
processIO(&file);

QBuffer mem;
mem.setData(raw);
processIO(&mem);
```

### 2. QAbstractItemModel

`QListView` 不关心数据来自 SQL、XML 还是内存：

```cpp
view->setModel(sqlModel);   // 或 standardItemModel、customModel
```

### 3. QStyle

`QApplication::setStyle("Fusion")` 切换绘制策略，控件代码不变。

---

## 底层逻辑

策略模式在 Qt 中常体现为 **抽象基类 + 虚函数多态**：

- `QIODevice` 定义 `readData` / `writeData` 保护虚函数
- 子类实现具体 IO
- 公有 `read()` 封装缓冲、位置、错误状态

Model/View 中，`QAbstractItemModel` 定义 `data()`、`rowCount()` 等接口，View 只调接口。

---

## 代码示例

### 自定义排序策略（函数对象）

```cpp
using SortStrategy = std::function<bool(int,int)>;
void sortList(QList<int>& list, SortStrategy cmp) {
  std::sort(list.begin(), list.end(), cmp);
}
sortList(nums, std::less<int>{});
sortList(nums, std::greater<int>{});
```

### 运行时切换 Model 策略

```cpp
QStackedModel* stack = ...;
if (useDatabase)
  view->setModel(dbModel);
else
  view->setModel(csvModel);
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| 策略 vs 状态 | 策略由客户端选择；状态模式随对象内部状态自动切换 |
| 策略 vs 桥接 | 桥接强调维度分离；策略强调算法替换 |
| `QPlugin` 加载 Style | 策略 + 工厂组合 |

---

## 最佳实践与陷阱

1. **依赖接口（`QIODevice*`）而非具体类**
2. **策略对象生命周期** 由 Context 管理清楚
3. **Model 策略切换后** 调用 `beginResetModel` / `endResetModel`
4. **避免在热路径频繁 new 策略对象**，可复用实例
5. **单元测试注入 `QBuffer` 替代 `QFile`**

---

## 重点与注意

> **重点**：策略模式的核心是 **「面向接口编程、运行期换实现」**；Qt 里 `QIODevice*`、`QAbstractItemModel*` 是最典型的 Strategy 接口。  
> **重点**：`QStyle`、`QAbstractItemModel` 族都是在**不改调用方代码**的前提下替换算法/数据源。  
> **注意**：策略（客户端主动选实现）与状态模式（对象内部自动切换行为）别混淆。  
> **注意**：策略常与工厂组合——`QStyleFactory::create("Fusion")` 先工厂创建，再作为策略注入 `QApplication`。

---

## 小结

Qt 策略模式无处不在：**IO、Model、Style** 都是「同一接口，多种实现」。

**延伸阅读**

- 上一篇：[03 命令](03-command-undo-action.md) · 下一篇：[05 模板方法](05-template-method.md)
- 系列索引：[README](../README.md)
