---
title: 三维控件中定位一个点
description: ---    开发环境：      - Windows 11 家庭中文版  - Microsoft Visual Studio Community 2019  - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.r
---

# 三维控件中定位一个点

---

开发环境：

- Windows 11 家庭中文版

- Microsoft Visual Studio Community 2019

- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)

- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)

- [参考代码](https://examples.vtk.org/site/Cxx/Visualization/Arbitrary3DCursor/)

---

>

**demo解决问题**：允许用户使用三维光标在三维空间中定位一个点。关键类`vtkPointWidget `, 光标具有轮廓边界框、轴对齐十字准线和轴阴影（轮廓和阴影可以关闭）。(可以关闭轮廓和阴影）。vtkPointWidget 和其他 3D widget 一样，具有一个很好的特点，即它可以与当前的交互样式一起工作。也就是说，如果 vtkPointWidget 没有处理事件，那么所有其他已注册的观察者（包括交互样式）都有机会处理该事件。否则，vtkPointWidget 将终止处理它所处理的事件。

![](https://i-blog.csdnimg.cn/blog_migrate/3d20f23eaabf10e07a81a27042029ab8.png)

#### 主流程：（不看probe）

- 数据源1：构造一个网格化的sphereSource数据源

- 数据源2：point的位置使用cone符号化为圆锥体

- 数据源3：添加一个AddActor2D，固定在视口左下角

- 数据源4：构造3D控件pointWidget，并添加观察者myCallback，监控pointWidget交互事件

注意：point符号化的过程中，一开始是没有符号的，所以圆锥体一开始不显示，交互时间开始后设置了point的值，点背符号化后有了圆锥体，Execute中关键代码：

```
//获取定义该点的多边形数据（包括点）。单个点和一个顶点组成 vtkPolyData。
pointWidget->GetPolyData(this->PolyData);//给this->PolyData / point 赋值，在多个管道中间中途修改值，修改后update修改过的管道，render
this->PositionActor->SetInput(text.str().c_str());

```

glyph的输入我把probefilter删了，直接用point数据，也是可以相同效果的，目前没有明白为什么要加一个vtkProbeFilter，理解的帮解答下，谢谢啦！！！

#### 另一个需要重点关注的是需要区分以下接口

在VTK（Visualization Toolkit）中，`SetInputData`、`SetSourceData`、`SetInputConnection`和`SetSourceConnection`都是用于设置数据输入和连接的方法，但它们之间有一些区别。

- `SetInputData`：用于将数据对象作为输入设置给某个过滤器或算法。可以将数据对象直接传递给过滤器或算法进行处理。例如：

```
filter.SetInputData(data)

```

- `SetSourceData`：用于将数据对象作为源设置给某个过滤器或算法。通常在进行数据生成或初始化时使用。例如：

```
filter.SetSourceData(source)

```

- `SetInputConnection`：用于将数据连接设置给某个过滤器或算法。通过连接，可以将一个过滤器的输出作为另一个过滤器的输入。例如：

```
filter2.SetInputConnection(filter1.GetOutputPort())

```

- `SetSourceConnection`：用于将数据连接设置给某个过滤器或算法的源。通过连接，可以将一个过滤器的输出作为另一个过滤器的源。例如：

```
filter2.SetSourceConnection(filter1.GetOutputPort())

```

总结：

- `SetInputData`和`SetSourceData`用于直接设置数据对象作为输入或源。

- `SetInputConnection`和`SetSourceConnection`用于通过连接将一个过滤器的输出作为另一个过滤器的输入或源。

```
问：
vtk中 SetInputData SetSourceData SetInputConnection SetSourceConnection的区别是什么?
答：
1. 在VTK中，SetInputData和SetSourceData用于设置算法的输入数据和数据源的输入数据，而SetInputConnection和SetSourceConnection用于设置数据流管道中算法之间的输入连接和输出连接。
2. 具体来说，SetInputData和SetSourceData是直接将数据作为算法的输入，而SetInputConnection和SetSourceConnection是将算法之间的数据流连接起来，实现数据的传递和处理。SetInputData和SetInputConnection的区别是，前者将数据作为算法的输入，后者将算法作为输入连接到另一个算法的输出数据。SetSourceData和SetSourceConnection的区别也是类似的，前者将数据源作为算法的输入，后者将数据源作为输入连接到另一个算法的输出数据。
总之，SetInputData和SetSourceData是用于设置算法的输入数据和数据源的输入数据，而SetInputConnection和SetSourceConnection是用于设置算法之间的输入连接和输出连接。

```

```
  vtkNew<vtkProbeFilter> probe;
  //指定一个数据对象作为输入。请注意，此方法不会建立管道连接。使用 SetInputConnection() 来 建立管道连接。
  probe->SetInputData(point);//输入: 此时的point值为空，需要事件内根据鼠标位置进行赋值
  //指定将在输入点进行探测的数据集。
  //输入为输出提供几何图形（点和单元）、 而源点则通过探测（插值）生成标量、 矢量等。
  probe->SetSourceData(inputPolyData);//源:

```

[参考链接1](https://blog.csdn.net/liushao1031177/article/details/122860254)
 [参考链接2](https://blog.csdn.net/yuyangyg/article/details/78165570)
 [参考链接3](https://www.cnblogs.com/ankier/p/3166210.html)

```
  vtkNew<vtkGlyph3D> glyph;
  // glyph->SetInputConnection(probe->GetOutputPort());//？？？不理解
  glyph->SetInputData(point); //此处直接使用point也可以达到效果，但是为什么非要用vtkProbeFilter 没有想通
  glyph->SetSourceConnection(cone->GetOutputPort());

```

[参考链接1](https://blog.csdn.net/jigetage/article/details/86633156)
 [参考链接2](https://www.cnblogs.com/vaughnhuang/p/17584058.html)

---

prj name: Arbitrary3DCursor

```
#include <vtkActor.h>
#include <vtkCallbackCommand.h>
#include <vtkCommand.h>
#include <vtkC
```

