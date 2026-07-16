---
title: 背面剔除
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# 背面剔除


---



开发环境：



- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://examples.vtk.org/site/Cxx/Visualization/BackfaceCulling/)


---



>


**demo解决问题**： 启用了背面剔除的球体





#### 关于背面剔除：



-

背面剔除是图形学中的一种技术，用于提高渲染效率和减少不必要的计算。在三维图形渲染中，通常会根据物体的位置和相机的视角来确定哪些物体或面片会被显示在屏幕上。


-

背面剔除通过检测物体或面片的法线方向与相机视角的夹角来判断其是否朝向相机。如果一个物体或面片的法线方向指向相机外部，那么它就是背面，可以被剔除，不需要进行渲染和计算。这样可以节省计算资源和渲染时间。


-

背面剔除在虚拟现实、游戏开发和计算机动画等领域广泛应用。通过剔除不可见的背面物体或面片，可以提高渲染性能，使得场景更加流畅和真实。




[参考链接1](https://blog.csdn.net/u014003644/article/details/120764316)
 [参考链接2](https://blog.csdn.net/weixin_45666570/article/details/108942581)



---



prj name: BackfaceCulling



```
#include <vtkActor.h>
#include <vtkNamedColors.h>
#include <vtkNew.h>
#include <vtkPolyDataMapper.h>
#include <vtkProperty.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>
#include <vtkRenderer.h>
#include <vtkSphereSource.h>

int main(int, char*[])
{
  vtkNew<vtkNamedColors> colors;

  // Sphere
  vtkNew<vtkSphereSource> sphereSource;
  sphereSource->Update();

  vtkNew<vtkPolyDataMapper> mapper;
  mapper->SetInputConnection(sphereSource->GetOutputPort());

  vtkNew<vtkActor> actor;
  actor->SetMapper(mapper);
  actor->GetProperty()->SetColor(colors->GetColor3d("Peacock").GetData());

  vtkNew<vtkProperty> backProperty;
  backProperty->SetColor(colors->GetColor3d("Gold").GetData());
  actor->SetBackfaceProperty(backProperty);

  // https://blog.csdn.net/u014003644/article/details/120764316
  // https://blog.csdn.net/weixin_45666570/article/details/108942581
  // Since back face culling is on, when you zoom into the sphere, you won't see
  // the gold colored backface.
  actor->GetProperty()->BackfaceCullingOn();

  // Visualize
  vtkNew<vtkRenderer> renderer;
  vtkNew<vtkRenderWindow> renderWindow;
  renderWindow->AddRenderer(renderer);
  renderWindow->SetWindowName("BackfaceCulling");

  vtkNew<vtkRenderWindowInteractor> renderWindowInteractor;
  renderWindowInteractor->SetRenderWindow(renderWindow);

  renderer->AddActor(actor);
  renderer->SetBackground(colors->GetColor3d("MistyRose").GetData());

  renderWindow->Render();
  renderWindowInteractor->Start();

  return EXIT_SUCCESS;
}

```
