---
title: VTK库在Windows11中的N维数组操作与vtkDenseArray详解,
description: ---    **开发环境**：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.r
---

# VTK库在Windows11中的N维数组操作与vtkDenseArray详解,

---

**开发环境**：

- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)
- [参考代码](https://examples.vtk.org/site/Cxx/Utilities/3DArray/)

---

>

**demo解决问题**：N维数组，类似于numpy; 主要感受下调用接口功能: GetExtents() getBegin() getEnd()
 参考：[vtkInteractorStyle详细介绍](https://vtk.org/doc/nightly/html/classvtkDenseArray.html#details)

---

```
#include <vtkDenseArray.h>
#include <vtkNew.h>

int main(int, char*[])
{
  vtkNew<vtkDenseArray<double>> array;

  array->Resize(5, 5);

  array->SetValue(4, 4, 5.0);

  std::cout << array->GetValue(4, 4) << std::endl;

  return EXIT_SUCCESS;
}

```

```
#include <vtkDenseArray.h>
#include <vtkNew.h>

int main(int, char*[])
{
  // Create an N-D array
  vtkNew<vtkDenseArray<double>> array;

  // Resize the array to 4x5x3
  array->Resize(4, 5, 3);

  // Set a value
  int i = 0;
  int j = 0;
  int k = 0;
  double value = 3.0;
  array->SetValue(i, j, k, value);

  // Get a value
  std::cout << array->GetValue(i, j, k) << std::endl;

  //Returns the extents (the number of dimensions and size along each dimension) of the array.
  // Get size (bounds) of whole array
  cout << array->GetExtents() << endl;//[0,4)x[0,5)x[0,3)

  // Get size (bounds) of array dimensions
  std::cout << array->GetExtents()[0] << std::endl;//[0, 4)
  std::cout << array->GetExtents()[1] << std::endl;//[0, 5)
  std::cout << array->GetExtents()[2] << std::endl;//[0, 3)

  // Get the bounds of the 0th dimension
  std::cout << array->GetExtents()[0].GetBegin() << std::endl;//0
  std::cout << array->GetExtents()[0].GetEnd() << std::endl;//4

  return EXIT_SUCCESS;
}

```
