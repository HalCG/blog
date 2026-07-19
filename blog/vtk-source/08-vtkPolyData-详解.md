---
title: vtkPolyData 详解
description: 转载来源：[vtkPolyData 详解](https://blog.csdn.net/weixin_43160093/article/details/151396818)    #### 1 概述    vtkPolyData 是 VTK 中用于表示基于顶点的几何图形的基础数据结构。其继承关系如下
---

# vtkPolyData 详解

转载来源：[vtkPolyData 详解](https://blog.csdn.net/weixin_43160093/article/details/151396818)

#### 1 概述

vtkPolyData 是 VTK 中用于表示基于顶点的几何图形的基础数据结构。其继承关系如下：
 https://blog.csdn.net/weixin_43160093/article/details/151396818

```
vtkObject → vtkDataSet → vtkPointSet → vtkPolyData

```

这种继承体系表明 vtkPolyData 具备了处理几何与拓扑数据的完整能力。从源码角度分析，其类定义位于 `Common/DataModel/vtkPolyData.h` 中。

#### 2 核心数据结构解析

##### 2.1 几何数据：点集 (Points)

点集由 vtkPoints 对象管理，存储所有顶点的三维几何坐标。从源码角度看：

```
// vtkPolyData.h 中的关键定义
class VTKCOMMONDATAMODEL_EXPORT vtkPolyData : public vtkPointSet
{
public:
  // ...
  vtkPoints* GetPoints() override;
  void SetPoints(vtkPoints* points);
};

```

点集存储的是纯粹的几何信息，即顶点的三维坐标值。每个点有唯一的点ID，用于被拓扑结构引用。

##### 2.2 拓扑数据：单元组织

vtkPolyData 通过四个独立的 vtkCellArray 管理拓扑连接关系：

```
// vtkPolyData.h 中的单元数组声明
private:
  vtkCellArray* Verts;    // 顶点单元
  vtkCellArray* Lines;    // 线单元
  vtkCellArray* Polys;    // 多边形单元
  vtkCellArray* Strips;   // 三角带单元

```

2.2.1 点集 vs 顶点单元：关键区别

这是容易混淆的概念，需要从源码层面明确区分：

**点集 (Points)**：存储几何坐标

```
// 创建点集：仅存储坐标数据
vtkNew<vtkPoints> points;
points->InsertNextPoint(0.0, 0.0, 0.0);  // 点ID: 0
points->InsertNextPoint(1.0, 0.0, 0.0);  // 点ID: 1
points->InsertNextPoint(0.5, 1.0, 0.0);  // 点ID: 2
// 此时只有几何数据，无拓扑信息

```

**顶点单元 (Verts)**：定义点的拓扑组织

```
// 创建顶点单元：定义如何将点组织为顶点
vtkNew<vtkCellArray> verts;
// 将点ID=0组织为一个独立顶点
verts->InsertNextCell(1);  // 单元包含1个点
verts->InsertCellPoint(0); // 该点为点ID=0

// 将点ID=1和点ID=2分别组织为两个独立顶点
verts->InsertNextCell(1);
verts->InsertCellPoint(1);
verts->InsertNextCell(1);
verts->InsertCellPoint(2);

```

关键区别：点集存储"在哪里"（几何位置），顶点单元定义"哪些点组成哪些顶点"（拓扑连接）。

2.2.2 线单元 (Lines)

线单元连接两个或多个点形成线性结构：

```
// 创建从点0到点1的线
vtkNew<vtkCellArray> lines;
lines->InsertNextCell(2);  // 单元包含2个点
lines->InsertCellPoint(0); // 起点
lines->InsertCellPoint(1); // 终点

```

2.2.3 多边形单元 (Polys)

多边形单元连接多个点形成面结构：

```
// 创建由点0、1、2组成的三角形
vtkNew<vtkCellArray> polys;
polys->InsertNextCell(3);  // 三角形有3个点
polys->InsertCellPoint(0);
polys->InsertCellPoint(1);
polys->InsertCellPoint(2);

```

2.2.4 三角带单元 (Strips)

三角带是一种高效表示连续三角形的方式，通过顶点共享减少存储开销：

```
// 创建三角带：使用4个点定义2个连续三角形
vtkNew<vtkCellArray> strips;
strips->InsertNextCell(4);  // 4个点定义2个三角形
strips->InsertCellPoint(0);
strips->InsertCellPoint(1);
strips->InsertCellPoint(2);
strips->InsertCellPoint(3);  // 形成三角形(0,1,2)和(1,2,3)

```

##### 2.3 多类型单元协同工作机制

在实际应用中，四种单元类型可以协同工作，共享同一套点集但表达不同层次的几何信息：

```
// 创建包含多种单元类型的复杂PolyData
vtkNew<vtkPolyData> polyData;
vtkNew<vtkPoints> points;

// 添加6个点
points->InsertNextPoint(0.0, 0.0, 0.0); // 点0
points->InsertNextPoint(1.0, 0.0, 0.0); // 点1
points->InsertNextPoint(0.5, 1.0, 0.0); // 点2
points->InsertNextPoint(0.5, 0.0, 1.0); // 点3
points->InsertNextPoint(1.5, 1.0, 0.0); // 点4
points->InsertNextPoint(1.0, 0.0, 1.0); // 点5

polyData->SetPoints(points);

// 设置顶点单元：标记特殊点
vtkNew<vtkCellArray> verts;
verts->InsertNextCell(1, &pointId0); // 标记点0为特殊顶点
polyData->SetVerts(verts);

// 设置线单元：连接点形成边
vtkNew<vtkCellArray> lines;
lines->InsertNextCell(2); // 点0到点1的边
lines->InsertCellPoint(0);
lines->InsertCellPoint(1);
polyData->SetLines(lines);

// 设置多边形单元：构建三角形面
vtkNew<vtkCellArray> polys;
polys->InsertNextCell(3); // 三角形面(0,1,2)
polys->InsertCellPoint(0);
polys->InsertCellPoint(1);
polys->InsertCellPoint(2);
polyData->SetPolys(polys);

// 设置三角带单元：构建连续三角形面
vtkNew<vtkCellArray> strips;
strips->InsertNextCell(4); // 三角带(3,4,5) + (4,5,6)
strips->InsertCellPoint(3);
strips->InsertCellPoint(4);
strips->InsertCellPoint(5);
// 注意：三角带会自动推导出第二个三角形(4,5,6)
// 但需要确保点索引正确，这里仅为示例
polyData->SetStrips(strips);

```

理解 vtkPolyData 中各种单元类型的协同工作机制，对于开发高效的医学图像处理算法至关重要。正确使用这些数据结构能够优化内存使用、提高计算效率，并为后续的可视化和分析奠定坚实基础。

