# 三维点云处理（二）：特征提取、PCA 与法向量估计

在获取原始三维点云后，我们通常面临两个工程挑战：数据密度极高（动辄数百万点）导致处理缓慢，以及缺乏结构性描述子（如表面法向量）。

本篇介绍点云基础特征处理的“三大件”：**下采样**、**离群点过滤（降噪）**，以及基于 **PCA（主成分分析）** 的**表面法向量估计**。同时，将重点修正学术算法中常见的“法向量方向不一致（符号模糊）”问题。

---

## 1. 主成分分析 (PCA) 与表面法向量的几何直觉

主成分分析（Principal Component Analysis, PCA）是最核心的几何特征提取工具。它的物理直觉非常直观：**寻找数据点分布最离散（方差最大）和最集中（方差最小）的主轴方向**。


<svg viewBox="0 0 420 240" width="100%" style="background-color: transparent; font-family: sans-serif; margin: 20px auto; display: block; overflow: visible;">
  <!-- Point cloud distribution (rendered as light dots) -->
  <g fill="var(--vp-c-text-3)" opacity="0.6">
  <circle cx="210" cy="120" r="2.5" />
  <circle cx="240" cy="115" r="2.5" />
  <circle cx="180" cy="125" r="2.5" />
  <circle cx="220" cy="100" r="2.5" />
  <circle cx="200" cy="140" r="2.5" />
  <circle cx="260" cy="125" r="2.5" />
  <circle cx="160" cy="115" r="2.5" />
  <circle cx="230" cy="130" r="2.5" />
  <circle cx="190" cy="110" r="2.5" />
  <circle cx="250" cy="105" r="2.5" />
  <circle cx="170" cy="135" r="2.5" />
  <circle cx="280" cy="120" r="2.5" />
  <circle cx="140" cy="120" r="2.5" />
  <circle cx="210" cy="90" r="2.5" />
  <circle cx="210" cy="150" r="2.5" />
  <circle cx="230" cy="105" r="2.5" />
  <circle cx="190" cy="135" r="2.5" />
  <circle cx="270" cy="112" r="2.5" />
  <circle cx="150" cy="128" r="2.5" />
  </g>
  <!-- Covariance ellipse contour -->
  <ellipse cx="210" cy="120" rx="90" ry="45" fill="none" stroke="currentColor" stroke-dasharray="4 4" stroke-width="1.5" opacity="0.5" />
  <!-- Axis v1 (Major) -->
  <line x1="120" y1="120" x2="300" y2="120" stroke="#1677ff" stroke-width="2.5" marker-end="url(#arrow-blue-end)" marker-start="url(#arrow-blue-start)" />
  <text x="305" y="124" font-size="12" fill="#1677ff">v1</text>
  <text x="210" y="55" text-anchor="middle" font-size="12" fill="#1677ff">第一主成分 v1 (最大方差 / 长度轴)</text>
  <!-- Axis v2 (Minor) -->
  <line x1="210" y1="75" x2="210" y2="165" stroke="#52c41a" stroke-width="2.5" marker-end="url(#arrow-green-end)" marker-start="url(#arrow-green-start)" />
  <text x="210" y="200" text-anchor="middle" font-size="12" fill="#52c41a">v2</text>
  <text x="210" y="218" text-anchor="middle" font-size="12" fill="#52c41a">第二主成分 v2 (宽度轴)</text>
  <!-- Markers -->
  <defs>
  <marker id="arrow-blue-end" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1677ff" />
  </marker>
  <marker id="arrow-blue-start" viewBox="0 0 10 10" refX="4" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill="#1677ff" />
  </marker>
  <marker id="arrow-green-end" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#52c41a" />
  </marker>
  <marker id="arrow-green-start" viewBox="0 0 10 10" refX="4" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill="#52c41a" />
  </marker>
  </defs>
</svg>


在数学上，针对查询点 $p$ 的 $k$ 邻域点集 $\{p_1, p_2, \dots, p_k\}$，我们首先计算其局部质心 $\bar{p} = \frac{1}{k} \sum_{i=1}^k p_i$，然后构建其**协方差矩阵 (Covariance Matrix)** $\mathbf{\Sigma} \in \mathbb{R}^{3 \times 3}$：
$$\mathbf{\Sigma} = \frac{1}{k} \sum_{i=1}^k (p_i - \bar{p})(p_i - \bar{p})^T$$

接着，对协方差矩阵进行特征值分解 (Eigenvalue Decomposition)：
$$\mathbf{\Sigma} v_j = \lambda_j v_j, \quad j \in \{1, 2, 3\}$$
其中，特征值按降序排列：$\lambda_1 \ge \lambda_2 \ge \lambda_3 \ge 0$，对应的特征向量分别为 $v_1, v_2, v_3$。

