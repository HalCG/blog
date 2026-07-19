---
title: VTK 读取、预处理、处理和可视化医学图像数据的过程
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# VTK 读取、预处理、处理和可视化医学图像数据的过程

---

开发环境：

- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://examples.vtk.org/site/Cxx/ImageProcessing/Attenuation/)

---

>

**demo解决问题**： VTK 读取、预处理、处理和可视化医学图像数据的过程

#### 图像读取和预处理：

- 程序使用 VTK 的图像阅读器`vtkImageReader2Factory`类读取作为命令行参数指定的输入图像文件。
 程序会对输入图像数据进行类型转换`vtkImageCast`，将标量类型转换为 double 类型，以便进一步处理。
- 对图像数据应用高斯平滑滤波器`vtkImageGaussianSmooth`，以减少噪音并创建更平滑的表示。

#### 图像处理：

- 定义隐式球形函数`vtkSphere`并对其进行采样`vtkSampleFunction`(`m2->SetImplicitFunction(m1);`)，以在图像数据中创建感兴趣的球形区域。
- 然后对采样球进行缩放`vtkImageShiftScale`(`m3->SetInputConnection(m2->GetOutputPort());`此处输入时上一步中的感兴趣输出)，并使用乘法对原始图像数据进行数学运算`vtkImageMathematics`，从而有效地应用遮罩。

#### 可视化：

- 程序使用 VTK 的图像演员类`vtkImageActor`为原始图像和滤波图像设置演员。
- 程序还定义了视口，用于在渲染窗口中显示原始图像和滤波图像。
- 程序还创建了两个独立的呈现器，用于在呈现窗口中并排显示原始图像和滤波图像。
- 然后，程序初始化呈现窗口，设置交互样式，并显示图像供用户交互。

**以上演示了在一个应用程序中使用 VTK 读取、预处理、处理和可视化医学图像数据的过程。**

---

prj name: AttachAttributes

