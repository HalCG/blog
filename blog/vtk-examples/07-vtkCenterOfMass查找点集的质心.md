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

```cpp
#include <vtkCenterOfMass.h>
#include <vtkDoubleArray.h>
#include <vtkNew.h>
#include <vtkPointData.h>
#include <vtkPoints.h>
#include <vtkPolyData.h>

#include <iostream>

int main(int, char*[])
{
  // 1. 创建点集数据
  vtkNew<vtkPoints> points;
  points->InsertNextPoint(0.0, 0.0, 0.0);
  points->InsertNextPoint(1.0, 0.0, 0.0);
  points->InsertNextPoint(0.0, 1.0, 0.0);
  points->InsertNextPoint(1.0, 1.0, 0.0);

  vtkNew<vtkPolyData> polydata;
  polydata->SetPoints(points);

  // 2. 实例化并配置 vtkCenterOfMass 过滤器
  vtkNew<vtkCenterOfMass> centerOfMassFilter;
  centerOfMassFilter->SetInputData(polydata);
  centerOfMassFilter->SetUseScalarsAsWeights(false); // 不使用标量作为权重，每个点贡献相同
  centerOfMassFilter->Update();

  // 3. 获取质心计算结果
  double center[3];
  centerOfMassFilter->GetCenter(center);

  std::cout << "Center of mass is " << center[0] << " " << center[1] << " "
            << center[2] << std::endl;

  return EXIT_SUCCESS;
}
```