* **第一主成分 (特征向量 $v_1$)**：点分布方差最大的主轴方向。
* **第二主成分 (特征向量 $v_2$)**：正交于 $v_1$ 且方差次大的方向。
* **第三主成分 (特征向量 $v_3$)**：正交于 $v_1$ 和 $v_2$，点分布波动最小（方差最小）的方向。

### 核心原理：为什么 $v_3$ 是表面法向量？
对于三维物体表面（如墙面、路面或零件表面）上的局部点集，其点云主要在表面切线方向展开，而在垂直于表面的法线方向起伏最小（理想状态下厚度方差为 0）。因此，**对应最小特征值 $\lambda_3$ 的特征向量 $v_3$ 天然指向了局部的表面法向量方向。**

同时，根据特征值 $\lambda_1, \lambda_2, \lambda_3$ 的相对大小关系，我们还可以对局部的**空间形状（Dimensionality）**进行分类描述：
* **线性特征 (Linear / 1D)**：$\lambda_1 \gg \lambda_2 \approx \lambda_3$，点云呈条状分布（如电线、树枝、拐角边界）。
* **平面特征 (Planar / 2D)**：$\lambda_1 \approx \lambda_2 \gg \lambda_3$，点云呈片状分布（如墙壁、路面）。
* **体特征 (Volumetric / 3D)**：$\lambda_1 \approx \lambda_2 \approx \lambda_3$，点云呈球状/乱序分布（如树叶丛、噪点堆）。
* **局部表面粗糙度/曲率 (Curvature / Surface Variation)** 估算公式：
  $$\sigma = \frac{\lambda_3}{\lambda_1 + \lambda_2 + \lambda_3}$$
  当 $\sigma \approx 0$ 时，表明局部区域极度平坦；$\sigma$ 越大，表明局部表面起伏或弯曲度越高。

---

## 2. ️ 符号模糊：修正法向量的方向不一致

### 2.1 问题背景
由于 PCA 特征值分解中，一个特征向量的相反方向 $-v_3$ 依然满足特征方程：
$$\Sigma (-v_3) = \lambda_3 (-v_3)$$
这意味着数学算出来的法向量可能朝外，也可能朝内，呈现出完全随机的状态。
如果将这批方向混乱的法向量直接用于光照渲染，表面会出现大量黑色坏斑；用于点云配准时，会导致算法完全无法收敛。


<svg viewBox="0 0 600 140" width="100%" style="background-color: transparent; font-family: sans-serif; margin: 20px 0; overflow: visible;">
  <!-- Left Side: Unaligned Normals -->
  <g transform="translate(50, 20)">
  <text x="100" y="0" text-anchor="middle" font-size="13" fill="currentColor">随机未对齐的法向量</text>
  <!-- Surface line -->
  <line x1="20" y1="70" x2="180" y2="70" stroke="currentColor" stroke-width="2" />
  <text x="100" y="90" text-anchor="middle" font-size="11" fill="var(--vp-c-text-2)">物体表面</text>
  <!-- Normals (chaotic directions) -->
  <circle cx="45" cy="70" r="3" fill="#1677ff" />
  <line x1="45" y1="70" x2="45" y2="35" stroke="#f5222d" stroke-width="2" marker-end="url(#arrow-red-normal)" />
  <circle cx="95" cy="70" r="3" fill="#1677ff" />
  <line x1="95" y1="70" x2="95" y2="105" stroke="#f5222d" stroke-width="2" marker-end="url(#arrow-red-normal)" />
  <circle cx="145" cy="70" r="3" fill="#1677ff" />
  <line x1="145" y1="70" x2="145" y2="35" stroke="#f5222d" stroke-width="2" marker-end="url(#arrow-red-normal)" />
  </g>
  <!-- Right Side: Aligned Normals -->
  <g transform="translate(350, 20)">
  <text x="100" y="0" text-anchor="middle" font-size="13" fill="currentColor">定向对齐后的法向量 (统一朝传感器面)</text>
  <!-- Surface line -->
  <line x1="20" y1="70" x2="180" y2="70" stroke="currentColor" stroke-width="2" />
  <text x="100" y="90" text-anchor="middle" font-size="11" fill="var(--vp-c-text-2)">物体表面</text>
  <!-- Normals (all up) -->
  <circle cx="45" cy="70" r="3" fill="#1677ff" />
  <line x1="45" y1="70" x2="45" y2="35" stroke="#52c41a" stroke-width="2" marker-end="url(#arrow-green-normal)" />
  <circle cx="95" cy="70" r="3" fill="#1677ff" />
  <line x1="95" y1="70" x2="95" y2="35" stroke="#52c41a" stroke-width="2" marker-end="url(#arrow-green-normal)" />
  <circle cx="145" cy="70" r="3" fill="#1677ff" />
  <line x1="145" y1="70" x2="145" y2="35" stroke="#52c41a" stroke-width="2" marker-end="url(#arrow-green-normal)" />
  </g>
  <defs>
  <marker id="arrow-red-normal" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f5222d" />
  </marker>
  <marker id="arrow-green-normal" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#52c41a" />
  </marker>
  </defs>
