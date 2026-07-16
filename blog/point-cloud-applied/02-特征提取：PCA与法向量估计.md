# 三维点云处理（二）：特征提取、PCA 与法向量估计

在获取原始三维点云后，我们通常面临两个工程挑战：数据密度极高（动辄数百万点）导致处理缓慢，以及缺乏结构性描述子（如表面法向量）。

本篇介绍点云基础特征处理的“三大件”：**下采样**、**离群点过滤（降噪）**，以及基于 **PCA（主成分分析）** 的**表面法向量估计**。同时，将重点修正学术算法中常见的“法向量方向不一致（符号模糊）”问题。

---

## 1. 主成分分析 (PCA) 与表面法向量的几何直觉

主成分分析（Principal Component Analysis, PCA）是最核心的几何特征提取工具。它的物理直觉非常直观：**寻找数据点分布最离散（方差最大）和最集中（方差最小）的主轴方向**。

```
                    第一主成分 (v1) -> 方差最大 (长度轴)
                      ▲
                      │     *
                    * * * * * * *
                  * * * * * * * * *
                    * * * * * * *
                      │     *
                      ▼
                    第二主成分 (v2) -> 宽度轴
```

在三维空间中，针对一个局部小区域内的点云计算协方差矩阵，并对其进行特征值分解：
1. **第一主成分 (特征向量 $v_1$)**：点分布最分散的方向，对应最大特征值 $\lambda_1$。
2. **第二主成分 (特征向量 $v_2$)**：正交于 $v_1$，对应中等特征值 $\lambda_2$。
3. **第三主成分 (特征向量 $v_3$)**：点分布最紧凑（波动极小）的方向，对应最小特征值 $\lambda_3$。

### 💡 核心原理：为什么 $v_3$ 是法向量？
对于三维物体表面上的一个局部片区（如一张平面），点云基本只在平面内两个方向展开，而在垂直于平面的厚度方向波动接近于 0。因此，点分布方差最小的方向（即第三主成分 $v_3$）就天然指向了该局部的**表面法向量**。

---

## 2. ⚠️ 符号模糊：修正法向量的方向不一致

### 2.1 问题背景
由于 PCA 特征值分解中，一个特征向量的相反方向 $-v_3$ 依然满足特征方程：
$$\Sigma (-v_3) = \lambda_3 (-v_3)$$
这意味着数学算出来的法向量可能朝外，也可能朝内，呈现出完全随机的状态。
如果将这批方向混乱的法向量直接用于光照渲染，表面会出现大量黑色坏斑；用于点云配准时，会导致算法完全无法收敛。

```
  随机未对齐的法向量：              定向对齐后的法向量（全部朝向传感器）：
  
      ↑      ↓      ↑                    ↑      ↑      ↑
    ───────────────────                ───────────────────
         物体表面                           物体表面
```

### 2.2 解决方案：朝向相机位置对齐
在实际工程应用中，我们知道激光扫描仪或相机的位置 `camera_location`。由于激光线无法穿透不透明表面，**物理上，所有的法向量都必须朝向传感器侧（朝外）**。

因此，对每个点的法向量 $N_i$，如果它与“点到相机方向向量”的夹角为钝角，就直接翻转它：
$$\text{if } N_i \cdot (\text{camera\_location} - p_i) < 0 \implies N_i = -N_i$$

在 Open3D 中，我们可以直接调用 `orient_normals_towards_camera_location` 进行自动对齐。

---

## 3. 点云降采样与降噪过滤器

在计算特征前，我们通常先对点云进行预处理：
* **体素下采样 (Voxel Downsampling)**：用一个固定大小的网格立方体（体素）包裹点云，用每个网格内部所有点的重心代替它们，使点云分布均匀且大幅减少点数。
* **统计学离群点滤除 (Statistical Outlier Removal, SOR)**：计算每个点到其 $K$ 个近邻的平均距离，统计所有平均距离的均值和标准差。去除距离异常远（超过 $\mu + \alpha \sigma$）的离散噪点。
* **半径离群点滤除 (Radius Outlier Removal, ROR)**：给定搜索半径 $R$ 和点数阈值 $M$。如果一个点周围半径 $R$ 内的点数少于 $M$，说明它是一个孤立点，予以剔除。

---

## 4. Open3D 实战：下采样、降噪与法向量估计代码

```python
import numpy as np
import open3d as o3d

# 1. 读取原始点云 (示例使用 Open3D 自带的 bunny 模型)
# 请替换为实际的点云路径，如 .ply / .pcd / .xyz
dataset = o3d.data.BunnyMesh()
mesh = o3d.io.read_triangle_mesh(dataset.path)
pcd = mesh.sample_points_uniformly(number_of_points=50000)

print(f"原始点云点数: {len(pcd.points)}")

# ==================== 步骤 A: 体素下采样 ====================
voxel_size = 0.005 # 体素边长，单位为米
pcd_down = pcd.voxel_down_sample(voxel_size)
print(f"下采样后点数: {len(pcd_down.points)}")

# ==================== 步骤 B: 统计离群点降噪 (SOR) ====================
nb_neighbors = 20 # 邻域点数
std_ratio = 2.0    # 距离乘数限制倍数 (通常 1.5 - 2.0)
pcd_clean, inlier_indices = pcd_down.remove_statistical_outlier(
    nb_neighbors=nb_neighbors,
    std_ratio=std_ratio
)
print(f"降噪后点数:   {len(pcd_clean.points)}")

# ==================== 步骤 C: PCA 法向量估计与朝向对齐 ====================
# 计算每个点周围 0.015 米范围内的协方差矩阵来进行法向量计算
search_radius = 0.015
max_nn = 30 # 最大近邻点数限制

pcd_clean.estimate_normals(
    search_param=o3d.geometry.KDTreeSearchParamHybrid(
        radius=search_radius,
        max_nn=max_nn
    )
)

# 💡 重要修正：校正法向量朝向，全部朝向相机坐标位置 [0.0, 0.0, 5.0]
camera_loc = np.array([0.0, 0.0, 5.0])
pcd_clean.orient_normals_towards_camera_location(camera_location=camera_loc)

print("法向量计算与对齐完成。")

# ==================== 步骤 D: 可视化渲染 ====================
# 按键 'N' 可以在 Open3D 可视化窗口中开关法向量线条的绘制
o3d.visualization.draw_geometries(
    [pcd_clean],
    window_name="Downsampled, Filtered bunny with Normals",
    point_show_normal=True # 默认开启法向量绘制
)
```
