---
title: 自定义vtkActor动画场景及事件
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# 自定义vtkActor动画场景及事件


---



开发环境：



- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)
- [参考代码](https://examples.vtk.org/site/Cxx/Animation/AnimateActors/)


---



>


**demo解决问题**：自定义vtkActor动画场景及事件





-

vtkAnimationScene表示动画的场景或设置，它由单个线索或其他场景组成，设置动画场景的开始时间，结束时间，添加监听事件类型`vtkCommand::AnimationCueTickEvent`。因为`scene->SetEndTime(20)`短于`cue1->SetEndTime(23);`，所以很明显看到动画最后第二十秒的时候，scene动画事件结束了，tick事件不起作用了，sphere没有平滑移动，最后变成了结束事件`vtkCommand::EndAnimationCueEvent`，sphere直接移动到了最终的位置


```
  scene->SetLoop(0);//Enable/Disable animation loop.
  scene->SetFrameRate(5);
  scene->SetStartTime(0);
  scene->SetEndTime(20);
  scene->AddObserver(vtkCommand::AnimationCueTickEvent, renWin.GetPointer(),
                     &vtkWindow::Render);

```

-

vtkAnimationCue表示随时间变化/动画的实体，设置开始事件、结束时间，并添加到动画场景中`AddCue`


```
  // Create an Animation Cue for each actor
  vtkNew<vtkAnimationCue> cue1;
  cue1->SetStartTime(5);
  cue1->SetEndTime(23);
  scene->AddCue(cue1);

  vtkNew<vtkAnimationCue> cue2;
  cue2->SetStartTime(1);
  cue2->SetEndTime(10);
  scene->AddCue(cue2);

```

-

ActorAnimator ：自定义根据时间（开始时间、结束时间、中间滴答时间）vtkActor变换，`添加对应时间到cue的观察者列表中`


```
  void AddObserversToCue(vtkAnimationCue* cue)
  {
    cue->AddObserver(vtkCommand::StartAnimationCueEvent, this,
                     &ActorAnimator::Start);
    cue->AddObserver(vtkCommand::EndAnimationCueEvent, this,
                     &ActorAnimator::End);
    cue->AddObserver(vtkCommand::AnimationCueTickEvent, this,
                     &ActorAnimator::Tick);
  }

```



---



prj name: AnimateActors



```
#include "AnimateActors.h"

#include <vtkAnimationCue.h>
#include <vtkAnimationScene.h>
#include <vtkCamera.h>
#include <vtkCommand.h>
#include <vtkConeSource.h>
#include <vtkLogger.h>
#include <vtkNamedColors.h>
#include <vtkNew.h>
#include <vtkPolyDataMapper.h>
#include <vtkProperty.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>
#include <vtkRenderer.h>
#include <vtkSphereSource.h>

int main(int argc, char* argv[])
{
  vtkLogger::Init(argc, argv);

  // Colors
  vtkNew<vtkNamedColors> colors;
  vtkColor3d coneColor = colors->GetColor3d("Tomato");
  vtkColor3d sphereColor = colors->GetColor3d("Banana");
  vtkColor3d backgroundColor = colors->GetColor3d("Peacock");

  // Create the graphics structure. The renderer renders into the
  // render window.
  vtkNew<vtkRenderWindowInteractor> iren;
  vtkNew<vtkRenderer> ren1;
  ren1->SetBackground(backgroundColor.GetData());

  vtkNew<vtkRenderWindow> renWin;
  iren->SetRenderWindow(renWin);
  renWin->AddRenderer(ren1);

  // Generate a sphere
  vtkNew<vtkSphereSource> sphereSource;
  sphereSource->SetPhiResolution(31);
  sphereSource->SetThetaResolution(31);

  vtkNew<vtkPolyDataMapper> sphereMapper;
  sphereMapper->SetInputConnection(sphereSource->GetOutputPort());
  vtkNew<vtkActor> sphere;
  sphere->SetMapper(sphereMapper);
  sphere->GetProperty()->SetDiffuseColor(sphereColor.GetData());
  sphere->GetProperty()->SetDiffuse(.7);
  sphere->GetProperty()->SetSpecular(.3);
  sphere->GetProperty()->SetSpecularPower(30.0);

  ren1->AddActor(sphere);

  // Generate a cone
  vtkNew<vtkConeSource> coneSource;
  coneSource->SetResolution(31);

  vtkNew<vtkPolyDataMapper> coneMapper;
  coneMapper->SetInputConnection(coneSource->GetOutputPort());
  // auto cone = vtkSmartPointer<vtkActor>::New();
  vtkNew<vtkActor> cone;
  cone->SetMapper(coneMapper);
  cone->GetProperty()->SetDiffuseColor(coneColor.GetData());

  ren1->AddActor(cone);

  // Create an Animation Scene
  vtkNew<vtkAnimationScene> scene;
  if (argc >= 2 && strcmp(argv[1], "-real") == 0)
  {
    vtkLogF(INFO, "real-time mode");
    scene->SetModeToRealTime();
  }
  else
  {
    vtkLogF(INFO, "sequence mode");
    scene->SetModeToSequence();
  }
  scene->SetLoop(0);
  scene->SetFrameRate(5);
  scene->SetStartTime(0);
  scene->SetEndTime(20);
  scene->AddObserver(vtkCommand::AnimationCueTickEvent, renWin.GetPointer(),
                     &vtkWindow::Render);

  // Create an Animation Cue for each actor
  vtkNew<vtkAnimationCue> cue1;
  cue1->SetStartTime(5);
  cue1->SetEndTime(23);
  scene->AddCue(cue1);

  vtkNew<vtkAnimationCue> cue2;
  cue2->SetStartTime(1);
  cue2->SetEndTime(10);
  scene->AddCue(cue2);

  // Create an ActorAnimator for each actor;
  ActorAnimator animateSphere;
  animateSphere.SetActor(sphere);
  animateSphere.AddObserversToCue(cue1);

  ActorAnimator animateCone;
  animateCone.SetEndPosition(vtkVector3d(-1, -1, -1));
  animateCone.SetActor(cone);
  animateCone.AddObserversToCue(cue2);

  renWin->SetWindowName("AnimateActors");

  renWin->Render();
  ren1->ResetCamera();
  ren1->GetActiveCamera()->Dolly(.5);
  ren1->ResetCameraClippingRange();

  // Create Cue observer.
  scene->Play();
  scene->Stop();

  iren->Start();
  return EXIT_SUCCESS;
}

```
