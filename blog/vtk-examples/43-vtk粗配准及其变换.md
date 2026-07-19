---
title: vtk粗配准及其变换
description: ---    开发环境：    - Windows 11 家庭中文版 - Microsoft Visual Studio Community 2019 - [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
---

# vtk粗配准及其变换

---

开发环境：

- Windows 11 家庭中文版
- Microsoft Visual Studio Community 2019
- [VTK-9.3.0.rc0](https://github.com/Kitware/VTK/releases/tag/v9.3.0.rc0)
- [vtk-example](https://github.com/Kitware/vtk-examples/commit/f41e3405d9f7231bd42cdb0cebe9480d88f12cf6)
- [参考代码](https://examples.vtk.org/site/CSharp/PolyData/AlignFrames/)
- 目的：学习与总结

---

>

**demo解决问题**：基于标记点，两个点集在配准后的平均距离最小，要求输入两个点数必须相等，序号一致的点集，做线性变换。

>

**关键类**：vtkTransform、vtkTransformFilter、vtkLandmarkTransform

**知识点**
 1. vtkMath::Add，此处仅用于创建两个点集合，target、sourse。[参考链接](https://blog.csdn.net/liushao1031177/article/details/120809118)
 2. ShallowCopy：vtk的浅拷贝，共享对象。[参考链接](https://zhuanlan.zhihu.com/p/138080564)
 3. transform相关的文章两篇：[参考链接1](https://www.cnblogs.com/ybqjymy/p/14043001.html)、[参考链接2](https://www.cnblogs.com/21207-iHome/p/6560506.html)
 1）`GetMatrix和GetUserMatrix的区别、getTransform和getUserTransform中加User与不加User的区别`：不加User是当前actor相对与世界坐标的位置的变化矩阵的get、set；加User是指基于变换中的某一个阶段结果基础上再进行变换的矩阵获取，例如进行了两次变换，第二次变换就是基于第一次的结果基础上变换来的
 2）`vtkMatrix4x4与vtkTransform的区别`: vtkMatrix4x4关注的是矩阵的数学运算（invert、multiply…）、矩阵获取（MatrixFromRotation、缩放与平移矩阵比较好推算）、元素设置（SetElement），重点在于矩阵数据结构本身；vtkTransform重点在于比较直接的视觉操作（缩放scale、旋转rotate、平移translate），多级变换的管理（Concatenate），可以看下官方接口说明：[vtkMatrix4x4](https://vtk.org/doc/nightly/html/classvtkMatrix4x4.html)、[vtkTransform](https://vtk.org/doc/nightly/html/classvtkTransform.html#details)
 4. vtkLandmarkTransform：用于粗配准（初步对齐）[参考链接](https://blog.csdn.net/q610098308/article/details/125362653)
 1）AlignFrames(frame2, frame1, transform);//把frame2向frame1靠拢

```
	landmarkTransform->SetSourceLandmarks(sourcePoints);
	landmarkTransform->SetTargetLandmarks(targetPoints)
	landmarkTransform->SetModeToRigidBody();
	landmarkTransform->Update();

```

2） 获取变换矩阵后传出，给外面的frame2使用

```
    vtkMatrix4x4* M = landmarkTransform->GetMatrix();
    transform->SetMatrix(M);

```

3） 通过显示结果或者输出文件观察线形变换后的位姿

```
  void ApplyTransform(vtkTransform* transform, std::string filename)
  {
    vtkNew<vtkPolyData> polydata;
    CreatePolydata(polydata);

    vtkNew<vtkTransformFilter> transformFilter;
    transformFilter->SetInputData(polydata);
    transformFilter->SetTransform(transform);
    transformFilter->Update();

    vtkNew<vtkXMLPolyDataWriter> writer;
    writer->SetFileName(filename.c_str());
    writer->SetInputConnection(transformFilter->GetOutputPort());
    writer->Write();
  }

```

---

```
#include <vtkLandmarkTransform.h>
#include <vtkMath.h>
#include <vtkNew.h>
#include <vtkPoints.h>
#include <vtkPolyData.h>
#include <vtkTransform.h>
#include <vtkTransformFilter.h>
#include <vtkVertexGlyphFilter.h>
#include <vtkXMLPolyDataWriter.h>

namespace {
struct Frame
{
  Frame(float o[3], float x[3], float y[3], float z[3])
  {
    this->SetOrigin(o);
    this->SetXDirection(x);
    this->SetYDirection(y);
    this->SetZDirection(z);

    std::cout << "Origin: " << this->origin[0] << " " << this->origin[1] << " "
              << this->origin[2] << std::endl;
    std::cout << "xDirection: " << this->xDirection[0] << " "
              << this->xDirection[1] << " " << this->xDirection[2] << std::endl;
    std::cout << "yDirection: " << this->yDirection[0] << " "
              << this->yDirection[1] << " " << this->yDirection[2] << std::endl;
    std::cout << "zDirection: " << this->zDirection[0] << " "
              << this->zDirection[1] << " " << this->zDirection[2] << std::endl;
  }

  void ApplyTransform(vtkTransform* transform, std::string filename)
  {
    vtkNew<vtkPolyData> polydata;
    CreatePolydata(polydata);

    vtkNew<vtkTransformFilter> transformFilter;
    transformFilter->SetInputData(polydata);
    transformFilter->SetTransform(transform);
    transformFilter->Update();

    vtkNew<vtkXMLPolyDataWriter> writer;
    writer->SetFileName(filename.c_str());
    writer->SetInputConnection(transformFilter->GetOutputPort());
    writer->Write();
  }

  void CreatePolydata(vtkPolyData* polydata)
  {
    /*
    * https://blog.csdn.net/liushao1031177/article/details/120809118
    static void Add(const float a[3], const float b[3], float c[3]){
     for (int i = 0; i < 3; ++i)
     {
       c[i] = a[i] + b[i];
     }
    }
    */
    vtkNew<vtkPoints> points;

    points->InsertNextPoint(this->origin);
    float x[3];
    vtkMath::Add(this->origin, this->xDirection, x);
    points->InsertNextPoint(x);
    float y[3];
    vtkMath::Add(this->origin, this->yDirection, y);
    points->InsertNextPoint(y);
    float z[3];
    vtkMath::Add(this->origin, this->zDirection, z);
    points->InsertNextPoint(z);

    polydata->SetPoints(points);

    vtkNew<vtkVertexGlyphFilter> vertexGlyphFilter;//单独的点是看不到的，需要转换成符号
    vertexGlyphFilter->AddInputData(polydata);
    vertexGlyphFilter->Update();

    //https://zhuanlan.zhihu.com/p/138080564
    polydata->ShallowCopy(vertexGlyphFilter->GetOutput());
  }

  void Write(std::string filename)
  {
    vtkNew<vtkPolyData> polydata;
    CreatePolydata(polydata);

    vtkNew<vtkXMLPolyDataWriter> writer;
    writer->SetFileName(filename.c_str());
    writer->SetInputData(polydata);
    writer->Write();
  }

  float origin[3];
  float xDirection[3];
  float yDirection[3];
  float zDirection[3];

  void SetOrigin(float o[3])
  {
    this->origin[0] = o[0];
    this->origin[1] = o[1];
    this->origin[2] = o[2];
  }

  void SetXDirection(float direction[3])
  {
    vtkMath::Normalize(direction);
    this->xDirection[0] = direction[0];
    this->xDirection[1] = direction[1];
    this->xDirection[2] = direction[2];
  }

  void SetYDirection(float direction[3])
  {
    vtkMath::Normalize(direction);
    this->yDirection[0] = direction[0];
    this->yDirection[1] = direction[1];
    this->yDirection[2] = direction[2];
  }

  void SetZDirection(float direction[3])
  {
    vtkMath::Normalize(direction);
    this->zDirection[0] = direction[0];
    this->zDirection[1] = direction[1];
    this->zDirection[2] = direction[2];
  }
};

void AlignFrames(Frame sourceFrame, Frame destinationFrame,
                 vtkTransform* transform);
} // namespace

int main(int, char*[])
{
  //工程应用中，此处frame中构造的点可在renderViewer中进行点拾取后记录
  float frame1origin[3] = {0, 0, 0};
  float frame1XDirection[3] = {1, 0, 0};
  float frame1YDirection[3] = {0, 1, 0};
  std::cout << frame1YDirection[0] << " " << frame1YDirection[1] << " "
            << frame1YDirection[2] << std::endl;
  float frame1ZDirection[3] = {0, 0, 1};
  Frame frame1(frame1origin, frame1XDirection, frame1YDirection,
               frame1ZDirection);
  frame1.Write("frame1.vtp");

  float frame2origin[3] = {0, 0, 0};
  float frame2XDirection[3] = {.707f, .707f, 0};
  float frame2YDirection[3] = {-.707f, .707f, 0};
  float frame2ZDirection[3] = {0, 0, 1};
  Frame frame2(frame2origin, frame2XDirection, frame2YDirection,
               frame2ZDirection);
  frame2.Write("frame2.vtp");

  vtkNew<vtkTransform> transform;
  AlignFrames(frame2, frame1, transform); // Brings frame2 to frame1

  // std::cout << *transform << std::endl;

  frame2.ApplyTransform(transform, "transformed.vtp");

  return EXIT_SUCCESS;
}

namespace {
void AlignFrames(Frame sourceFrame, Frame targetFrame, vtkTransform* transform)
{
  //https://blog.csdn.net/q610098308/article/details/125362653
  // This function takes two frames and finds the matrix M between them.
  //两个点集在配准后的平均距离最小，要求输入两个点数必须相等，序号一致的点集，做线性变换。它常用于粗略匹配，效率高。
  vtkNew<vtkLandmarkTransform> landmarkTransform;

  // Setup source points
  vtkNew<vtkPoints> sourcePoints;

  sourcePoints->InsertNextPoint(sourceFrame.origin);
  float sourceX[3];
  vtkMath::Add(sourceFrame.origin, sourceFrame.xDirection, sourceX);
  sourcePoints->InsertNextPoint(sourceX);
  float sourceY[3];
  vtkMath::Add(sourceFrame.origin, sourceFrame.yDirection, sourceY);
  sourcePoints->InsertNextPoint(sourceY);
  float sourceZ[3];
  vtkMath::Add(sourceFrame.origin, sourceFrame.zDirection, sourceZ);
  sourcePoints->InsertNextPoint(sourceZ);

  // Setup target points
  vtkNew<vtkPoints> targetPoints;

  targetPoints->InsertNextPoint(targetFrame.origin);
  float targetX[3];
  vtkMath::Add(targetFrame.origin, targetFrame.xDirection, targetX);
  targetPoints->InsertNextPoint(targetX);
  float targetY[3];
  vtkMath::Add(targetFrame.origin, targetFrame.yDirection, targetY);
  targetPoints->InsertNextPoint(targetY);
  float targetZ[3];
  vtkMath::Add(targetFrame.origin, targetFrame.zDirection, targetZ);
  targetPoints->InsertNextPoint(targetZ);

  landmarkTransform->SetSourceLandmarks(sourcePoints);
  landmarkTransform->SetTargetLandmarks(targetPoints);
  landmarkTransform->SetModeToRigidBody();
  landmarkTransform->Update();

  vtkMatrix4x4* M = landmarkTransform->GetMatrix();

  transform->SetMatrix(M);
}
} // namespace

```