</svg>


### 2.2 解决方案一：视点一致性约束 (Viewport Check)
在移动机器人、激光扫描等有明确传感器源头（视点）的系统中，我们知道传感器的坐标 $\vec{v}_c = (x_c, y_c, z_c)$。物理上，由于固体表面不透光，**从表面发射出来的法向量 $\vec{n}_i$ 必须朝向视点方向（传感器外侧）**。

因此，对每个计算出的局部法向量 $\vec{n}_i$ 与向量 $\vec{v}_c - \vec{p}_i$ 进行点积判断：
$$\text{if } \vec{n}_i \cdot (\vec{v}_c - \vec{p}_i) < 0 \implies \vec{n}_i \leftarrow -\vec{n}_i$$
这个约束非常高效，运算复杂度为 $\mathcal{O}(N)$。在 Open3D 中，我们可以直接调用 `orient_normals_towards_camera_location` 来进行全自动对齐。

### 2.3 解决方案二：最小生成树法向量传播 (MST Normal Propagation)
如果场景包含多视角拼接的杂乱点云（即无法界定单一视点 $\vec{v}_c$ ），或者物体具有高度复杂的遮挡折叠结构，仅靠视点约束会出现局部的“阴阳面”不一致。这时工业界标准算法为**图论最小生成树传播（MST）**：
1. **构建邻接图**：以点云的每个点为节点，向邻近点建立有向边，边的权重定义为两个节点法向量的夹角余弦值：$w_{ij} = 1 - |\vec{n}_i \cdot \vec{n}_j|$。夹角越小，权重越接近于 0，表示局部面越平滑。
2. **生成最小生成树**：利用普里姆 (Prim) 或克鲁斯卡尔 (Kruskal) 算法，构建覆盖全局所有点云的最小生成树 (Minimum Spanning Tree, MST)。
3. **法向传播对齐**：选择一个高置信度的点（如曲率最低处的点）作为根节点，确定其法向为正方向。然后沿着 MST 边缘向外广度优先遍历 (BFS) 传播：如果邻居节点法向与父节点乘积为负（$\vec{n}_j \cdot \vec{n}_i < 0$），则翻转邻居节点的法向量：$\vec{n}_j \leftarrow -\vec{n}_j$。以此实现全场景表面法向的高度连续和一致。

---

## 3. 点云降采样与降噪过滤器

在计算高级特征前，由于原始数据量极其庞大且饱含测量噪声，我们必须通过下采样和滤波管道进行“去粗取精”：

1. **体素下采样 (Voxel Downsampling / Grid Filter)**：
   * **原理**：将三维空间划分为规则的网格立方体（体素 Voxel）。在每个被占用的体素内部，计算所有落入其中点云坐标的**重心/质心 (Centroid)**，并用该重心代替体素内的所有点。
     $$p_{\text{centroid}} = \frac{1}{M} \sum_{i=1}^M p_i$$
   * **价值**：点云分布将变得极其均匀，大幅削减无谓的点数，且在滤除随机噪声的同时极好地保留了宏观几何结构。
2. **统计学离群点滤除 (Statistical Outlier Removal, SOR)**：
   * **算法机制**：计算每个点 $p_i$ 到其最近的 $k$ 个邻居的平均距离 $d_i = \frac{1}{k} \sum_{j=1}^k d(p_i, p_j)$。计算整个点云中所有点平均距离的全局均值 $\mu$ 与标准差 $\sigma$。
   * **过滤判据**：对于任何点 $p_i$，如果它的局部平均距离异常远，即满足：
     $$d_i > \mu + \alpha \cdot \sigma$$
     则将其标记为离群孤立噪声并删除。这里 $\alpha$ 为控制严格程度的倍数因子（`std_ratio`，通常设为 $1.0 \sim 2.0$）。
   * **优缺点**：**极其鲁棒**。能够有效应对密度分布不均场景下的细微噪点，但需要构建全局近邻关系，在大规模场景下计算量稍大。
3. **半径离群点滤除 (Radius Outlier Removal, ROR)**：
   * **算法机制**：指定搜索半径 $R$ 和点数阀值 $M$。遍历每个点，统计以该点为球心、以 $R$ 为半径的范围内包含的邻域点个数 $k_i$：
     $$\text{if } k_i < M \implies \text{剔除该点}$$
   * **优缺点**：逻辑简单，运行效率高。但对于远近密度差异极大的激光雷达（LiDAR）点云效果不佳（远处的正常稀疏点极易被误杀）。

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

# 重要修正：校正法向量朝向，全部朝向相机坐标位置 [0.0, 0.0, 5.0]
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
