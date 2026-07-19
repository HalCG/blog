---
title: 如何优雅的打印多维数组vtkDenseArray
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# 如何优雅的打印多维数组vtkDenseArray

---

开发环境：

- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)
- [参考代码](https://examples.vtk.org/site/Cxx/Graphs//)

---

>

**demo解决问题**：通过vtkPrintMatrixFormat打印多维数组vtkDenseArray到标准输出；通过vtkAdjacencyMatrixToEdgeTable整理多维数组vtkDenseArray到表格并建立索引打印
 **关键类**：vtkPrintMatrixFormat、vtkAdjacencyMatrixToEdgeTable

---

prj name: AdjacencyMatrixToEdgeTable

```
/*
The first column is the column index of the item in the 'value' column.
The row index is given by the number of times we've previously seen the column
index. For some reason, zeros in the matrix are not reported in the table.

For example, the first row says that the value '30' is in column 2 of the matrix
(0-based indexing). Since we have not previously seen an item in column 2, it is
in row 0 of the matrix.

The fourth row says that the value '60' is also in column 2. We infer that '60'
is row 1 of the matrix because we have already seen one item (the '30') in
column 2.
*/

#include <vtkAdjacencyMatrixToEdgeTable.h>
#include <vtkArrayData.h>
#include <vtkArrayPrint.h>
#include <vtkDenseArray.h>
#include <vtkNew.h>
#include <vtkTable.h>

int main(int, char*[])
{
  vtkNew<vtkDenseArray<double>> array;

  array->Resize(3, 3);

  unsigned int counter{1};
  unsigned int scale{10};
  for (vtkIdType i = 0; i < array->GetExtents()[0].GetEnd(); i++)//获取0维的做大索引
  {
    for (vtkIdType j = 0; j < array->GetExtents()[1].GetEnd(); j++)//获取1维的做大索引
    {
      array->SetValue(i, j, counter * scale);
      counter++;
    }
  }

  vtkPrintMatrixFormat(std::cout, array.GetPointer());//打印到标准输出
  /*
	10 20 30
	40 50 60
	70 80 90
  */

  vtkNew<vtkArrayData> arrayData;
  arrayData->AddArray(array);

  vtkNew<vtkAdjacencyMatrixToEdgeTable> adjacencyMatrixToEdgeTable;
  adjacencyMatrixToEdgeTable->SetInputData(arrayData);
  adjacencyMatrixToEdgeTable->Update();

  adjacencyMatrixToEdgeTable->GetOutput()->Dump();
  /*
	+-----------------+------------------+
	|                 | value            |
	+-----------------+------------------+
	| 2               | 30               |
	| 1               | 20               |
	| 0               | 10               |
	| 2               | 60               |
	| 1               | 50               |
	| 0               | 40               |
	| 2               | 90               |
	| 1               | 80               |
	| 0               | 70               |
	+-----------------+------------------+
  */
  return EXIT_SUCCESS;
}

```
