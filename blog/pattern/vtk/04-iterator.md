# VTK 设计模式：迭代器模式

> 系列：[Qt / VTK 设计模式](../README.md) · VTK 04/10  
> 参考：[vtkCollection](https://vtk.org/doc/nightly/html/classvtkCollection.html)、[vtkCellIterator](https://vtk.org/doc/nightly/html/classvtkCellIterator.html)

---

## 引子

场景里有几十个 `vtkActor`，网格里有几百万个 cell——你需要统一方式遍历，而不暴露内部数组实现。VTK 用 **迭代器** 和 **InitTraversal/GetNext** 惯用法封装访问。

---

## 要解决什么问题

```cpp
for (int i = 0; i < internalArray->size(); ++i)  // 依赖内部结构
```

痛点：内部表示变更破坏客户端、无法统一多种数据结构、难以支持惰性遍历。

---

## GoF 迭代器结构

| 角色 | VTK 对应 |
|------|----------|
| Iterator | `vtkCollectionIterator`、`vtkCellIterator` |
| Aggregate | `vtkCollection`、`vtkUnstructuredGrid` |
| 访问 | `InitTraversal` / `GetNextItem` |

---

## VTK 中的落点

### vtkCollection

```cpp
vtkCollection* props = renderer->GetViewProps();
props->InitTraversal();
while (vtkProp* p = props->GetNextProp())
  p->SetVisibility(true);
```

### vtkCellIterator（VTK 9+ 推荐）

统一访问各类网格的 cell，无需 `switch(cellType)`：

```cpp
auto it = grid->NewCellIterator();
for (it->InitTraversal(); !it->IsDoneWithTraversal(); it->GoToNextCell()) {
  vtkIdList* ids = it->GetCellId();
  // ...
}
```

### 点/单元 ID 遍历

```cpp
for (vtkIdType i = 0; i < polyData->GetNumberOfPoints(); ++i)
  polyData->GetPoint(i, coords);
```

这是 **索引迭代**，简单直接，VTK 内部仍可能对大数据做 SOA 布局。

---

## 底层逻辑

`vtkCollection` 内部常是 `vtkObject**` 数组 + `NumberOfItems`：

- `InitTraversal` 重置索引
- `GetNextItemAsObject` 递增索引并返回

`vtkCellIterator` 是 **多态迭代器**：对不同 cell 类型提供统一 `GetCellType()`、`GetPointIds()`。

---

## 代码示例

```cpp
#include <vtkRenderer.h>
#include <vtkActorCollection.h>

void hideAllActors(vtkRenderer* ren) {
  vtkActorCollection* actors = ren->GetActors();
  actors->InitTraversal();
  while (vtkActor* a = actors->GetNextActor())
    a->SetVisibility(false);
}
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| 迭代器 vs Pipeline | 迭代器访问已有数据；Pipeline 生成数据 |
| `GetNumberOfCells()` 循环 vs `vtkCellIterator` | 后者对混合网格更安全、可扩展 |
| 范围 for | 现代 C++ 可包装迭代器，VTK 传统 API 仍常见 |

---

## 最佳实践与陷阱

1. **大网格优先 `vtkCellIterator`** 统一逻辑
2. **遍历时修改集合** 可能导致未定义行为，先收集再改
3. **注意 `vtkIdType` 与 `int` 范围**
4. **并行遍历** 用 `vtkSMPTools` 而非在 iterator 上硬并行
5. **GetNextItem 返回 nullptr** 表示结束

---

## 重点与注意

> **重点**：`vtkCollection::InitTraversal` + `GetNextItem` 是 VTK 传统迭代惯用法；`vtkCellIterator`（VTK 9+）统一访问各类网格 cell。  
> **重点**：迭代器模式把**内部存储结构**藏起来，客户端只依赖统一遍历接口。  
> **注意**：遍历集合时**修改集合**可能导致未定义行为，应先收集再改。  
> **注意**：迭代器（访问已有数据）与 Pipeline（计算生成数据）是不同层面的概念。

---

## 小结

VTK 迭代器模式体现在 **Collection 遍历 API** 与 **vtkCellIterator 统一网格访问**。

**延伸阅读**

- 上一篇：[03 管道](03-pipeline-filter.md) · 下一篇：[05 策略](05-strategy.md)
- 系列索引：[README](../README.md)
