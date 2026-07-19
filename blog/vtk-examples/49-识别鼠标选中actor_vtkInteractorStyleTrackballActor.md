---
title: 识别鼠标选中actor
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# 识别鼠标选中actor

---

开发环境：

- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)
- [参考代码](https://examples.vtk.org/site/Cxx/Interaction/SelectAnActor/)
- 目的：学习与总结

---

>

**demo解决问题**：通过自定义vtkInteractorStyle类中成员函数OnLeftButtonDown，判断鼠标当前选中的是哪个actor；同理可自定义鼠标右键、滚轮、键盘等事件
 **关键类**：vtkInteractorStyleTrackballActor允许用户与场景中彼此独立的对象进行交互（旋转、平移等）；根据实际应用场景有如下常见替换对象：

| 交互风格类 | 说明 |
| --- | --- |
| vtkInteractorStyleTrackballActor | 作用对象：actor; 形式：Trackball |
| vtkInteractorStyleTrackballCamera | 作用对象：Camera; 形式：Trackball |
| vtkInteractorStyleJoystickActor | 作用对象：actor; 形式：Joystick |
| vtkInteractorStyleJoystickCamera | 作用对象：Camera; 形式：Joystick |
| vtkInteractorStyleImage | 作用对象：vtkImageActor; 形式：绑定使相机的视图平面垂直于x-y平面 |
| … | … |

参考：[vtkInteractorStyle详细介绍](https://vtk.org/doc/nightly/html/classvtkInteractorStyle.html#details)

---

```
#include <vtkActor.h>
#include <vtkCamera.h>
#include <vtkCubeSource.h>
#include <vtkInteractorStyleTrackballActor.h>
#include <vtkNamedColors.h>
#include <vtkNew.h>
#include <vtkPolyDataMapper.h>
#include <vtkProperty.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>
#include <vtkRenderer.h>
#include <vtkSphereSource.h>

namespace {

// Handle mouse events.
class MouseInteractorStyle5 : public vtkInteractorStyleTrackballActor
{
public:
  static MouseInteractorStyle5* New();
  vtkTypeMacro(MouseInteractorStyle5, vtkInteractorStyleTrackballActor);

  virtual void OnLeftButtonDown() override
  {
    // Forward events.
    vtkInteractorStyleTrackballActor::OnLeftButtonDown();

    if (this->InteractionProp == this->Cube)
    {
      std::cout << "Picked cube." << std::endl;
    }
    else if (this->InteractionProp == this->Sphere)
    {
      std::cout << "Picked sphere." << std::endl;
    }
  }

  vtkActor* Cube;
  vtkActor* Sphere;
};

vtkStandardNewMacro(MouseInteractorStyle5);

} // namespace

int main(int, char*[])
{
  vtkNew<vtkNamedColors> colors;

  // Create a cube.
  vtkNew<vtkCubeSource> cubeSource;
  cubeSource->Update();

  vtkNew<vtkPolyDataMapper> cubeMapper;
  cubeMapper->SetInputConnection(cubeSource->GetOutputPort());

  vtkNew<vtkActor> cubeActor;
  cubeActor->SetMapper(cubeMapper);
  cubeActor->GetProperty()->SetColor(colors->GetColor3d("MistyRose").GetData());

  // Create a sphere.
  vtkNew<vtkSphereSource> sphereSource;
  sphereSource->SetCenter(2, 0, 0);
  sphereSource->Update();

  // Create a mapper.
  vtkNew<vtkPolyDataMapper> sphereMapper;
  sphereMapper->SetInputConnection(sphereSource->GetOutputPort());

  // Create an actor.
  vtkNew<vtkActor> sphereActor;
  sphereActor->SetMapper(sphereMapper);
  sphereActor->GetProperty()->SetColor(
      colors->GetColor3d("LightGoldenrodYellow").GetData());

  // A renderer and render window.
  vtkNew<vtkRenderer> renderer;
  vtkNew<vtkRenderWindow> renderWindow;
  renderWindow->AddRenderer(renderer);
  renderWindow->SetWindowName("SelectAnActor");

  // An interactor.
  vtkNew<vtkRenderWindowInteractor> renderWindowInteractor;
  renderWindowInteractor->SetRenderWindow(renderWindow);

  // Set the custom stype to use for interaction.
  vtkNew<MouseInteractorStyle5> style;
  style->SetDefaultRenderer(renderer);
  style->Cube = cubeActor;
  style->Sphere = sphereActor;

  renderWindowInteractor->SetInteractorStyle(style);

  renderer->AddActor(cubeActor);
  renderer->AddActor(sphereActor);
  renderer->SetBackground(colors->GetColor3d("SlateGray").GetData());
  renderer->ResetCamera();
  renderer->GetActiveCamera()->Zoom(0.9);

  // Render and interact.
  renderWindow->Render();
  renderWindowInteractor->Initialize();
  renderWindowInteractor->Start();

  return EXIT_SUCCESS;
}

```

