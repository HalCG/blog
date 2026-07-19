---
title: vtkCardinalSpline类进行基本的插值操作
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# vtkCardinalSpline类进行基本的插值操作

---

开发环境：

- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://examples.vtk.org/site/Cxx/Utilities/CardinalSpline/)

---

>

**demo解决问题**：用VTK（可视化工具包）中的vtkCardinalSpline类进行基本的插值操作

#### 关键点：

- 代码创建了一个名为"Distances"的vtkFloatArray（浮点数数组），并向其添加了两个数值：100.0和300.0。
- 代码创建了一个vtkCardinalSpline实例，并关闭了其环形插值功能。然后，设置了左右两个点的二阶导数为0，以实现线性插值。
- 通过对distances数组中的数据进行处理，计算出了两个数值之间的长度，并根据长度将每个数值转换为一个t参数。然后，将这些点添加到了spline实例中。
- 代码在一个指定的间隔内对t参数进行遍历，并利用spline实例进行插值计算，并输出了结果。

---

prj name: CardinalSpline

```
#include <vtkCardinalSpline.h>
#include <vtkFloatArray.h>
#include <vtkNew.h>

int main(int, char*[])
{
  // Create a scalar array.  The array could be associated with the scalars of a
  // vtkDataSet
  vtkNew<vtkFloatArray> distances;
  distances->SetNumberOfComponents(1);
  distances->SetName("Distances");
  distances->InsertNextValue(100.0);
  distances->InsertNextValue(300.0);

  // Create a cardinal spline to show how to linearly interpolate between two
  // scalar values
  vtkNew<vtkCardinalSpline> spline;
  spline->ClosedOff();

  // Set the left and right second derivatives to 0 corresponding to linear
  // interpolation
  spline->SetLeftConstraint(2);
  spline->SetLeftValue(0);
  spline->SetRightConstraint(2);
  spline->SetRightValue(0);
  double* r = distances->GetRange();
  double xmin = r[0];
  double xmax = r[1];
  double length = xmax - xmin;
  for (vtkIdType i = 0; i < distances->GetNumberOfTuples(); ++i)
  {
    double x = distances->GetTuple1(i);
    double t = (x - xmin) / length;
    spline->AddPoint(t, x);
  }

  // Evaluate every 50 distance units along the line
  std::cout << "Spline interpolation:" << std::endl;
  double dt = .25;
  for (double t = dt; t <= 1. - dt; t += dt)
  {
    std::cout << "t: " << t << " value = " << spline->Evaluate(t) << std::endl;
  }

  return EXIT_SUCCESS;
}

```
