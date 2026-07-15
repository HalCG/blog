# VTK 设计模式：工厂模式

> 系列：[Qt / VTK 设计模式](../README.md) · VTK 07/10  
> 参考：[vtkObjectFactory](https://vtk.org/doc/nightly/html/classvtkObjectFactory.html)、[vtkObject.h New() macro](https://vtk.org/doc/nightly/html/vtkObject_8h.html)

---

## 引子

VTK 里很少写 `new vtkXMLPolyDataReader`，而是 `vtkXMLPolyDataReader::New()`——而且同一类名可以被 **插件工厂** 替换成自定义实现。这是工厂模式 + 引用计数的 VTK 特色组合。

---

## 要解决什么问题

```cpp
if (format == "xml") reader = new vtkXMLPolyDataReader;
else if (format == "stl") reader = new vtkSTLReader;
```

痛点：调用方依赖所有具体类、难以在运行时替换实现（如 OEM 定制 Reader）。

---

## GoF 工厂结构

| 类型 | VTK 对应 |
|------|----------|
| 简单工厂 | `vtkClass::New()` |
| 工厂方法 | 各子类 `New()` |
| 注册式工厂 | `vtkObjectFactory::RegisterFactory` |

---

## VTK 中的落点

### New() 宏

```cpp
vtkXMLPolyDataReader* r = vtkXMLPolyDataReader::New();
// ...
r->Delete();  // 或 vtkSmartPointer
```

`New()` 内部调用 `vtkObjectFactory::CreateInstance("vtkXMLPolyDataReader")`，找不到则 `new vtkXMLPolyDataReader`。

### vtkObjectFactory 插件

OEM 可注册工厂，在 **不改调用代码** 的情况下返回子类实例——ParaView/定制 VTK 构建常用。

### 与智能指针

```cpp
vtkNew<vtkPolyData> pd;
vtkSmartPointer<vtkActor> actor = vtkSmartPointer<vtkActor>::New();
```

`vtkNew` 栈上自动 `Delete()`；`vtkSmartPointer` 引用计数。

---

## 底层逻辑

创建链（简化）：

```
vtkFoo::New()
  → vtkObjectFactory::CreateInstance("vtkFoo")
  → 遍历已注册 Factory
  → 若 override 存在则返回子类，否则 vtkFoo 默认构造
```

引用计数从 `New()` 返回时通常为 1，由调用方或智能指针管理。

---

## 代码示例

### 按扩展名选 Reader（应用层简单工厂）

```cpp
vtkAlgorithmOutput* createReader(const char* path) {
  std::string ext = vtksys::SystemTools::GetFilenameExtension(path);
  vtkSmartPointer<vtkAbstractPolyDataReader> reader;
  if (ext == ".stl") reader = vtkSmartPointer<vtkSTLReader>::New();
  else if (ext == ".vtp") reader = vtkSmartPointer<vtkXMLPolyDataReader>::New();
  else return nullptr;
  reader->SetFileName(path);
  return reader->GetOutputPort();
}
```

### 使用 vtkNew

```cpp
vtkNew<vtkSphereSource> sphere;
sphere->SetRadius(1.0);
sphere->Update();
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| `New()` vs `new` | 只有 `New()` 走工厂覆盖链 |
| Factory vs Pipeline | 工厂解决「创建谁」；管道解决「数据怎么流」 |
| `vtkSmartPointer` vs `vtkNew` | 所有权语义不同 |

---

## 最佳实践与陷阱

1. **优先 `vtkNew` / `vtkSmartPointer`**，少裸 `Delete()`
2. **插件工厂注册时机** 在 `main` 或 `vtkObjectFactory::SetAllEnableFlags`
3. **CreateInstance 返回 nullptr** 要检查
4. **跨 DLL 边界** 注意 VTK 全局工厂注册
5. **不要混用 `delete` 与 VTK 引用计数**

---

## 重点与注意

> **重点**：VTK 对象统一用 `ClassName::New()` 创建，内部可走 `vtkObjectFactory::CreateInstance` 支持**插件替换**。  
> **重点**：`New()` 返回时引用计数为 1，应配对 `Delete()` 或 `vtkSmartPointer` / `vtkNew`。  
> **注意**：`new vtkFoo` 与 `vtkFoo::New()` **不是一回事**——只有 `New()` 走工厂覆盖链。  
> **注意**：工厂解决「创建谁」；`DeepCopy` 解决「如何复制已有对象」——别与原型模式混谈。

---

## 小结

VTK 工厂模式以 **`::New()` + vtkObjectFactory** 为核心，支撑插件化替换与统一内存模型。

**延伸阅读**

- 上一篇：[06 装饰](06-decorator.md) · 下一篇：[08 原型](08-prototype.md)
- 系列索引：[README](../README.md)
