---
title: vtk创建颜色属性正方体
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# vtk创建颜色属性正方体

---

开发环境：

- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://examples.vtk.org/site/Cxx/GeometricObjects/Cube/)

---

>

**demo解决问题**： 创建点（vtkPoints）与单元（vtkCellArray）集合，组合成一个cube(vtkPolyData)，设置点集合默认得标量属性（color），显示为有颜色得正方体

![](https://i-blog.csdnimg.cn/blog_migrate/ae6d60cafdbf742f812edc644fa4d4df.png)

>

关键点 : 在VTK中，如果没有为数据数组设置特定的名称，将其默认用于颜色映射。当使用vtkPolyData->GetPointData()->SetScalars()方法将数据数组与点数据关联时，如果没有为数据数组设置名称，则VTK会假定该数据数组用于表示颜色信息，并将其用于颜色映射。因此，如果您没有为数据数组设置名称，VTK会默认将其用作颜色数据。但是，您可以随时通过为数据数组设置名称来明确指定其用途，例如温度、密度等，以便在可视化时正确解释和使用这些数据。

```
#include <vtkSmartPointer.h>
#include <vtkPolyData.h>
#include <vtkDoubleArray.h>

int main()
{
    // 创建一个 vtkPolyData 对象
    vtkSmartPointer<vtkPolyData> polyData = vtkSmartPointer<vtkPolyData>::New();

    // 创建一个包含标量数据的 vtkDoubleArray
    vtkSmartPointer<vtkDoubleArray> scalarData = vtkSmartPointer<vtkDoubleArray>::New();
    scalarData->SetName("ScalarValues");  // 设置数组的名称
    scalarData->SetNumberOfComponents(1);  // 设置数组的组件数
    scalarData->InsertNextValue(1.0);  // 添加标量数值

    // 将标量数据数组与点数据关联起来
    polyData->GetPointData()->SetScalars(scalarData);

    // 其他操作...

    return 0;
}

```

---

prj name: Cube

```
#include <vtkActor.h>
#include <vtkCamera.h>
#include <vtkCellArray.h>
#include <vtkFloatArray.h>
#include <vtkNamedColors.h>
#include <vtkNew.h>
#include <vtkPointData.h>
#include <vtkPoints.h>
#include <vtkPolyData.h>
#include <vtkPolyDataMapper.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>
#include <vtkRenderer.h>

#include <array>

int main(int, char*[])
{
  vtkNew<vtkNamedColors> colors;

  std::array<std::array<double, 3>, 8> pts = {{{{0, 0, 0}},
                                               {{1, 0, 0}},
                                               {{1, 1, 0}},
                                               {{0, 1, 0}},
                                               {{0, 0, 1}},
                                               {{1, 0, 1}},
                                               {{1, 1, 1}},
                                               {{0, 1, 1}}}};
  // The ordering of the corner points on each face.
  std::array<std::array<vtkIdType, 4>, 6> ordering = {{{{0, 3, 2, 1}},
                                                       {{4, 5, 6, 7}},
                                                       {{0, 1, 5, 4}},
                                                       {{1, 2, 6, 5}},
                                                       {{2, 3, 7, 6}},
                                                       {{3, 0, 4, 7}}}};

  // We'll create the building blocks of polydata including data attributes.
  vtkNew<vtkPolyData> cube;
  vtkNew<vtkPoints> points;
  vtkNew<vtkCellArray> polys;
  //在VTK中，如果没有为数据数组设置特定的名称，将其默认用于颜色映射。当使用vtkPolyData->GetPointData()->SetScalars()方法将数据数组与点数据关联时，如果没有为数据数组设置名称，则VTK会假定该数据数组用于表示颜色信息，并将其用于颜色映射。
  //因此，如果您没有为数据数组设置名称，VTK会默认将其用作颜色数据。但是，您可以随时通过为数据数组设置名称来明确指定其用途，例如温度、密度等，以便在可视化时正确解释和使用这些数据。
  vtkNew<vtkFloatArray> scalars;

  // Load the point, cell, and data attributes.
  for (auto i = 0ul; i < pts.size(); ++i)
  {
    points->InsertPoint(i, pts[i].data());
    scalars->InsertTuple1(i, i);
  }
  for (auto&& i : ordering)
  {
    polys->InsertNextCell(vtkIdType(i.size()), i.data());
  }

  // We now assign the pieces to the vtkPolyData.
  cube->SetPoints(points);
  cube->SetPolys(polys);
  cube->GetPointData()->SetScalars(scalars);

  // Now we'll look at it.
  vtkNew<vtkPolyDataMapper> cubeMapper;
  cubeMapper->SetInputData(cube);
  cubeMapper->SetScalarRange(cube->GetScalarRange());
  vtkNew<vtkActor> cubeActor;
  cubeActor->SetMapper(cubeMapper);

  // The usual rendering stuff.
  vtkNew<vtkCamera> camera;
  camera->SetPosition(1, 1, 1);
  camera->SetFocalPoint(0, 0, 0);

  vtkNew<vtkRenderer> renderer;
  vtkNew<vtkRenderWindow> renWin;
  renWin->AddRenderer(renderer);
  renWin->SetWindowName("Cube");

  vtkNew<vtkRenderWindowInteractor> iren;
  iren->SetRenderWindow(renWin);

  renderer->AddActor(cubeActor);
  renderer->SetActiveCamera(camera);
  renderer->ResetCamera();
  renderer->SetBackground(colors->GetColor3d("Cornsilk").GetData());

  renWin->SetSize(600, 600);

  // interact with data
  renWin->Render();
  iren->Start();

  return EXIT_SUCCESS;
}

```

