---
title: 从 polydata 中获取数组 及 vtkDoubleArray、vtkIntArray互转
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# 从 polydata 中获取数组 及 vtkDoubleArray、vtkIntArray互转

---

开发环境：

- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://examples.vtk.org/site/Cxx/PolyData/Casting/)

---

>

**demo解决问题**：示范冲polydata中获取命名数组，并转换数组数据类型

#### 关键点：

- 从 polydata 中获取数组，我们必须使用 SafeDownCast 转换为我们想要的类型。

```
  // Get the distances from the polydata.
  vtkDoubleArray* array = dynamic_cast<vtkDoubleArray*>(
      polydata->GetPointData()->GetArray("Distances"));

```

- vtkDoubleArray->vtkIntArray

```
 // Cast the double distances to ints.
  vtkDoubleArray* doubleDistances = dynamic_cast<vtkDoubleArray*>(
      polydata->GetPointData()->GetArray("Distances"));
  vtkIntArray* intDistances = dynamic_cast<vtkIntArray*>

```

---

prj name: Casting

```
#include <vtkDoubleArray.h>
#include <vtkIntArray.h>
#include <vtkNew.h>
#include <vtkPointData.h>
#include <vtkPoints.h>
#include <vtkPolyData.h>

int main(int, char*[])
{
  // Create points.
  vtkNew<vtkPoints> points;

  unsigned int numberOfPoints = 3;
  points->InsertNextPoint(0.0, 0.0, 0.0);
  points->InsertNextPoint(1.0, 0.0, 0.0);
  points->InsertNextPoint(0.0, 1.0, 0.0);

  // Add the points to a polydata
  vtkNew<vtkPolyData> polydata;
  polydata->SetPoints(points);

  // Add distances to each point
  vtkNew<vtkDoubleArray> distances;
  distances->SetNumberOfComponents(1);
  distances->SetName("Distances");

  distances->InsertNextValue(1.1);
  distances->InsertNextValue(2.2);
  distances->InsertNextValue(3.3);

  polydata->GetPointData()->AddArray(distances);

  // Get the distances from the polydata.
  vtkDoubleArray* array = dynamic_cast<vtkDoubleArray*>(
      polydata->GetPointData()->GetArray("Distances"));

  if (array)
  {
    for (unsigned int i = 0; i < numberOfPoints; i++)
    {
      double dist;
      dist = array->GetValue(i);
      std::cout << "Distance: " << dist << std::endl;
    }
  }

  // Cast the double distances to ints.
  vtkDoubleArray* doubleDistances = dynamic_cast<vtkDoubleArray*>(
      polydata->GetPointData()->GetArray("Distances"));
  vtkIntArray* intDistances = dynamic_cast<vtkIntArray*>(doubleDistances);

  if (intDistances)
  {
    for (unsigned int i = 0; i < numberOfPoints; i++)
    {
      int dist;
      dist = intDistances->GetValue(i);
      std::cout << "Distance: " << dist << std::endl;
    }
  }
  else
  {
    std::cout << "invalid cast." << std::endl;
  }

  return EXIT_SUCCESS;
}

```

