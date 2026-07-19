---
title: vtk数据集的整合与附加
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# vtk数据集的整合与附加

---

开发环境：

- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)
- [参考代码](https://examples.vtk.org/site/Cxx/Filtering/AppendFilter/)

---

>

**demo解决问题**： 将一个或多个数据集附加到一个非结构网格中

`vtkAppendFilter` 是一个筛选器，用于将多个数据集之一追加到单个非结构化网格中。将提取并追加所有几何图形，但仅当所有数据集都具有可用的点属性时，才会提取和追加点属性（即标量、向量、法线、字段数据等）。（例如，如果一个数据集具有标量，而另一个数据集没有标量，则不会追加标量。

注意数据结构`vtkUnstructuredGrid`的应用[场景](https://blog.csdn.net/liushao1031177/article/details/120708061)

prj name: AppendFilter

```
#include <vtkActor.h>
#include <vtkAppendFilter.h>
#include <vtkDataSetMapper.h>
#include <vtkGlyph3DMapper.h>
#include <vtkNamedColors.h>
#include <vtkNew.h>
#include <vtkPointSource.h>
#include <vtkPoints.h>
#include <vtkPolyData.h>
#include <vtkProperty.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>
#include <vtkRenderer.h>
#include <vtkSmartPointer.h>
#include <vtkSphereSource.h>
#include <vtkUnstructuredGrid.h>

namespace {

/**
 * Convert points to glyphs.
 *
 * @param points - The points to glyph
 * @param scale - The scale, used to determine the size of the glyph
 * representing the point, expressed as a fraction of the largest side of the
 * bounding box surrounding the points. e.g. 0.05
 *
 * @return The actor.
 */
vtkSmartPointer<vtkActor> PointToGlyph(vtkPoints* points, double const& scale);

} // namespace

int main(int, char*[])
{
  // Create 5 points (vtkPolyData)
  vtkNew<vtkPointSource> pointSource;
  pointSource->SetNumberOfPoints(5);
  pointSource->Update();

  auto polydata = pointSource->GetOutput();

  std::cout << "There are " << polydata->GetNumberOfPoints()
            << " points in the polydata." << std::endl;

  // Create 2 points in a vtkUnstructuredGrid

  vtkNew<vtkPoints> points;
  points->InsertNextPoint(0, 0, 0);
  points->InsertNextPoint(0, 0, 1);

  vtkNew<vtkUnstructuredGrid> ug;
  ug->SetPoints(points);

  std::cout << "There are " << ug->GetNumberOfPoints()
            << " points in the unstructured grid." << std::endl;

  // Combine the two data sets
  vtkNew<vtkAppendFilter> appendFilter;
  appendFilter->AddInputData(polydata);
  appendFilter->AddInputData(ug);
  appendFilter->Update();

  auto combined = appendFilter->GetOutput();
  std::cout << "There are " << combined->GetNumberOfPoints()
            << " points combined." << std::endl;

  // Create a mapper and actor
  vtkNew<vtkNamedColors> colors;

  vtkNew<vtkDataSetMapper> mapper;
  mapper->SetInputConnection(appendFilter->GetOutputPort());

  vtkNew<vtkActor> actor;
  actor->SetMapper(mapper);

  // Map the points to spheres
  auto sphereActor = PointToGlyph(appendFilter->GetOutput()->GetPoints(), 0.05);
  sphereActor->GetProperty()->SetColor(colors->GetColor3d("Gold").GetData());

  // Create a renderer, render window, and interactor
  vtkNew<vtkRenderer> renderer;
  vtkNew<vtkRenderWindow> renderWindow;
  renderWindow->AddRenderer(renderer);
  vtkNew<vtkRenderWindowInteractor> renderWindowInteractor;
  renderWindowInteractor->SetRenderWindow(renderWindow);

  // Add the actor to the scene
  renderer->AddActor(actor);
  renderer->AddActor(sphereActor);
  renderer->SetBackground(colors->GetColor3d("RoyalBlue").GetData());

  // Render and interact
  renderWindow->SetWindowName("AppendFilter");
  renderWindow->Render();
  renderWindowInteractor->Start();

  return EXIT_SUCCESS;
}

namespace {

vtkSmartPointer<vtkActor> PointToGlyph(vtkPoints* points, double const& scale)
{
  auto bounds = points->GetBounds();
  double maxLen = 0;
  for (int i = 1; i < 3; ++i)
  {
    maxLen = std::max(bounds[i + 1] - bounds[i], maxLen);
  }

  vtkNew<vtkSphereSource> sphereSource;
  sphereSource->SetRadius(scale * maxLen);

  vtkNew<vtkPolyData> pd;
  pd->SetPoints(points);

  vtkNew<vtkGlyph3DMapper> mapper;
  mapper->SetInputData(pd);
  mapper->SetSourceConnection(sphereSource->GetOutputPort());
  mapper->ScalarVisibilityOff();
  mapper->ScalingOff();

  vtkNew<vtkActor> actor;
  actor->SetMapper(mapper);

  return actor;
}

} // namespace

```

