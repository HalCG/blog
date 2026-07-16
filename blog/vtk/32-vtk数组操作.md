---
title: VTK开发示例：数组操作与数据处理
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# VTK开发示例：数组操作与数据处理


---



开发环境：



- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)


---



>


**demo解决问题**：vtk数组操作





-

ArrayLookup：获取指定值vtkIdType 索引或索引集合


```
distances->LookupValue(15);
//或者
vtkNew<vtkIdList> idList;//vtkIdList
distances->LookupValue(15, idList);

```

-

ArrayRange: vtk数组最大最小值获取


```
    vtkNew<vtkFloatArray> distances;
    double range[2];
    distances->GetRange(range);

    vtkNew<vtkIntArray> ints;
    int valuesRange[2];
    ints->GetValueRange(valuesRange); // Note this is not GetRange()!

```

-

ArrayToTable: 数组打印table形式可视化


-

ArrayWriter: 数组值保存到文件




---



prj name: ArrayCalculator



```
#include <vtkFloatArray.h>
#include <vtkIdList.h>
#include <vtkNew.h>

/*
result: 1
found at:
1 2 4
*/
int main(int, char*[])
{
  vtkNew<vtkFloatArray> distances;
  distances->SetNumberOfComponents(1);
  distances->SetName("Distances");//SetName

  distances->InsertNextValue(5);
  distances->InsertNextValue(15);
  distances->InsertNextValue(15);
  distances->InsertNextValue(25);
  distances->InsertNextValue(15);

  // Get first location
  vtkIdType result = distances->LookupValue(15);
  std::cout << "result: " << result << std::endl;

  // Get all locations
  vtkNew<vtkIdList> idList;//vtkIdList
  distances->LookupValue(15, idList);
  std::cout << "found at: " << std::endl;
  for (vtkIdType i = 0; i < idList->GetNumberOfIds(); i++)//GetNumberOfIds
  {
    std::cout << idList->GetId(i) << " ";
  }

  return EXIT_SUCCESS;
}

```


prj name: ArrayRange



```
#include <vtkFloatArray.h>
#include <vtkIntArray.h>
#include <vtkNew.h>

/*
range = 5 25
valuesRange = 5 25
valuesRange = -50 25
valuesRange = -50 25
*/
int main(int, char*[])
{
  /////////// Floats ///////////
  {
    vtkNew<vtkFloatArray> distances;
    distances->SetNumberOfComponents(1);
    distances->SetName("Distances");

    distances->InsertNextValue(5);
    distances->InsertNextValue(15);
    distances->InsertNextValue(25);

    // Get min and max
    double range[2];
    distances->GetRange(range);
    std::cout << "range = " << range[0] << " " << range[1] << std::endl;
  }

  /////////////// Ints //////////////
  {
    vtkNew<vtkIntArray> ints;
    ints->SetNumberOfComponents(1);
    ints->SetName("Ints");

    ints->InsertNextValue(5);
    ints->InsertNextValue(15);
    ints->InsertNextValue(25);

    // Get min and max
    int valuesRange[2];
    ints->GetValueRange(valuesRange); // Note this is not GetRange()!
    std::cout << "valuesRange = " << valuesRange[0] << " " << valuesRange[1]
              << std::endl;
  }

  /////////// Range with negative values ///////////
  {
    vtkNew<vtkIntArray> ints;
    ints->SetNumberOfComponents(1);
    ints->SetName("Ints");

    ints->InsertNextValue(-50);
    ints->InsertNextValue(15);
    ints->InsertNextValue(25);

    // Get min and max
    int valuesRange[2];
    ints->GetValueRange(valuesRange); // Note this is not GetRange()!
    std::cout << "valuesRange = " << valuesRange[0] << " " << valuesRange[1]
              << std::endl;
  }

  /////////// Magnitude range ///////////
  {
    vtkNew<vtkIntArray> ints;
    ints->SetNumberOfComponents(1);
    ints->SetName("Ints");

    ints->InsertNextValue(-50);
    ints->InsertNextValue(15);
    ints->InsertNextValue(25);

    // Get min and max
    int valuesRange[2];
    ints->GetValueRange(valuesRange, -1);
    std::cout << "valuesRange = " << valuesRange[0] << " " << valuesRange[1]
              << std::endl;
  }
  return EXIT_SUCCESS;
}

```


prj name: ArrayToTable



```
#include <vtkArrayData.h>
#include <vtkArrayToTable.h>
#include <vtkDenseArray.h>
#include <vtkNew.h>
#include <vtkTable.h>
/*
There are 2
There are 4
+-----------------+-----------------+-----------------+------------------+
| 0               | 1               | 2               | 3                |
+-----------------+-----------------+-----------------+------------------+
| 0               | 1               | 2               | 3                |
| 1               | 2               | 3               | 4                |
+-----------------+-----------------+-----------------+------------------+
*/
int main(int, char*[])
{
  vtkNew<vtkDenseArray<int>> array;
  array->Resize(2, 4);

  // set values
  std::cout << "There are " << array->GetExtents()[0].GetEnd() << std::endl;
  std::cout << "There are " << array->GetExtents()[1].GetEnd() << std::endl;

  for (vtkIdType i = 0; i < array->GetExtents()[0].GetEnd(); i++)
  {
    for (vtkIdType j = 0; j < array->GetExtents()[1].GetEnd(); j++)
    {
      array->SetValue(i, j, i + j);
    }
  }

  vtkNew<vtkArrayData> arrayData;
  arrayData->AddArray(array);

  vtkNew<vtkArrayToTable> arrayToTable;
  arrayToTable->SetInputData(arrayData);
  arrayToTable->Update();

  auto table = arrayToTable->GetOutput();
  table->Dump();

  return EXIT_SUCCESS;
}

```


prj name: ArrayWriter



```
#include <vtkArrayData.h>
#include <vtkArrayWriter.h>
#include <vtkDenseArray.h>
#include <vtkNew.h>

int main(int, char*[])
{
  vtkNew<vtkDenseArray<double>> array;
  array->Resize(1, 3);
  array->SetValue(0, 0, 1.0);
  array->SetValue(0, 1, 2.0);
  array->SetValue(0, 2, 3.0);
  {
    // Method 1
    vtkNew<vtkArrayWriter> writer;
    vtkNew<vtkArrayData> arrayData;
    arrayData->AddArray(array);
    writer->SetInputData(arrayData);
    vtkStdString file1 = "Test1.txt";
    writer->Write(file1);
  }
  {
    vtkStdString file2 = "Test2.txt";
    // Method 2
    vtkNew<vtkArrayWriter> writer;
    writer->Write(array, file2);
  }

  return EXIT_SUCCESS;
}

```