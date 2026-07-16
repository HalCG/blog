---
title: 多actor实体组合并统一应用变换
description: ---    开发环境：      - Windows 11 家庭中文版  - Microsoft Visual Studio Community 2019  - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.r
---

# 多actor实体组合并统一应用变换


---



开发环境：





- Windows 11 家庭中文版

- Microsoft Visual Studio Community 2019

- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)

- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)

- [参考代码](https://examples.vtk.org/site/Cxx/Interaction/Assembly/)



---



>


**demo解决问题**：创建了一个球体和立方体的三维可视化，将它们组合成一个装配体，应用变换，调整不透明度，并使用 VTK 显示场景。
 ![](https://i-blog.csdnimg.cn/blog_migrate/0ab13eee69677228760346b3f43f6ab7.png)





#### 关键流程：





-

组装： 使用 `vtkAssembly` 将球体和立方体组合成一个`装配体`，使它们被视为一个单独的实体。



-

变换 对整个装配体应用变换 (`vtkTransform`)，将其平移到三维空间中的新位置。



-

获取actor集合`assembly->GetActors(collection);`, 改变actor不透明度





#### 关键代码：



```
  // Combine the sphere and cube into an assembly.
  /*
    创建 vtkProp3D 的层次结构（可转换道具）
    vtkAssembly 是一个将 vtkProp3Ds、其子类和其他程序集组合成树状层次结构的对象。vtkProp3Ds 和程序集可以通过只转换层次结构中的根程序集来一起转换。
    vtkAssembly 对象可以用来代替 vtkProp3D，因为它是 vtkProp3D 的子类。区别在于，vtkAssembly 会维护一个构成装配体的 vtkProp3D 实例（其 "部件"）列表。然后，任何转换（即缩放、旋转、平移）父装配体的操作都会转换其所有部件。请注意，这个过程是递归的：您可以创建由任意深度的装配体和/或 vtkProp3D 组成的组。
  */
  vtkNew<vtkAssembly> assembly;
  assembly->AddPart(sphereActor);
  assembly->AddPart(cubeActor);

  // Apply a transform to the whole assembly.
  vtkNew<vtkTransform> transform;
  transform->PostMultiply(); // This is the key line.
  transform->Translate(5.0, 0, 0);

  assembly->SetUserTransform(transform);

  // Extract each actor from the assembly and change its opacity.
  vtkNew<vtkPropCollection> collection;
  //遍历assembly
  assembly->GetActors(collection);
  collection->InitTraversal();
  for (vtkIdType i = 0
```