```
#include <vtkImageActor.h>
#include <vtkImageCast.h>
#include <vtkImageGaussianSmooth.h>
#include <vtkImageMapper3D.h>
#include <vtkImageMathematics.h>
#include <vtkImageProperty.h>
#include <vtkImageReader2.h>
#include <vtkImageReader2Factory.h>
#include <vtkImageShiftScale.h>
#include <vtkInteractorStyleImage.h>
#include <vtkNamedColors.h>
#include <vtkNew.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>
#include <vtkRenderer.h>
#include <vtkSampleFunction.h>
#include <vtkSphere.h>

/*
这张核磁共振成像图显示了传感器位置可能导致的衰减。
通过除以人工确定的衰减曲线，可以去除伪影。该直方图显示了伪影如何以标量值簇的形式隐藏信息。
*/
int main(int argc, char* argv[])
{

  // Verify input arguments.
  if (argc != 2)
  {
    std::cout << "Usage: " << argv[0]
              << " Filename e.g. AttenuationArtifact.pgm" << std::endl;
    return EXIT_FAILURE;
  }

  /*
  vtkImageReader2Factory： 该类用于在给定文件路径名的情况下创建 vtkImageReader2 对象。
  它会在所有可用的阅读器上调用 CanReadFile，直到其中一个返回 true。
  可用的阅读器列表来自三个地方。
  在该类的 InitializeReaders 函数中，内置的 VTK 类会被添加到列表中，用户可以调用 RegisterReader，或者用户可以创建一个具有 CreateObject 方法的 vtkObjectFactory，该方法会在给定字符串 "vtkImageReaderObject "时返回一个新的 vtkImageReader2 子类。
  这样，应用程序就可以通过插件 dll 或调用 RegisterReader 来扩展新的阅读器。
  当然，vtk 发行版中的所有阅读器都会自动可用。
  */
  // Read the image
  vtkNew<vtkImageReader2Factory> readerFactory;
  vtkSmartPointer<vtkImageReader2> reader;
  reader.TakeReference(readerFactory->CreateImageReader2(argv[1]));
  reader->SetFileName(argv[1]);

  //vtkImageCast 过滤器会转换输入类型以匹配图像处理管道中的输出类型。
  //如果输入已具有正确的类型，则该过滤器不会执行任何操作。要指定 "CastTo "类型，请使用 "SetOutputScalarType "方法。
  vtkNew<vtkImageCast> cast;
  cast->SetInputConnection(reader->GetOutputPort());
  cast->SetOutputScalarTypeToDouble();

  // Get rid of discrete scalars.
  vtkNew<vtkImageGaussianSmooth> smooth;
  smooth->SetInputConnection(cast->GetOutputPort());
  smooth->SetStandardDeviations(0.8, 0.8, 0);

  vtkNew<vtkSphere> m1;
  m1->SetCenter(310, 130, 0);
  m1->SetRadius(0);

  vtkNew<vtkSampleFunction> m2;
  m2->SetImplicitFunction(m1);
  m2->SetModelBounds(0, 264, 0, 264, 0, 1);
  m2->SetSampleDimensions(264, 264, 1);

  //使用vtkImageShiftScale可以对像素进行平移（添加一个常量值）和缩放（乘以一个标量）。
  //作为一种便利，这个类允许你设置输出标量类型，类似于vtkImageCast。这是因为平移缩放操作经常会转换数据类型。
  vtkNew<vtkImageShiftScale> m3;
  m3->SetInputConnection(m2->GetOutputPort());
  m3->SetScale(0.000095);

  //https://blog.csdn.net/fandq1223/article/details/53185464
  vtkNew<vtkImageMathematics> div;
  div->SetInputConnection(0, smooth->GetOutputPort());
  div->SetInputConnection(1, m3->GetOutputPort());
  div->SetOperationToMultiply();

  // Create actors.
  vtkNew<vtkNamedColors> colors;

  double colorWindow = 256.0;
  double colorLevel = 127.5;
  vtkNew<vtkImageActor> originalActor;
  originalActor->GetMapper()->SetInputConnection(cast->GetOutputPort());
  originalActor->GetProperty()->SetColorWindow(colorWindow);
  originalActor->GetProperty()->SetColorLevel(colorLevel);

  vtkNew<vtkImageActor> filteredActor;
  filteredActor->GetMapper()->SetInputConnection(div->GetOutputPort());

  // Define viewport ranges.
  // (xmin, ymin, xmax, ymax)
  double originalViewport[4] = {0.0, 0.0, 0.5, 1.0};
  double filteredViewport[4] = {0.5, 0.0, 1.0, 1.0};

  // Setup renderers.
  vtkNew<vtkRenderer> originalRenderer;
  originalRenderer->SetViewport(originalViewport);
  originalRenderer->AddActor(originalActor);
  originalRenderer->ResetCamera();
  originalRenderer->SetBackground(colors->GetColor3d("SlateGray").GetData());

  vtkNew<vtkRenderer> filteredRenderer;
  filteredRenderer->SetViewport(filteredViewport);
  filteredRenderer->AddActor(filteredActor);
  filteredRenderer->ResetCamera();
  filteredRenderer->SetBackground(
      colors->GetColor3d("LightSlateGray").GetData());

  vtkNew<vtkRenderWindow> renderWindow;
  renderWindow->SetSize(600, 300);
  renderWindow->AddRenderer(originalRenderer);
  renderWindow->AddRenderer(filteredRenderer);
  renderWindow->SetWindowName("Attenuation");

  vtkNew<vtkRenderWindowInteractor> renderWindowInteractor;
  vtkNew<vtkInteractorStyleImage> style;

  renderWindowInteractor->SetInteractorStyle(style);

  renderWindowInteractor->SetRenderWindow(renderWindow);
  renderWindow->Render();
  renderWindowInteractor->Initialize();

  renderWindowInteractor->Start();

  return EXIT_SUCCESS;
}

```

