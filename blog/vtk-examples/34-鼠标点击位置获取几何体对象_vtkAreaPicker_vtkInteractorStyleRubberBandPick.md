---
title: 鼠标点击位置获取几何体对象
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# 鼠标点击位置获取几何体对象

---

开发环境：

- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)
- [参考代码](https://examples.vtk.org/site/Cxx/Picking/AreaPicking/)

---

>

**demo解决问题**：框选或者点选某一区域，并获取区域prop3D对象（红线内为有效区域，polydata组成的3d几何对象）
 ![](https://i-blog.csdnimg.cn/blog_migrate/fccff254bfe0ba4653840474d3be8859.png)

#### 1. vtkInteractorStyleRubberBandPick

```
  /*
    与TrackBallCamera类似，但是它可以选择橡皮筋选择矩形下面的道具。
        该交互器样式允许用户通过按下'r'并使用左鼠标按钮在渲染窗口中绘制矩形。
        当释放鼠标按钮时，附加的拾取器将在选择矩形中心的像素上操作。
        如果拾取器恰好是vtkAreaPicker，则它将在整个选择矩形上操作。
        当按下'p'键时，上述拾取操作在1x1矩形上发生。在其他方面，它的行为与其父类相同。
    另请参见
    vtkAreaPicker
  */
  // r使能或禁用区域框选，框选区域中pick有效区域
  // For vtkInteractorStyleRubberBandPick - use 'r' and left-mouse to draw a
  // selection box used to pick.
  //
  // p按下时，pick当前鼠标位置所在的区域
  // For vtkInteractorStyleTrackballCamera - use 'p' to pick at the current
  // mouse position.
  vtkNew<vtkInteractorStyleRubberBandPick> style;

```

#### 2. vtkAreaPicker

```
	vtkNew<vtkAreaPicker> areaPicker;
  	vtkNew<vtkCallbackCommand> pickCallback;
 	pickCallback->SetCallback(PickCallbackFunction);
  	areaPicker->AddObserver(vtkCommand::EndPickEvent, pickCallback);

```

---

prj name: AreaPicking

```
#include <vtkActor.h>
#include <vtkAreaPicker.h>
#include <vtkCallbackCommand.h>
#include <vtkCellArray.h>
#include <vtkInteractorStyleRubberBandPick.h>
#include <vtkInteractorStyleTrackball.h>
// #include <vtkInteractorStyleTrackballCamera.h>
#include <vtkNamedColors.h>
#include <vtkNew.h>
#include <vtkPoints.h>
#include <vtkPolyData.h>
#include <vtkPolyDataMapper.h>
#include <vtkProp3DCollection.h>
#include <vtkProperty.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>
#include <vtkRenderer.h>

namespace {
void PickCallbackFunction(vtkObject* caller, long unsigned int eventId,
                          void* clientData, void* callData);
}

int main(int, char*[])
{
  // Create a set of points.
  vtkNew<vtkPoints> points;
  vtkNew<vtkCellArray> vertices;
  vtkIdType pid[1];
  pid[0] = points->InsertNextPoint(1.0, 0.0, 0.0);
  vertices->InsertNextCell(1, pid);
  pid[0] = points->InsertNextPoint(0.0, 0.0, 0.0);
  vertices->InsertNextCell(1, pid);
  pid[0] = points->InsertNextPoint(0.0, 1.0, 0.0);
  vertices->InsertNextCell(1, pid);

  // Create a polydata
  vtkNew<vtkPolyData> polydata;
  polydata->SetPoints(points);
  polydata->SetVerts(vertices);

  // Visualize
  vtkNew<vtkPolyDataMapper> mapper;
  mapper->SetInputData(polydata);

  vtkNew<vtkNamedColors> colors;

  vtkNew<vtkActor> actor;
  actor->SetMapper(mapper);
  actor->GetProperty()->SetPointSize(8);                                //设置顶点的显示大小
  actor->GetProperty()->SetColor(colors->GetColor3d("Gold").GetData()); //设置顶点的显示颜色

  vtkNew<vtkRenderer> renderer;
  vtkNew<vtkRenderWindow> renderWindow;
  renderWindow->AddRenderer(renderer);
  renderWindow->SetWindowName("AreaPicking");

  vtkNew<vtkAreaPicker> areaPicker;

  vtkNew<vtkRenderWindowInteractor> renderWindowInteractor;
  renderWindowInteractor->SetRenderWindow(renderWindow);
  renderWindowInteractor->SetPicker(areaPicker);

  renderer->AddActor(actor);

  renderer->SetBackground(colors->GetColor3d("DarkSlateGray").GetData());

  renderWindow->Render();

  // r使能或禁用区域框选，框选区域中pick有效区域
  // For vtkInteractorStyleRubberBandPick - use 'r' and left-mouse to draw a
  // selection box used to pick.
  vtkNew<vtkInteractorStyleRubberBandPick> style;

  // p按下时，pick当前鼠标位置所在的区域
  // For vtkInteractorStyleTrackballCamera - use 'p' to pick at the current
  // mouse position.
  //  vtkNew<vtkInteractorStyleTrackballCamera> style;
  //    paraview
  style->SetCurrentRenderer(renderer);
  renderWindowInteractor->SetInteractorStyle(style);

  vtkNew<vtkCallbackCommand> pickCallback;
  pickCallback->SetCallback(PickCallbackFunction);

  areaPicker->AddObserver(vtkCommand::EndPickEvent, pickCallback);

  renderWindowInteractor->Start();

  return EXIT_SUCCESS;
}

namespace {
void PickCallbackFunction(vtkObject* caller,
                          long unsigned int vtkNotUsed(eventId),
                          void* vtkNotUsed(clientData),
                          void* vtkNotUsed(callData))
{
  std::cout << "Pick." << std::endl;
  vtkAreaPicker* areaPicker = static_cast<vtkAreaPicker*>(caller);
  vtkProp3DCollection* props = areaPicker->GetProp3Ds();
  props->InitTraversal();

  //遍历当权pick到那些区域（Prop3Ds）
  for (vtkIdType i = 0; i < props->GetNumberOfItems(); i++)
  {
    vtkProp3D* prop = props->GetNextProp3D();
    std::cout << "Picked prop: " << prop << std::endl;
  }
}
} // namespace

```

