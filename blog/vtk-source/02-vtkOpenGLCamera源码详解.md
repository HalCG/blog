---
title: vtkOpenGLCamera源码详解
description: 源码来源：[vtkOpenGLCamera.cxx](https://github.com/Kitware/VTK/blob/4b354e85521dd027f2e4637e32aed48c7904500a/Rendering/OpenGL2/vtkOpenGLCamera.cxx)    ---
---

# vtkOpenGLCamera源码详解


源码来源：[vtkOpenGLCamera.cxx](https://github.com/Kitware/VTK/blob/4b354e85521dd027f2e4637e32aed48c7904500a/Rendering/OpenGL2/vtkOpenGLCamera.cxx)



---



### 🔧 构造函数与析构函数



#### 构造函数



```
vtkOpenGLCamera::vtkOpenGLCamera()
{
  this->WCDCMatrix = vtkMatrix4x4::New();      // World to Device Coordinate
  this->WCVCMatrix = vtkMatrix4x4::New();      // World to View Coordinate
  this->NormalMatrix = vtkMatrix3x3::New();    // 法向量变换矩阵
  this->VCDCMatrix = vtkMatrix4x4::New();      // View to Device Coordinate
  this->LastRenderer = nullptr;
}

```


**初始化四个关键矩阵：**



| | 矩阵名称 | 用途 | 维度  |
| | `WCDCMatrix` | 世界坐标→设备坐标 | 4×4  |
| | `WCVCMatrix` | 世界坐标→视图坐标（ModelView） | 4×4  |
| | `NormalMatrix` | 法向量变换（用于光照计算） | 3×3  |
| | `VCDCMatrix` | 视图坐标→设备坐标（投影矩阵） | 4×4  |

#### 析构函数



```
vtkOpenGLCamera::~vtkOpenGLCamera()
{
  this->WCDCMatrix->Delete();
  this->WCVCMatrix->Delete();
  this->NormalMatrix->Delete();
  this->VCDCMatrix->Delete();
}

```


释放所有动态分配的矩阵对象。



---



### 🎬 Render 方法



```
void vtkOpenGLCamera::Render(vtkRenderer* ren)

```


**核心功能：设置 OpenGL 视口和剪裁区域**



#### 关键步骤：



**1. 获取渲染窗口和状态**



```
vtkOpenGLRenderWindow* win = vtkOpenGLRenderWindow::SafeDownCast(ren->GetRenderWindow());
vtkOpenGLState* ostate = win->GetState();

```


**2. 检测立体渲染**



```
this->Stereo = (ren->GetRenderWindow())->GetStereoRender();

```


**3. 设置视口（Viewport）**



```
ren->GetTiledSizeAndOrigin(&usize, &vsize, lowerLeft, lowerLeft + 1);
ostate->vtkglViewport(lowerLeft[0], lowerLeft[1], usize, vsize);

```


获取平铺渲染的大小和原点，设置 OpenGL 视口范围。



**4. 启用剪裁测试**



```
ostate->vtkglEnable(GL_SCISSOR_TEST);

```


**5. 设置剪裁区域**



```
if (this->UseScissor)
{
  // 使用自定义剪裁矩形
  ostate->vtkglScissor(this->ScissorRect.GetX(), this->ScissorRect.GetY(),
    this->ScissorRect.GetWidth(), this->ScissorRect.GetHeight());
  this->UseScissor = false;
}
else
{
  // 使用默认视口大小
  ostate->vtkglScissor(lowerLeft[0], lowerLeft[1], usize, vsize);
}

```


**6. 清空缓冲区**



```
if ((ren->GetRenderWindow())->GetErase() && ren->GetErase())
{
  ren->Clear();  // 清除颜色和深度缓冲区
}

```


---



### 📐 UpdateViewport 方法



```
void vtkOpenGLCamera::UpdateViewport(vtkRenderer* ren)

```


**功能：** 更新视口设置（与 `Render` 方法类似，但不进行清空操作）



这个方法用于在渲染过程中动态调整视口，而不需要重新清空缓冲区。



---



### 🔑 GetKeyMatrices 方法（最重要）



```
void vtkOpenGLCamera::GetKeyMatrices(vtkRenderer* ren, vtkMatrix4x4*& wcvc,
  vtkMatrix3x3*& normMat, vtkMatrix4x4*& vcdc, vtkMatrix4x4*& wcdc)

```


**功能：** 计算并缓存相机的四个关键变换矩阵



#### 缓存检查机制



```
if (ren != this->LastRenderer || this->MTime > this->KeyMatrixTime ||
    ren->GetMTime() > this->KeyMatrixTime)
{
  // 重新计算矩阵
}

```


仅当以下条件满足时才重新计算：



- 渲染器改变
- 相机修改时间 > 矩阵计算时间
- 渲染器修改时间 > 矩阵计算时间


#### 矩阵计算过程



**1. 获取 ModelView 矩阵（世界→视图）**



```
this->WCVCMatrix->DeepCopy(this->GetModelViewTransformMatrix());

```


**2. 提取并计算法向量矩阵**



```
for (int i = 0; i < 3; ++i)
{
  for (int j = 0; j < 3; ++j)
  {
    this->NormalMatrix->SetElement(i, j, this->WCVCMatrix->GetElement(i, j));
  }
}
this->NormalMatrix->Invert();

```


提取 ModelView 矩阵的左上角 3×3 部分，然后求逆。这用于在着色器中正确变换法向量。



**3. 转置 ModelView 矩阵**



```
this->WCVCMatrix->Transpose();

```


为了与 OpenGL 列主序（column-major）存储格式兼容。



**4. 获取投影矩阵（视图→设备）**



```
this->VCDCMatrix->DeepCopy(
  this->GetProjectionTransformMatrix(ren->GetTiledAspectRatio(), -1, 1));
this->VCDCMatrix->Transpose();

```


获取投影矩阵并转置。参数 `-1, 1` 指定近、远裁剪平面。



**5. 计算复合矩阵（世界→设备）**



```
vtkMatrix4x4::Multiply4x4(this->WCVCMatrix, this->VCDCMatrix, this->WCDCMatrix);

```






         WCDC


         =


         WCVC


         ×


         VCDC



         \text{WCDC} = \text{WCVC} \times \text{VCDC}


     WCDC=WCVC×VCDC



这是最终的 MVP（Model-View-Projection）矩阵。



**6. 更新时间戳**



```
this->KeyMatrixTime.Modified();
this->LastRenderer = ren;

```


---



### 🎯 坐标系转换流程图



```
World Coordinates (世界坐标)
        ↓
   [WCVC Matrix]  ← ModelView 矩阵
        ↓
View Coordinates (视图坐标)
        ↓
   [VCDC Matrix]  ← Projection 矩阵
        ↓
Device Coordinates (设备坐标 -1 to 1)
        ↓
   [Viewport]     ← 屏幕像素坐标

```


---



### 💡 关键设计特点



| | 特点 | 说明  |
| | **矩阵缓存** | 避免重复计算，提高性能  |
| | **时间戳检查** | 只在必要时更新矩阵  |
| | **法向量矩阵** | 独立计算用于光照计算  |
| | **列主序** | 通过转置适配 OpenGL 存储格式  |
| | **平铺渲染支持** | 支持多视口/多窗口渲染  |
| | **剪裁区域** | 灵活的视口裁剪机制  |

这个实现是现代 OpenGL 渲染管线中相机系统的标准做法。