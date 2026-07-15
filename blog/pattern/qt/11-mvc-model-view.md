# Qt 设计模式：MVC 与 Model/View 架构

> 系列：[Qt / VTK 设计模式](../README.md) · Qt 11/11  
> 参考：Qt 6 [Model/View Programming](https://doc.qt.io/qt-6/model-view-programming.html)、[QML Data Models](https://doc.qt.io/qt-6/qtquick-modelviewsdata-modelview.html)

---

## 引子

表格要显示数据库里十万行，但屏幕只能显示二十行——如果把所有单元格控件都 `new` 出来，内存和创建时间都受不了。Qt Model/View **把数据、展示、交互拆开**，View 只向 Model 要「当前可见行」的数据。

---

## 要解决什么问题

```cpp
for (int r = 0; r < 100000; ++r)
  table->setItem(r, 0, new QTableWidgetItem(data[r]));
```

痛点：内存 O(n)、数据与 UI 耦合、无法多 View 共享同一数据。

---

## MVC 结构

| 角色 | Qt Widgets | Qt Quick |
|------|------------|----------|
| Model | `QAbstractItemModel` | `QAbstractListModel` 等 |
| View | `QTableView`、`QListView` | `ListView`、`TableView` |
| Controller | 选型/编辑策略、`QItemSelectionModel` | QML 中的 delegate + 绑定 |

严格 MVC 里 Controller 处理输入；Qt 常称 **Model/View**，把 delegate 当编辑与绘制策略。

---

## Qt 中的落点

### QAbstractItemModel API

```cpp
int rowCount(const QModelIndex& parent) const override;
QVariant data(const QModelIndex& index, int role) const override;
bool setData(...);  // 可编辑时
```

角色 `Qt::DisplayRole`、`Qt::EditRole`、`Qt::UserRole` 等同 index 不同「面」。

### View 询问 Model

`QTableView` 滚动时只查询可见区域的 `data()`，实现 **虚拟化**。

### QML

```qml
ListView {
  model: myListModel
  delegate: Text { text: display }
}
```

数据来自 C++ `QAbstractListModel` 或 QML `ListModel`。

---

## 底层逻辑

1. Model 数据变化 → `dataChanged` / `beginInsertRows` 等信号
2. View 收到信号 → 重算可见区 → `data()` 取文本/图标
3. `QItemSelectionModel` 管理选中状态，介于 View 与业务之间

**本质**：View 不持有全部数据副本，只缓存布局与可见项。

---

## 代码示例

### 最小 Table Model

```cpp
class StringListModel : public QAbstractTableModel {
  QStringList m_rows;
public:
  int rowCount(const QModelIndex&) const override { return m_rows.size(); }
  int columnCount(const QModelIndex&) const override { return 1; }
  QVariant data(const QModelIndex& idx, int role) const override {
    if (role == Qt::DisplayRole) return m_rows.at(idx.row());
    return {};
  }
  void append(const QString& s) {
    beginInsertRows({}, m_rows.size(), m_rows.size());
    m_rows.append(s);
    endInsertRows();
  }
};

StringListModel model;
QTableView view;
view.setModel(&model);
model.append("Hello");
```

### 与代理组合

```cpp
QSortFilterProxyModel proxy;
proxy.setSourceModel(&model);
view.setModel(&proxy);
```

见 [08 代理模式](08-proxy.md)。

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| Model/View vs MVC | Qt 常弱 Controller，用 delegate/selection 代替 |
| `QTableWidget` vs `QTableView`+Model | 前者一体化简单；后者可扩展 |
| VTK 无内置 MVC | ParaView 自建 Representation/View 层 |

---

## 最佳实践与陷阱

1. **修改 Model 必须用 begin/end 信号**，否则 View 不同步
2. **`QModelIndex` 短期有效**，结构变化后失效
3. **大数据勿在 `data()` 里做 IO**，应预加载或缓存
4. **多线程 Model** 需小心，常用 `moveToThread` + 信号更新
5. **QML 与 C++ Model** 注册类型或暴露指针要管理生命周期

---

## 重点与注意

> **重点**：Model/View 分离让 View **虚拟化**显示——百万行数据只需对可见区域调用 `data()`。  
> **重点**：修改 Model 必须用 `beginInsertRows` / `dataChanged` / `beginResetModel` 等信号，View 才会同步。  
> **注意**：`QModelIndex` 在 Model 结构变化后**失效**，别长期缓存。  
> **注意**：`QTableWidget` 是「一体化」简便类；`QTableView` + `QAbstractItemModel` 才是可扩展 MVC。  
> **注意**：严格 MVC 的 Controller 在 Qt 里常由 **delegate + `QItemSelectionModel` + 业务类** 共同承担。

---

## 小结

Qt MVC/MV 的核心是 **`QAbstractItemModel` 协议 + 虚拟化 View**，把数据规模与 UI 控件数量解耦。

**延伸阅读**

- [Model/View Programming](https://doc.qt.io/qt-6/model-view-programming.html)
- 上一篇：[10 中介者](10-mediator.md)
- 系列索引：[README](../README.md)
