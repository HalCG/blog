# VTK 策略模式详解：InteractorStyle、Mapper、Picker 与可替换算法

> 系列入门篇：[05 策略模式](05-strategy.md) · [Qt / VTK 设计模式](../README.md)  
> 本文基于 VTK 官方 API 与 Kitware 开源源码梳理，不依赖任何特定业务项目。  
> 主要参考：`vtkRenderWindowInteractor`、`vtkInteractorStyle`、`vtkMapper`、`vtkAbstractPicker`、VTK Examples [StyleSwitch](https://examples.vtk.org/site/Cxx/Interaction/StyleSwitch/)

---

## 写在前面：VTK 里「策略」到底指什么

GoF **策略模式**的一句话：**定义一族算法，把它们封装起来，并且使它们可以互相替换**。  
调用方依赖抽象接口，运行期换实现，而不是在业务代码里堆 `if (mode == A) ... else if (mode == B) ...`。

VTK 没有一个叫 `vtkStrategy` 的基类，但策略思想散落在多个模块里，最典型的是：

| 维度 | Strategy 抽象 | Context 持有方 | 典型切换 API |
|------|---------------|----------------|--------------|
| **交互** | `vtkInteractorStyle` | `vtkRenderWindowInteractor` | `SetInteractorStyle()` |
| **绘制** | `vtkMapper` | `vtkActor` / `vtkVolume` | `SetMapper()` |
| **拾取** | `vtkAbstractPicker` | `vtkRenderWindowInteractor` 或业务代码 | `SetPicker()` / 局部使用 |
| **（扩展）** | 插值、坐标映射、体绘制后端等 | 对应 Filter / Prop | 各模块 `SetXxx()` |

本篇按 **交互 → 绘制 → 拾取 → 组合与其他模式** 展开；读完应能回答：

1. 为什么 `SetInteractorStyle` 是教科书级策略？  
2. 换 Mapper 和换 Style 有什么相同与不同？  
3. 自定义交互工具时，Style、Widget、Observer 怎么分工？  
4. 策略模式在 VTK 里经常和哪些模式叠在一起？

---

## 1. GoF 策略模式：先对齐概念

### 1.1 经典结构

```
        ┌─────────────┐
        │   Context   │  持有 Strategy*，把请求委托给它
        └──────┬──────┘
               │ uses
               ▼
        ┌─────────────┐
        │  Strategy   │  抽象接口
        └──────┬──────┘
       ┌───────┼───────┐
       ▼       ▼       ▼
   ConcreteA  B       C   可互换的具体算法
```

### 1.2 策略模式要满足的性质

| 性质 | 含义 | VTK 交互层的对应 |
|------|------|------------------|
| 算法可替换 | 运行期换实现，调用方代码少改 | `iren->SetInteractorStyle(newStyle)` |
| 开闭原则 | 新增算法 = 新子类，不必改 Context | 新建 `vtkInteractorStyle` 子类 |
| 消除条件分支 | Context 不写满屏 mode 判断 | Interactor 只转发事件，不解析手势 |
| 同一接口 | 所有策略同一组虚函数 | `OnLeftButtonDown()` 等 |

### 1.3 策略 vs 状态 vs 模板方法（VTK 里极易混）

| 模式 | 谁决定用哪个算法 | VTK 例子 |
|------|------------------|----------|
| **策略** | **客户端显式** `SetInteractorStyle` | 用户点「框选工具」→ 换 RubberBand Style |
| **状态** | 对象**内部状态**自动切换行为 | `vtkAlgorithm` 管线状态（已修改 / 已执行） |
| **模板方法** | 基类固定骨架，子类填步骤 | `vtkAlgorithm::ProcessRequest` 管线；`vtkInteractorStyle` 里部分流程固定、子类重写 `On*` |

`vtkInteractorStyle` 本身是 **策略 + 模板方法** 的混合：基类负责事件绑定与 `InvokeEvent` 骨架，子类重写 `OnLeftButtonDown()` 等实现具体手势——但 **选用哪个子类** 仍是策略语义（由 `SetInteractorStyle` 决定）。

### 1.4 策略 vs 桥接

- **桥接**：把「抽象」与「实现」两个维度拆开（例如 Prop 与 Mapper 分离）。  
- **策略**：强调 **同一时刻只选一种算法** 执行。

`vtkActor` 持 `vtkMapper*` 既有桥接味道（表现与绘制分离），也有策略味道（换 Mapper = 换绘制算法）。VTK 文档很少用模式术语，但 **从用法上按策略理解最实用**。

---

## 2. 总览：从鼠标到像素的一条链

```
OS 输入（鼠标/键盘/触摸）
    │
    ▼
vtkRenderWindowInteractor     ← Context（壳，路由事件）
    │  GetInteractorStyle()
    ▼
vtkInteractorStyle            ← Strategy：手势算法（旋转 / 框选 / 窗宽窗位）
    │  更新 Camera / Actor / Selection
    ▼
vtkRenderer::Render()
    │
    ▼
vtkActor / vtkVolume
    │  GetMapper()
    ▼
vtkMapper                     ← Strategy：如何把数据画出来
    │
    ▼
GPU / 帧缓冲
```

**拾取**（点击选中物体）可发生在 Style 处理过程中或业务层主动调用，算法由 `vtkAbstractPicker` 子类决定——又是策略。

---

## 3. 交互策略：`vtkInteractorStyle` 深度剖析

### 3.1 Context：`vtkRenderWindowInteractor` 只是「壳」

VTK 官方对 `vtkRenderWindowInteractor` 的说明（意译）：

> 与早期版本不同，现在它主要作为 **外壳**，保存用户偏好，并把平台相关消息 **路由到 `vtkInteractorStyle`**。

关键 API：

```cpp
virtual void SetInteractorStyle(vtkInteractorObserver*);
virtual vtkInteractorObserver* GetInteractorStyle();
```

内部持有：

```cpp
vtkSmartPointer<vtkInteractorObserver> InteractorStyle;
```

**默认** 构造出来的往往是 `vtkInteractorStyleSwitch`（见下节）——本身就是一个「策略选择器」。

Context 的职责：

- 平台层：Windows / macOS / Qt / X11 事件循环、`Initialize()` / `Start()`
- 把 `LeftButtonPress` 等 **中性事件** 转给当前 Style
- 持有 **Picker**、帧率、灯光跟随相机等全局偏好
- **不关心** 左键到底是旋转还是框选——那是 Style 的事

这就是策略模式里 Context **只委托、不实现算法** 的典型形态。

### 3.2 Strategy 接口：`vtkInteractorStyle` 家族

继承关系（简化）：

```
vtkObject
  └── vtkInteractorObserver
        └── vtkInteractorStyle
              ├── vtkInteractorStyleTrackballCamera
              ├── vtkInteractorStyleTrackballActor
              ├── vtkInteractorStyleJoystickCamera
              ├── vtkInteractorStyleJoystickActor
              ├── vtkInteractorStyleRubberBand2D
              ├── vtkInteractorStyleRubberBand3D
              ├── vtkInteractorStyleRubberBandPick
              ├── vtkInteractorStyleImage          // 2D 图像窗宽窗位
              ├── vtkInteractorStyleTerrain
              ├── vtkInteractorStyleFlight
              ├── vtkInteractorStyleMultiTouchCamera
              ├── vtkInteractorStyleSwitch         // 内嵌多策略
              └── 你的 MyInteractorStyle
```

#### Trackball vs Joystick：同一类问题的两种算法

| 风格 | 交互隐喻 | 鼠标按住时 | 典型场景 |
|------|----------|------------|----------|
| **Trackball** | 抓住物体/相机拖动 | 按下移动才动作，松手停止 | 网格查看、CAD 浏览 |
| **Joystick** | 摇杆持续推动 | 按住产生**连续**事件流 | 旧式 VTK 示例、飞行浏览 |

`vtkInteractorStyleTrackballCamera`：绕 **相机** 旋转场景（医学影像、通用 3D 浏览最常见）。  
`vtkInteractorStyleTrackballActor`：绕 **单个 Actor** 变换（操纵模型本身）。  
`vtkInteractorStyleImage`：2D 切片上的平移、缩放、窗宽窗位。

#### 专用交互策略

| 类 | 策略语义 |
|----|----------|
| `vtkInteractorStyleRubberBand2D` | 屏幕矩形框选，发 `SelectionChangedEvent` |
| `vtkInteractorStyleRubberBand3D` | 3D 视锥框选 |
| `vtkInteractorStyleRubberBandPick` | 框选 + 拾取组合 |
| `vtkInteractorStyleMultiTouchCamera` | 触摸缩放/旋转 |

### 3.3 事件如何流到策略：调用栈（概念）

```
平台：鼠标左键按下
  → vtkRenderWindowInteractor::LeftButtonPressEvent()
  → vtkInteractorStyle::OnLeftButtonDown()    // 虚函数，子类实现
  → （Trackball）旋转相机 / （RubberBand）记录起点
  → InvokeEvent(LeftButtonPressEvent)       // 仍可被外部 observer 监听
  → 可能 RenderWindow->Render()
```

`vtkInteractorStyle` 文档说明：除处理手势外，还会 `InvokeEvent` 发出标准事件（`LeftButtonPressEvent`、`StartInteractionEvent`、`EndInteractionEvent` 等），供 [Observer + vtkCommand](../vtk-observer-and-command-pattern.md) 订阅。

因此：

- **Style** = 默认手势算法（策略）  
- **AddObserver** = 在同一条事件总线上挂额外逻辑（观察者）  
二者常一起用，但不是同一模式。

### 3.4 运行期切换策略：最小示例

```cpp
#include <vtkRenderWindowInteractor.h>
#include <vtkInteractorStyleTrackballCamera.h>
#include <vtkInteractorStyleRubberBand2D.h>

class InteractionTool {
public:
  explicit InteractionTool(vtkRenderWindowInteractor* iren) : m_iren(iren) {
    m_navigate = vtkSmartPointer<vtkInteractorStyleTrackballCamera>::New();
    m_select = vtkSmartPointer<vtkInteractorStyleRubberBand2D>::New();
    m_iren->SetInteractorStyle(m_navigate); // 默认浏览
  }

  void enterNavigateMode() { m_iren->SetInteractorStyle(m_navigate); }
  void enterSelectMode()  { m_iren->SetInteractorStyle(m_select); }

private:
  vtkRenderWindowInteractor* m_iren;
  vtkSmartPointer<vtkInteractorStyleTrackballCamera> m_navigate;
  vtkSmartPointer<vtkInteractorStyleRubberBand2D> m_select;
};
```

要点：

1. **复用** `vtkSmartPointer` 保存策略实例，避免每次 `new`  
2. 切换前可 `GetInteractorStyle()` 存为「上一模式」，便于工具栏退出时恢复  
3. `SetInteractorStyle` 后检查 `CurrentRenderer` 是否仍正确（多视口时见 §7）

### 3.5 `vtkInteractorStyleSwitch`：策略的策略（Context 嵌套）

VTK 默认 Interactor 常配 `vtkInteractorStyleSwitch`。它 **内部持有 4～5 个子 Style**，在 `OnChar()` 里根据按键切换：

- `j` / `t`：Joystick ↔ Trackball  
- `c` / `a`：Camera ↔ Actor  

```cpp
vtkNew<vtkInteractorStyleSwitch> style;
renderWindowInteractor->SetInteractorStyle(style);
// 运行期按键切换，或代码：
style->SetCurrentStyleToTrackballCamera();
```

这是 **策略模式套策略模式**：

- 对外：Interactor 只看到一个 `vtkInteractorStyleSwitch`  
- 对内：`CurrentStyle` 指向真正的 ConcreteStrategy  

官方示例：[StyleSwitch](https://examples.vtk.org/site/Cxx/Interaction/StyleSwitch/)

应用层可仿照它写 **自己的 Switch**：例如「浏览 / 测量 / 标注」三模式，用工具栏改 `CurrentStyle`，而不是让 Interactor 直接感知模式枚举。

### 3.6 自定义 `vtkInteractorStyle`：推荐步骤

1. **继承最接近的现有类**（多数情况选 `vtkInteractorStyleTrackballCamera`）  
2. 只重写需要的 `OnLeftButtonDown` / `OnMouseMove` / `OnChar` 等  
3. 需要额外逻辑时 `InvokeEvent`，不要绕过基类除非有意为之  
4. 用 `vtkSetMacro` / 成员保存工具状态（橡皮筋起点、测量点等）  
5. 在析构或工具退出时 `RemoveObservers`，避免悬空 `clientData`

```cpp
class MeasureStyle : public vtkInteractorStyleTrackballCamera {
public:
  static MeasureStyle* New();
  vtkTypeMacro(MeasureStyle, vtkInteractorStyleTrackballCamera);

  void OnLeftButtonDown() override {
    // 记录测距点，或交给 vtkPointHandleWidget
    this->InvokeEvent(vtkCommand::LeftButtonPressEvent, nullptr);
    // 若仍要保留旋转：vtkInteractorStyleTrackballCamera::OnLeftButtonDown();
  }
};
```

### 3.7 Style 与 3D Widget、AbortFlag 的分工

| 机制 | 模式角色 | 适用场景 |
|------|----------|----------|
| `vtkInteractorStyle` | 全局交互策略 | 浏览、框选、图像窗宽窗位 |
| `vtkAbstractWidget` + `vtkInteractorObserver` | 局部工具，可 `GrabFocus` |  gizmo、测距手柄、裁剪盒 |
| `vtkCommand::AbortFlag` | 责任链截断 | Widget 消费事件后阻止 Style 继续处理 |

**不要** 把所有交互都塞进一个巨型 Style 子类；**常见做法**：

- 默认 `TrackballCamera` 浏览  
- 进入编辑工具时启用 Widget（GrabFocus）或临时换 RubberBand Style  
- 退出时恢复默认 Style

详见 [10 责任链](10-chain-of-responsibility.md)。

---

## 4. 绘制策略：`vtkMapper` 深度剖析

### 4.1 为什么 Mapper 是策略

渲染管线里 **数据**（`vtkPolyData`、`vtkImageData`…）与 **怎么画** 是分开的：

```
vtkAlgorithm (Filter)  →  vtkDataSet
                              ↓
                         vtkMapper  ← Strategy：着色、图元类型、GPU 路径
                              ↓
                         vtkActor / vtkVolume
                              ↓
                         vtkRenderer
```

`vtkActor::SetMapper(vtkMapper*)` 与 `SetInteractorStyle` 同构：**Prop 不关心具体绘制算法，只持有抽象 `vtkMapper`**。

### 4.2 常见 Mapper 策略表

#### 多边形面片

| Mapper | 输入 | 策略语义 |
|--------|------|----------|
| `vtkPolyDataMapper` | `vtkPolyData` | 经典三角面渲染 |
| `vtkOpenGLPolyDataMapper` | `vtkPolyData` | OpenGL 路径（现代默认后端） |
| `vtkCompositePolyDataMapper` | 复合 `vtkMultiBlockDataSet` | 多块数据一次绘制 |

#### 体绘制（Volume）

| Mapper | 策略语义 |
|--------|----------|
| `vtkFixedPointVolumeRayCastMapper` | 固定点 CPU 光线投射 |
| `vtkGPUVolumeRayCastMapper` | GPU 光线投射（大数据常用） |
| `vtkSmartVolumeMapper` | 根据数据与硬件 **自动选择** 后端（策略 + 简单工厂） |

#### 点、线、实例化

| Mapper | 策略语义 |
|--------|----------|
| `vtkGlyph3DMapper` | 每个点实例化一个图元（箭头、球） |
| `vtkPointGaussianMapper` | 大范围点云，近似高斯 splat |
| `vtkLabeledDataMapper` | 在点上画数值标签 |

#### 图像 / 2D

| Mapper | 策略语义 |
|--------|----------|
| `vtkImageSliceMapper` | 轴位切片 |
| `vtkImageResliceMapper` | 任意平面重切片 |

### 4.3 切换 Mapper 示例

同一 Actor，从面片显示切到点云高亮：

```cpp
vtkNew<vtkPolyDataMapper> solidMapper;
solidMapper->SetInputConnection(polySource->GetOutputPort());

vtkNew<vtkPointGaussianMapper> pointMapper;
pointMapper->SetInputConnection(polySource->GetOutputPort());
pointMapper->EmissiveOff();

vtkNew<vtkActor> actor;
actor->SetMapper(solidMapper);
renderer->AddActor(actor);

void showAsPoints(vtkActor* actor) {
  actor->SetMapper(pointMapper);
  actor->GetProperty()->SetPointSize(3);
}

void showAsSurface(vtkActor* actor) {
  actor->SetMapper(solidMapper);
}
```

### 4.4 Mapper 策略的底层注意点

1. **输入数据类型必须匹配**  
   `vtkPolyDataMapper` 不能接 `vtkImageData`，否则空渲染或断言。

2. **`Modified()` 与管线更新**  
   换 Mapper 后通常 `actor->Modified()` + `Render()`；若接 Filter 输出，确保 `Update()` 已执行。

3. **Scalar 与 LookupTable**  
   同一 Mapper 换标量数组时，策略仍是「多边形绘制」，但着色规则靠 `vtkMapper::SetScalarVisibility`、`SetColorMode` 等——属于 Mapper **内部参数**，不必换子类。

4. **Volume 的 GPU / CPU**  
   体数据很大时，`vtkGPUVolumeRayCastMapper` 与 CPU 实现在性能与精度上差异大；`vtkSmartVolumeMapper` 用策略 + 工厂减轻选择负担。

5. **与 Filter 策略的区别**  
   - **Filter**：改 **数据**（几何、拓扑、标量）  
   - **Mapper**：改 **绘制方式**  
   面扫软件里「网格简化」是 Filter，「线框 / 实体显示」常是 Mapper + `vtkProperty`。

---

## 5. 拾取策略：`vtkAbstractPicker` 家族

点击「选中牙齿 / 选中模型」依赖 **拾取算法**，又是一组可替换策略。

### 5.1 继承结构（简化）

```
vtkAbstractPicker
  ├── vtkPicker              // 基于图形硬件 + 遍历 Prop，常用
  ├── vtkCellPicker          // 精确到单元，可获取世界坐标与 CellId
  ├── vtkPointPicker         // 精确到点
  ├── vtkPropPicker          // 只选 Prop，不深入几何
  ├── vtkWorldPointPicker    // 屏幕坐标 → 世界射线与平面交点
  └── vtkAreaPicker          // 区域拾取
```

### 5.2 Context 与使用方式

`vtkRenderWindowInteractor` 内建 `vtkAbstractPicker* Picker`，可通过 `SetPicker` 更换默认拾取策略。

两种用法：

```cpp
// A. 全局默认 picker
vtkNew<vtkCellPicker> cellPicker;
cellPicker->SetTolerance(0.001);
iren->SetPicker(cellPicker);

// B. 单次拾取（临时策略，不影响 Interactor 默认）
vtkNew<vtkPropPicker> propPicker;
if (propPicker->Pick(x, y, 0, renderer)) {
  vtkProp* prop = propPicker->GetViewProp();
}
```

### 5.3 策略选择指南

| 需求 | 推荐策略 |
|------|----------|
| 快速选中物体 | `vtkPropPicker` |
| 需要 CellId / 重心坐标 | `vtkCellPicker` |
| 需要最近顶点 | `vtkPointPicker` |
| 框选多个 Actor | `vtkAreaPicker` 或 RubberBand Style + 回调 |
| 在空白处点地平面 | `vtkWorldPointPicker` + 约束平面 |

拾取与 **交互 Style** 独立：Style 决定手势，Picker 决定「这一点的几何命中是谁」；RubberBand Style 常在 `SelectionChangedEvent` 里再调 AreaPicker。

---

## 6. 其他 VTK 模块中的策略思想（扩展阅读）

| 模块 | 抽象接口 | 替换的是什么 |
|------|----------|--------------|
| `vtkImageInterpolator` | 插值核 | 最近邻 / 线性 / 三次 |
| `vtkCoordinate` | 坐标系策略 | World / Display / NormalizedViewport |
| `vtkAbstractImageInterpolator`（重切片） | 采样策略 | 质量 vs 速度 |
| `vtkTextRenderer` | 字体栅格化后端 | FreeType 等 |
| `vtkColorTransferFunction` + `vtkPiecewiseFunction` | 传递函数 | 体绘制颜色/透明度映射（更像策略化配置） |
| `vtkAlgorithm` 子类 | 滤波算法 | 严格说是 **Strategy + 管道**，见 [03 管道](03-pipeline-filter.md) |

这些不如 InteractorStyle / Mapper 典型，但在读源码时可用同一 lens：**接口稳定，实现可换**。

---

## 7. 多视口与多 Interactor 场景

```
vtkRenderWindow
  ├── Renderer0  ←→  Interactor0 + Style0
  └── Renderer1  ←→  Interactor1 + Style1   // 或共享一个 Interactor
```

策略：

- **每个 Interactor 独立 Style**：左侧 3D 轨道球，右侧 2D `vtkInteractorStyleImage`  
- **共享 Interactor**：`vtkInteractorObserver::SetCurrentRenderer()` 决定事件发给哪个 Renderer  
- 切换 Style 时同步 `SetDefaultRenderer` / `SetCurrentRenderer`（`vtkInteractorStyleSwitch` 会转发给子 Style）

陷阱：只换 Style 不设 Renderer，会出现「鼠标在动但相机不动」——事件到了 Style，但 `CurrentRenderer` 为空。

---

## 8. 策略与其他模式的组合

| 组合 | 说明 | VTK 例子 |
|------|------|----------|
| 策略 + 工厂 | 工厂创建具体策略 | `vtkInteractorStyle::New()`、`vtkSmartVolumeMapper` 选后端 |
| 策略 + 观察者 | 策略执行时发事件 | Style `InvokeEvent(InteractionEvent)` |
| 策略 + 责任链 | 多 listener 顺序处理 | Widget AbortFlag + Style |
| 策略 + 装饰 | 增强策略对象而非替换 | `vtkLODActor` 包装绘制，见 [06 装饰](06-decorator.md) |
| 策略 + 状态 | 管线对象内部阶段 | `vtkAlgorithm` 执行状态 vs 交互 Style 由用户切换 |

---

## 9. 完整示例：浏览 / 框选工具切换

下面示例展示：**Context 不变**，两种 **ConcreteStrategy** 热切换，并监听框选结果。

```cpp
#include <vtkActor.h>
#include <vtkCallbackCommand.h>
#include <vtkCommand.h>
#include <vtkInteractorStyleRubberBand2D.h>
#include <vtkInteractorStyleTrackballCamera.h>
#include <vtkPolyDataMapper.h>
#include <vtkRenderWindow.h>
#include <vtkRenderWindowInteractor.h>
#include <vtkRenderer.h>
#include <vtkSphereSource.h>

namespace {

void OnSelection(vtkObject* caller, unsigned long, void* clientData, void* callData) {
  auto* style = vtkInteractorStyleRubberBand2D::SafeDownCast(caller);
  if (!style || !callData) return;
  auto* region = static_cast<int*>(callData); // [x0,y0,x1,y1] 屏幕像素
  // 用 region 做 AreaPicker 或自定义逻辑
  (void)region;
  (void)clientData;
}

} // namespace

int main() {
  vtkNew<vtkSphereSource> sphere;
  vtkNew<vtkPolyDataMapper> mapper;
  mapper->SetInputConnection(sphere->GetOutputPort());
  vtkNew<vtkActor> actor;
  actor->SetMapper(mapper);

  vtkNew<vtkRenderer> renderer;
  renderer->AddActor(actor);
  vtkNew<vtkRenderWindow> rw;
  rw->AddRenderer(renderer);
  vtkNew<vtkRenderWindowInteractor> iren;
  iren->SetRenderWindow(rw);

  vtkNew<vtkInteractorStyleTrackballCamera> navStyle;
  vtkNew<vtkInteractorStyleRubberBand2D> selectStyle;

  vtkNew<vtkCallbackCommand> selCmd;
  selCmd->SetCallback(OnSelection);
  selectStyle->AddObserver(vtkCommand::SelectionChangedEvent, selCmd);

  iren->SetInteractorStyle(navStyle); // 默认浏览

  // 模拟：用户点「框选」按钮时
  // iren->SetInteractorStyle(selectStyle);
  // 完成后恢复： iren->SetInteractorStyle(navStyle);

  rw->Render();
  iren->Start();
  return 0;
}
```

设计要点：

1. `iren` 自始至终是 Context  
2. `navStyle` / `selectStyle` 是长期复用的策略实例  
3. 框选结果通过 **Observer** 传出，不把业务逻辑写进 Style 源码  
4. 恢复浏览 = 再次 `SetInteractorStyle(navStyle)` —— 纯策略切换

---

## 10. 最佳实践与常见陷阱

### 10.1 实践清单

1. **依赖抽象类型**：函数参数写 `vtkInteractorStyle*` / `vtkMapper*`，不要写死具体子类  
2. **策略实例复用**：热切换用 `vtkSmartPointer` 缓存，避免每帧 `New()`  
3. **保存默认 Style**：进入工具前 `auto* prev = iren->GetInteractorStyle()`，退出时恢复  
4. **自定义 Style 继承最近子类**：少重写、多 `Superclass::OnLeftButtonDown()`  
5. **Mapper 与数据类型对照表** 写进项目文档，防止接错  
6. **拾取容差** `SetTolerance` 按场景调，单元过密时 `CellPicker` 可能变慢  
7. **多视口** 换 Style 时检查 `CurrentRenderer`

### 10.2 陷阱

| 现象 | 常见原因 |
|------|----------|
| 换了 Style 鼠标无反应 | `Enable()` 未开、Interactor 未 `Initialize`、Renderer 未绑定 |
| 框选后无回调 | 监听对象应是 **RubberBand Style** 上的 `SelectionChangedEvent` |
| 换 Mapper 后全黑 | 输入数据类型不匹配、标量未开启、Camera 未 ResetCamera |
| 旋转与框选同时触发 | Widget 未 `GrabFocus` / 未 `AbortFlagOn()` |
| 内存泄漏感 | Style 被 Interactor 持有引用计数；但 `clientData` 原始指针仍需自己保证生命周期 |
| 把 Filter 当 Strategy 换 | Filter 改数据，应 `SetInputConnection` 更新管线，不是 `SetInteractorStyle` |

---

## 11. 一张总图

```
                    ┌──────────────────────────────────────┐
                    │     vtkRenderWindowInteractor        │
                    │  SetInteractorStyle( vtkInteractorStyle* ) │
                    └─────────────────┬────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
   TrackballCamera          RubberBand2D              ImageStyle
   （浏览策略）               （框选策略）              （窗宽窗位策略）
              │                       │
              └───────────┬───────────┘
                          ▼
                   vtkRenderer::Render()
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
         vtkActor                 vtkVolume
      SetMapper(…)             SetMapper(…)
              │                       │
      PolyDataMapper          GPUVolumeRayCastMapper
      （面片策略）              （体绘制策略）
              │                       │
              └───────────┬───────────┘
                          ▼
                    帧缓冲 / 显示

  点击选中：vtkAbstractPicker 策略（Cell / Prop / Point …）
```

---

## 12. 总结

| 问题 | 答案 |
|------|------|
| VTK 策略模式最典型落点？ | **`vtkInteractorStyle`**（交互）与 **`vtkMapper`**（绘制） |
| Context 是谁？ | 主要是 **`vtkRenderWindowInteractor`**、**`vtkActor`/`vtkVolume`** |
| 怎么切换？ | `SetInteractorStyle()`、`SetMapper()`、`SetPicker()` |
| 和 Observer 关系？ | Style 处理手势并 `InvokeEvent`；切换策略本身不依赖 Observer |
| 和 State 区别？ | Style 由**应用显式**切换，不是对象内部自动变模式 |
| 进阶组合？ | `vtkInteractorStyleSwitch`、Widget + AbortFlag、SmartVolumeMapper |

VTK 的策略模式 **不需要额外框架**：虚函数 + `SetXxx()` 持有指针 + 引用计数，就是运行期可替换算法。读懂 Interactor 壳与 Style 委托、Actor 与 Mapper 分离，就掌握了 VTK 里一半以上的「可扩展交互与显示」扩展点。

---

## 重点与注意（进阶速记）

> **重点**：`vtkRenderWindowInteractor` 官方自述为 **shell**，手势算法全在 `vtkInteractorStyle` —— 这是 Context / Strategy 最干净的一例。  
> **重点**：`SetInteractorStyle` 与 `SetMapper` 同一套路：**换实现，不改调用方**；前者管输入，后者管输出。  
> **重点**：默认 `vtkInteractorStyleSwitch` 说明 VTK 自己也把「多种 Style」再封装成一层可切换策略。  
> **注意**：策略（显式 `Set`）≠ 状态（对象内部自动变）；≠ 模板方法（`vtkAlgorithm` 管线骨架）。  
> **注意**：复杂工具用 **Widget + GrabFocus/AbortFlag**，不要无限膨胀 Style 子类。  
> **注意**：`vtkCommand` 是事件回调，不是策略；Strategy 是 **InteractorStyle / Mapper / Picker** 这类「一整条算法」的可替换对象。

---

## 延伸阅读

| 资源 | 链接 |
|------|------|
| 系列入门 | [05 策略模式](05-strategy.md) |
| 事件与回调 | [vtk-observer-and-command-pattern.md](../vtk-observer-and-command-pattern.md) |
| 责任链 / AbortFlag | [10 责任链](10-chain-of-responsibility.md) |
| 装饰 / LOD | [06 装饰](06-decorator.md) |
| StyleSwitch 官方示例 | [VTK Examples: StyleSwitch](https://examples.vtk.org/site/Cxx/Interaction/StyleSwitch/) |
| Interactor API | [vtkRenderWindowInteractor](https://vtk.org/doc/nightly/html/classvtkRenderWindowInteractor.html) |
| Style API | [vtkInteractorStyle](https://vtk.org/doc/nightly/html/classvtkInteractorStyle.html) |
| Mapper 基类 | [vtkMapper](https://vtk.org/doc/nightly/html/classvtkMapper.html) |
| 系列索引 | [README](../README.md) |

---

*文档版本：2026-07-07*  
*供 VTK 策略模式深度学习参考*
