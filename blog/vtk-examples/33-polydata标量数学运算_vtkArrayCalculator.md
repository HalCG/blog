---
title: polydata标量数学运算
description: ---    开发环境：      - Windows 11 家庭中文版  - Microsoft Visual Studio Community 2019  - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.r
---

# polydata标量数学运算

---

开发环境：

- Windows 11 家庭中文版

- Microsoft Visual Studio Community 2019

- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)

- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)

- [参考代码](https://examples.vtk.org/site/Cxx/Utilities/ArrayCalculator/)

---

>

**demo解决问题**：关键类`vtkArrayCalculator`, 对polydata中集合单元数组坐标进行算数运算，通过具名数组（内部估计是用map实现）指定需要运算的对象、计算字符串（需要了解复杂字符串如何进行解析）、计算结果保存目标数组，个人觉得应用场景会比较少，可能更多的是直接loop进行数组计算赋值

- 首先在三维空间中创建一组 3 个点和一个名为 "orig "的双数组，其中包含三个值： 1.0、2.0 和 3.0。

- 设置 PolyData
 然后构建一个 vtkPolyData 对象来保存点及其相关数据。
 数组计算

- 代码会使用 vtkArrayCalculator 设置两个数组计算：
 第一个计算 (calc1) 将 "orig "数组中的每个值加 1。
 第二个计算 (calc2) 检查 "orig "数组中的每个值，如果值是 2，则赋值 1，否则保留原值。
 迭代和输出结果：

每次计算后，代码都会访问结果数组并遍历其值，然后将其输出到控制台。
 该程序主要演示了使用 VTK 对三维空间中与点相关的数据执行数组计算的过程。这些计算可用于各种目的，例如修改或从与 VTK 数据集中的点相关联的现有数组中导出新数据。

```
  vtkNew<vtkArrayCalculator> calc1;
  calc1->SetInputData(polydata);
  calc1->AddScalarArrayName("orig");
  calc1->SetFunction("orig+1");
  calc1->SetResultArrayName("orig");
  calc1->Update();

```

```
  vtkNew<vtkArrayCalculator> calc2;
  calc2->SetInputData(polydata);
  calc2->AddScalarArrayName("orig");
  calc2->SetFunction("if(orig=2,1,orig)"
```

