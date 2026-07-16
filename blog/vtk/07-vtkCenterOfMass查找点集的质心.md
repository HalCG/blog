---
title: vtkCenterOfMass查找点集的质心
description: ---    开发环境：      - Windows 11 家庭中文版  - Microsoft Visual Studio Community 2019  - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.r
---

# vtkCenterOfMass查找点集的质心


---



开发环境：





- Windows 11 家庭中文版

- Microsoft Visual Studio Community 2019

- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)

- [vtk-example](https://examples.vtk.org/site/Cxx/PolyData/CenterOfMass/)



---



>


**demo解决问题**：查找点集的质心。





```
Center of mass is 0.5 0.5 0

```


#### 关键点：





- vtkCenterOfMass 會找出 vtkPointSet（vtkPolyData 或 vtkUnstructuredGrid）的「質量中心」。用户可选择指定在计算中使用标量作为权重。如果 “UseScalarsAsWeights”（使用标量作为权重）选项处于关闭状态，则每个点在计算中的贡献相同。



```
  vtkNew<vtkCenterOfMass> centerOfMassFilter;
  centerOfMassFilter->SetInputData(polydata);
  centerOfMassFilter->SetUseScalarsAsWeights(false);
  centerOfMassFilter->Update(
```