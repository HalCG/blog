# Qt 设计模式：代理模式

> 系列：[Qt / VTK 设计模式](../README.md) · Qt 08/11  
> 参考：Qt 6 [QSortFilterProxyModel](https://doc.qt.io/qt-6/qsortfilterproxymodel.html)、[QGraphicsProxyWidget](https://doc.qt.io/qt-6/qgraphicsproxywidget.html)

---

## 引子

源数据有 10000 行，你只想显示其中「状态=进行中」的 200 行，又不想改原始 Model——加一个 **代理 Model** 挡在中间即可。这是代理模式：**为对象提供替身，控制访问**。

---

## 要解决什么问题

直接改源 Model：

```cpp
// 过滤时删除行 → 破坏源数据，别的 View 也受影响
```

痛点：源数据被污染、多个视图无法各取所需、排序逻辑与存储耦合。

---

## GoF 代理结构

| 角色 | Qt 示例 |
|------|---------|
| Subject | 源 `QAbstractItemModel` |
| Proxy | `QSortFilterProxyModel` |
| Client | `QListView` |

---

## Qt 中的落点

### QSortFilterProxyModel

- 转发 `rowCount`、`data`、`index`
- 插入排序/过滤逻辑
- 源 Model 不变

```cpp
QSortFilterProxyModel proxy;
proxy.setSourceModel(sourceModel);
proxy.setFilterKeyColumn(1);
proxy.setFilterFixedString("Active");
view->setModel(&proxy);
```

### QGraphicsProxyWidget

在 `QGraphicsScene` 中嵌入 `QWidget`，代理处理坐标变换与事件转发。

### QNetworkProxy

网络层代理（HTTP/SOCKS），与结构型代理同名不同域。

---

## 底层逻辑

`QSortFilterProxyModel` 维护 **源索引 ↔ 代理索引** 映射：

- `mapFromSource` / `mapToSource`
- 过滤条件变化时 `invalidateFilter()` 触发重算
- 视图只与代理交互，代理再查源 Model

**本质**：在不修改 RealSubject 的前提下，增加一层控制逻辑。

---

## 代码示例

### 自定义过滤代理

```cpp
class StatusFilterProxy : public QSortFilterProxyModel {
protected:
  bool filterAcceptsRow(int row, const QModelIndex& parent) const override {
    QModelIndex idx = sourceModel()->index(row, 0, parent);
  return sourceModel()->data(idx, Qt::UserRole).toString() == "Active";
  }
};
```

### 排序

```cpp
proxy.setSortCaseSensitivity(Qt::CaseInsensitive);
proxy.sort(0, Qt::AscendingOrder);
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| 代理 vs 装饰 | 装饰增强职责；代理常控制访问、延迟加载 |
| 代理 vs 适配器 | 适配器改接口；代理接口与主体一致 |
| `QIdentityProxyModel` | 1:1 转发，用于重写部分 `data()` 行为 |

---

## 最佳实践与陷阱

1. **View 的 QModelIndex 属于代理 Model**，传给源 Model 前需 `mapToSource`
2. **源 Model 变更后** 代理自动收到信号，但复杂过滤注意性能
3. **不要对源和代理同时 setModel 到不同 View** 除非清楚映射
4. **正则过滤大数据集** 考虑 `setFilterRole` 与列索引
5. **单元测试可只测代理逻辑** 用 `QStandardItemModel` 作源

---

## 重点与注意

> **重点**：`QSortFilterProxyModel` 在**不修改源 Model** 的前提下做排序/过滤，是结构型代理的标准范例。  
> **重点**：View 拿到的 `QModelIndex` 属于**代理 Model**；要改源数据必须先 `mapToSource()`。  
> **注意**：代理（同一接口、控制访问）与装饰（增强职责）不同；`QIdentityProxyModel` 可只重写部分 `data()` 行为。  
> **注意**：过滤条件变化后记得 `invalidateFilter()`，否则大数据集可能显示陈旧结果。

---

## 小结

Qt 代理模式的旗舰是 **`QSortFilterProxyModel`**：隔离展示逻辑与数据存储。

**延伸阅读**

- 上一篇：[07 单例](07-singleton.md) · 下一篇：[09 享元](09-flyweight.md)
- 系列索引：[README](../README.md)
