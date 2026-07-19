---
title: VTKAngleWidget在Windows11VS中创建夹角测量控件教程
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# VTKAngleWidget在Windows11VS中创建夹角测量控件教程

---

开发环境：

- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)
- [参考代码](https://vtk.org/doc/nightly/html/classvtkAngleWidget.html)
- 目的：学习与总结

---

>

**demo解决问题**：renderWindow中创建一个夹角测量控件，通过三个点确定一个夹角

- 典型的控件类继承关系：vtkObject > vtkInteractorObsever > vtkAbstractWidget > vtkAngleWidget
- 交互对象设置：`angleWidget->SetInteractor(renderWindowInteractor);`
- 控件使能：`renderWindowInteractor->Start();`之前`angleWidget->On();`
- [vtkRenderWindow 与vtkRenderWindowInteractor详解](https://blog.csdn.net/qq_38446366/article/details/82787847)

![](https://i-blog.csdnimg.cn/blog_migrate/c086e48e2c600be1f13fbf8502ce6772.png)

---

prj name: AngleWidget

```
#include <vtkAngleWidget.h>
#include <vtkNamedColors.h>
#include <vtkNew.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>
#include <vtkRenderer.h>

int main(int, char*[])
{
  vtkNew<vtkNamedColors> colors;

  // A renderer and render window
  vtkNew<vtkRenderer> renderer;
  vtkNew<vtkRenderWindow> renderWindow;
  renderWindow->AddRenderer(renderer);
  renderWindow->SetWindowName("AngleWidget");

  // An interactor
  vtkNew<vtkRenderWindowInteractor> renderWindowInteractor;
  renderWindowInteractor->SetRenderWindow(renderWindow);

  vtkNew<vtkAngleWidget> angleWidget;
  angleWidget->SetInteractor(renderWindowInteractor);
  angleWidget->CreateDefaultRepresentation();

  // Render
  renderer->SetBackground(colors->GetColor3d("MidnightBlue").GetData());
  renderWindow->Render();
  renderWindowInteractor->Initialize();
  renderWindow->Render();
  angleWidget->On();
  renderWindowInteractor->Start();

  return EXIT_SUCCESS;
}

```
