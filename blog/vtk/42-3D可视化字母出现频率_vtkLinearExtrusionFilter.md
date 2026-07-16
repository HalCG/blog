---
title: 3D可视化字母出现频率
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# 3D可视化字母出现频率


---



开发环境：



- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)
- [参考代码](https://examples.vtk.org/site/Cxx/Visualization/AlphaFrequency/)
- 目的：学习与总结


---



>


**demo解决问题**：统计输入文本中字母出现的频率，不区分大小写，使用3D可是化方式进行显示，频率高的字母z方向同比例进行拉伸；运行需要跟一个参数：文本文件路径





>


**关键类**：vtkLinearExtrusionFilter、vtkVectorText





**知识点**



- 线形拉伸参数设置：


```
    extrude[i]->SetInputConnection(letters[i]->GetOutputPort());
    //#define VTK_VECTOR_EXTRUSION 1    //向量拉伸，与setVector有关
    //#define VTK_NORMAL_EXTRUSION 2    //法向拉伸，这里与VTK_VECTOR_EXTRUSION一致，都是z方向
    //#define VTK_POINT_EXTRUSION 3     //点平面拉伸，可以理解为2d平面效果
    extrude[i]->SetExtrusionType(VTK_NORMAL_EXTRUSION);
    extrude[i]->SetVector(0, 0, 1.0);                                       //打开z方向向量拉伸/挤压
    extrude[i]->SetScaleFactor((double)freq[i] / maxFreq * 2.50);           //计算出现频率作为缩放系数

```


![](https://i-blog.csdnimg.cn/blog_migrate/3716f33499b3b16b85d225e71afde4de.png)



![](https://i-blog.csdnimg.cn/blog_migrate/51d472d512d3bdba089772055d0739c0.png)
 2. vtkVectorText： [vtk3D文本](https://blog.csdn.net/minmindianzi/article/details/106418754)
 3. 相机参数设置：



```
  //重点掌握：灵活配置参数
  //https://blog.csdn.net/liushao1031177/article/details/116903698
  ren->ResetCamera();
  ren->SetBackground(colors->GetColor3d("Silver").GetData());
  ren->GetActiveCamera()->Elevation(30.0);  //使用焦点作为旋转中心，围绕投影方向的负片和向上视图矢量的叉积旋转相机。 结果是场景的垂直旋转。
  ren->GetActiveCamera()->Azimuth(-30.0);   //围绕以焦点为中心的向上视图矢量旋转相机。请注意，向上查看矢量是通过 SetViewUp 设置的任何矢量，不一定垂直于投影方向。 结果是相机的水平旋转。
  ren->GetActiveCamera()->Dolly(1.25);      //将相机与焦点的距离除以给定的Dolly值。 使用大于 1 的值向焦点推入，使用小于 1 的值推移远离焦点
  ren->ResetCameraClippingRange();          //根据可见actor的边界重置摄像机剪裁范围。这样可以确保没有props被切断

```


---



prj name: AlphaFrequency



```
//
// Create bar charts of frequency of letters.//创建字母频率的条形图。
//
#include <vtkActor.h>
#include <vtkCamera.h>
#include <vtkLinearExtrusionFilter.h>
#include <vtkNamedColors.h>
#include <vtkNew.h>
#include <vtkPolyDataMapper.h>
#include <vtkProperty.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>
#include <vtkRenderer.h>
#include <vtkVectorText.h>

#include <vector>

int main(int argc, char* argv[])
{
  vtkNew<vtkNamedColors> colors;

  std::vector<vtkSmartPointer<vtkVectorText>> letters;              //渲染三维文本
  std::vector<vtkSmartPointer<vtkLinearExtrusionFilter>> extrude;   //数据对象进行线性过滤
  std::vector<vtkSmartPointer<vtkPolyDataMapper>> mappers;
  std::vector<vtkSmartPointer<vtkPolyDataMapper>> mappers;
  std::vector<vtkSmartPointer<vtkActor>> actors;

  char filename[512];
  char text[2];
  static char alphabet[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  int i, j, freq[26], maxFreq;
  float x, y;
  FILE* fPtr;
  int c;

  //
  // count the letters
  //
  if ((argc == 1) || ((argc == 2) && !(strcmp("-S", argv[1]))))
  {
    cerr << "Please provide filename: " << argv[0] << " filename\n";
    strcpy(filename, "./Makefile");
    cerr << "Using the file " << filename << " as input\n";
  }
  else
  {
    strcpy(filename, argv[1]);
  }

  //读取MakeFile文件
  if ((fPtr = fopen(filename, "r")) == NULL)
  {
    cerr << "Cannot open file: " << filename << "\n";
    exit(1);
  }

  //统计MakeFile文件中字母出现的频率
  for (i = 0; i < 26; i++) freq[i] = 0;
  while ((c = fgetc(fPtr)) != EOF)
  {
    if (isalpha(c))
    {
      c = tolower(c);
      freq[c - 97]++;//索引为c - 97的字母频率加1
    }
  }

  //找到出现频率最大的 maxFreq
  for (maxFreq = 0, i = 0; i < 26; i++)
    if (freq[i] > maxFreq)
      maxFreq = freq[i];

  //
  // graphics stuff
  //
  vtkNew<vtkRenderer> ren;
  vtkNew<vtkRenderWindow> renWin;
  renWin->AddRenderer(ren);
  vtkNew<vtkRenderWindowInteractor> iren;
  iren->SetRenderWindow(renWin);
  //
  // Setup letters
  //
  text[1] = '\0';
  for (i = 0; i < 26; i++)
  {
    // data
    text[0] = alphabet[i];
    letters.push_back(vtkSmartPointer<vtkVectorText>::New());
    letters[i]->SetText(text);

    // filter
    extrude.push_back(vtkSmartPointer<vtkLinearExtrusionFilter>::New());    //线形拉伸过滤器
    extrude[i]->SetInputConnection(letters[i]->GetOutputPort());
    //#define VTK_VECTOR_EXTRUSION 1    //向量拉伸，与setVector有关
    //#define VTK_NORMAL_EXTRUSION 2    //法向拉伸，这里与VTK_VECTOR_EXTRUSION一致，都是z方向
    //#define VTK_POINT_EXTRUSION 3     //点平面拉伸，可以理解为2d平面效果
    extrude[i]->SetExtrusionType(VTK_VECTOR_EXTRUSION);
    extrude[i]->SetVector(0, 0, 1.0);                                       //打开z方向向量拉伸/挤压
    extrude[i]->SetScaleFactor((double)freq[i] / maxFreq * 2.50);           //计算出现频率作为缩放系数

    // mapper
    mappers.push_back(vtkSmartPointer<vtkPolyDataMapper>::New());
    mappers[i]->SetInputConnection(extrude[i]->GetOutputPort());
    mappers[i]->ScalarVisibilityOff();

    // actor
    actors.push_back(vtkSmartPointer<vtkActor>::New());
    actors[i]->SetMapper(mappers[i]);
    actors[i]->GetProperty()->SetColor(colors->GetColor3d("Peacock").GetData());
    if (freq[i] <= 0)//没有出现过的字母就不显示
    {
      actors[i]->VisibilityOff();
    }
    ren->AddActor(actors[i]);
  }
  //
  // Position actors
  //
  for (y = 0.0, j = 0; j < 2; j++, y += (-3.0))     //2行
  {
    for (x = 0.0, i = 0; i < 13; i++, x += 1.5)     //13列
    {
      actors[j * 13 + i]->SetPosition(x, y, 0.0);   //x表示横向，间距1.5；y表示纵向，间距3
    }
  }

  //重点掌握：灵活配置参数
  //https://blog.csdn.net/liushao1031177/article/details/116903698
  ren->ResetCamera();
  ren->SetBackground(colors->GetColor3d("Silver").GetData());
  ren->GetActiveCamera()->Elevation(30.0);  //使用焦点作为旋转中心，围绕投影方向的负片和向上视图矢量的叉积旋转相机。 结果是场景的垂直旋转。
  ren->GetActiveCamera()->Azimuth(-30.0);   //围绕以焦点为中心的向上视图矢量旋转相机。请注意，向上查看矢量是通过 SetViewUp 设置的任何矢量，不一定垂直于投影方向。 结果是相机的水平旋转。
  ren->GetActiveCamera()->Dolly(1.25);      //将相机与焦点的距离除以给定的Dolly值。 使用大于 1 的值向焦点推入，使用小于 1 的值推移远离焦点
  ren->ResetCameraClippingRange();          //根据可见actor的边界重置摄像机剪裁范围。这样可以确保没有props被切断

  renWin->SetSize(640, 480);
  renWin->SetWindowName("AlphaFrequency");

  // interact with data
  renWin->Render();
  iren->Start();

  return EXIT_SUCCESS;
}

```
