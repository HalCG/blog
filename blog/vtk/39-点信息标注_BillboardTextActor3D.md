---
title: 点信息标注
description: ---    开发环境：      - Windows 11 家庭中文版  - Microsoft Visual Studio Community 2019  - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.r
---

# 点信息标注


---



开发环境：





- Windows 11 家庭中文版

- Microsoft Visual Studio Community 2019

- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)

- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)

- [参考代码](https://examples.vtk.org/site/Cxx/Visualization/BillboardTextActor3D/)



---



>


**demo解决问题**：点附近创建左边或其他信息，`且信息面板显示状态不受相机缩放、旋转影响`





使用vtkVectorText、vtkFollower自定义一个标注对象，效果与官方demo（vtkBillboardTextActor3D）基本一致，线性拉伸后可以避免一部分文字遮挡问题，贴出主要代码：



```
    // zoom
    renderer()->GetActiveCamera()->ParallelProjectionOn();
    double zoom = renderer->GetActiveCamera()->GetParallelScale() / 18;

	// text
	vtkNew<vtkVectorText> atext;
    atext->SetText("text");

    vtkSmartPointer<vtkLinearExtrusionFilter> linearExtrusionFilter =  vtkSmartPointer<vtkLinearExtrusionFilter>::New();
    linearExtrusionFilter->SetInputConnection(atext->GetOutputPort());
    linearExtrusionFilter->SetExtrusionType(VTK_NORMAL_EXTRUSION);
    linearExtrusionFilter->SetVector(0, 0, 1.0);
    linearExtrusionFilter->SetScaleFactor(2);

    vtkNew<vtkPolyDataMapper> textMapper;
    textMapper->SetInputConnection(linearExtrusionFilter->GetOutputPort());

    vtkNew<vtkFollower> textActor;
    textActor->SetMapper(textMapper);
    textActor->SetScale(zoom);
    textActor->AddPosition(postion);
    textActor->GetProperty()->SetColor(namedColors->GetColor3d("Red").GetData());
    textActor->SetCamera(renderer()->GetActiveCamera());

    // sphere
	vtkSmartPointer<vtkSphereSource> sphereSource = vtkSmartPointer<vtkSphereSource>::New();
	sphereSource->Update();

	vtkSmartPointer<vtkPolyDataMapper> sphereMapper = vtkSmartPointer<vtkPolyDataMap
```
