---
title: 添加自定义信息
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# 添加自定义信息


---



开发环境：



- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://examples.vtk.org/site//Cxx/PolyData/AttachAttributes/)


---



>


**demo解决问题**：使用 VTK 库创建和操作双数组以及添加自定义信息（双矢量键）的过程`vtkInformation`
 参考链接：[vtkInformation](https://blog.csdn.net/shenziheng1/article/details/54986880)





---



prj name: AttachAttributes



```
/*extracted values are: 0.1, 0.2, 0.3*/
// vtk includes
#include <vtkDoubleArray.h>
#include <vtkInformation.h>
#include <vtkInformationDoubleVectorKey.h>
#include <vtkNew.h>

// std includes
#include <iostream>

int main(int, char*[])
{

  // create a 2-element array
  vtkNew<vtkDoubleArray> array;
  array->SetName("array");
  array->SetNumberOfComponents(1);  //函数指定了该数组中每个元组的大小。
  array->SetNumberOfTuples(2);      //函数指定了该数组中元组数量。
  array->SetValue(0, 1.);
  array->SetValue(1, 2.);

  // access the info (presently none stored)
  vtkInformation* info = array->GetInformation();

  // add one attribute, a double vector
  const char* name = "myKey";
  const char* location = "MyClass"; //
  const int length = 3;
  vtkInformationDoubleVectorKey* key =
      new vtkInformationDoubleVectorKey(name, location, length);
  double values[] = {0.1, 0.2, 0.3};
  info->Set(key, values[0], values[1], values[2]);

  // extract the key
  double* vals = info->Get(key);
  std::cout << "extracted values are: " << vals[0] << ", " << vals[1] << ", "
            << vals[2] << '\n';

  return EXIT_SUCCESS;
}

```
