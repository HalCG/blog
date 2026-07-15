# VTK 设计模式：原型模式

> 系列：[Qt / VTK 设计模式](../README.md) · VTK 08/10  
> 参考：[vtkDataObject](https://vtk.org/doc/nightly/html/classvtkDataObject.html)、[vtkPolyData::DeepCopy](https://vtk.org/doc/nightly/html/classvtkPolyData.html)

---

## 引子

滤波器想「备份一份当前网格再改」，或者多线程各拿一份独立副本——VTK 用 `DeepCopy` / `ShallowCopy` 表达 **原型语义**：以现有对象为模板生成新状态，而不是从头 `New()` 再填点。

---

## 要解决什么问题

```cpp
vtkPolyData* b = vtkPolyData::New();
// 手动复制每个 points、cells、arrays... 易漏
```

痛点：复制逻辑复杂、易不一致、不知共享还是独立内存。

---

## GoF 原型结构

| 角色 | VTK 对应 |
|------|----------|
| Prototype | `vtkPolyData`、`vtkImageData` 等 |
| clone | `DeepCopy` / `ShallowCopy` |
| 客户端 | Filter、缓存、Undo 栈 |

VTK 没有统一 `virtual vtkObject* Clone()`，但 **数据对象族** 一致提供 Copy API。

---

## VTK 中的落点

### DeepCopy vs ShallowCopy

| 方法 | 行为 |
|------|------|
| `ShallowCopy` | 共享底层数组（引用计数），改一方可能影响另一方 |
| `DeepCopy` | 复制数组内容，完全独立 |

```cpp
vtkNew<vtkPolyData> copy;
copy->DeepCopy(original);
```

### vtkAlgorithm 输出作为原型

```cpp
filter->Update();
vtkPolyData* proto = filter->GetOutput();
backup->DeepCopy(proto);
```

### New() + Copy 组合

```cpp
vtkSmartPointer<vtkPolyData> a = vtkSmartPointer<vtkPolyData>::New();
a->DeepCopy(source);
```

---

## 底层逻辑

`vtkDataArray` 等支持共享后端存储：

- ShallowCopy 增加数组引用计数
- DeepCopy 分配新缓冲并 `memcpy` 或逐元素复制

`vtkFieldData`、`PointData`、`CellData` 在 Copy 时递归处理。

**MTime**：DeepCopy 后新对象 `Modified()`，参与 Pipeline 缓存判断。

---

## 代码示例

```cpp
#include <vtkPolyData.h>
#include <vtkSphereSource.h>

vtkNew<vtkSphereSource> src;
src->Update();

vtkNew<vtkPolyData> shallow;
shallow->ShallowCopy(src->GetOutput());  // 共享几何

vtkNew<vtkPolyData> deep;
deep->DeepCopy(src->GetOutput());        // 独立几何

// 修改 shallow 可能影响 src 输出；deep 安全
```

### Undo 快照（概念）

```cpp
class MeshSnapshot {
  vtkSmartPointer<vtkPolyData> m_state;
public:
  void save(vtkPolyData* cur) {
    m_state = vtkSmartPointer<vtkPolyData>::New();
    m_state->DeepCopy(cur);
  }
  void restore(vtkPolyData* cur) { cur->DeepCopy(m_state); }
};
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| DeepCopy vs Pipeline 分支 | 拷贝是快照；管道是动态计算 |
| ShallowCopy vs 指针赋值 | ShallowCopy 仍新建 vtkPolyData 外壳，共享数组 |
| 原型 vs 工厂 New() | New 创建空对象；Copy 从已有实例复制 |

---

## 最佳实践与陷阱

1. **要独立编辑必须 DeepCopy**
2. **大网格 DeepCopy 昂贵**，考虑只拷贝必要数组
3. **多线程** 各线程 DeepCopy 独立数据，勿共享写 ShallowCopy
4. **Copy 后检查 GetNumberOfPoints** 非 0
5. **ImageData 注意 spacing/origin** 一并复制

---

## 重点与注意

> **重点**：`DeepCopy` = 独立副本；`ShallowCopy` = **共享底层数组**（引用计数），改一方可能影响另一方。  
> **重点**：要独立编辑、多线程并行、Undo 快照，必须用 **DeepCopy**。  
> **注意**：VTK 没有统一 `Clone()` 虚函数，但数据对象族 API 一致，能说清 `DeepCopy` / `ShallowCopy` 语义即可。  
> **注意**：ShallowCopy 不是「拷贝指针」那么简单——外壳对象仍是新的，共享的是 `vtkDataArray` 内部缓冲。

---

## 小结

VTK 原型模式体现为 **数据对象的 DeepCopy/ShallowCopy**，是网格编辑、缓存、并行的基础操作。

**延伸阅读**

- 上一篇：[07 工厂](07-factory.md) · 下一篇：[09 组合](09-composite.md)
- 系列索引：[README](../README.md)
