---
title: 三维点云处理：特征点检测引言——Harris 2D/3D 角点响应
description: 介绍三维点云特征点检测的基本概念（可重复性、显著性、信息量），从 Harris 2D 角点检测出发推广到 Harris 3D/6D，详细推导角点响应函数的数学原理与实现。
---

# 三维点云处理：特征点检测引言——Harris 2D/3D 角点响应

在完成拟合模块的学习后，我们现在进入点云处理中另一个核心主题：**特征点检测与描述**。特征点是点云配准、SLAM、三维物体识别和场景匹配的基础——它让我们能够在两帧或两个视角的点云之间找到"相同的点"。

本章从特征点的基本概念出发，讲解最经典的 Harris 角点检测及其从 2D 图像到 3D 点云的推广。

---

## 一、什么是好的特征点？

### 1.1 三大准则

一个好的特征点（Keypoint / Interest Point）应当满足：

| 准则 | 含义 | 反例 |
|------|------|------|
| **可重复性（Repeatability）** | 同一场景在不同视角/距离下能反复检测到 | 只在特定角度可见 |
| **显著性（Saliency）** | 点的局部邻域有"与众不同"的结构 | 平面上的平庸点 |
| **信息量（Informativeness）** | 包含足够的信息用于匹配 | 可重复但无法区分的点 |

### 1.2 几何类型与"角点"

从局部几何形态来看，三维表面上的点可分为三类：

```
  三维局部表面点的分类

  平面点 (Planar)              边缘点 (Edge)                角点 (Corner)
  ─────────────────────      ─────────────────────      ─────────────────────
  所有方向变化小              一个方向变化大                两个方向变化大
  两个大 + 一个小特征值       一个大 + 两个小特征值         三个特征值都显著
  Harris 响应: 低             Harris 响应: 中              Harris 响应: 高 ⭐
```

从 PCA（第三章）的局部协方差矩阵特征谱来看：

| 点类型 | 特征值分布 | Harris 3D 响应 |
|--------|-----------|---------------|
| **平面点** | $\lambda_0 \ll \lambda_1 \approx \lambda_2$ | 低（$\approx 0$） |
| **边缘点** | $\lambda_0 \approx \lambda_1 \ll \lambda_2$ | 中 |
| **角点** | $\lambda_0 \approx \lambda_1 \approx \lambda_2$ 且均显著 | **高** |

---

## 二、Harris 2D 角点检测（复习）

### 2.1 基本思想

Harris 检测器通过分析图像局部窗口中梯度的分布来识别角点：

<svg viewBox="0 0 600 200" width="100%" style="background-color: transparent; font-family: sans-serif; margin: 20px 0; overflow: visible;">
  <!-- Flat Region (Left) -->
  <g transform="translate(40, 20)">
  <text x="70" y="10" text-anchor="middle" font-size="13" fill="currentColor">1. 平坦区域 (Flat)</text>
  <rect x="10" y="25" width="120" height="120" fill="none" stroke="currentColor" stroke-width="1.5" rx="6" />
  <g stroke="var(--vp-c-text-3)" stroke-width="1.5" opacity="0.4" marker-end="url(#arrow-faded)">
  <line x1="30" y1="50" x2="33" y2="53" />
  <line x1="60" y1="45" x2="57" y2="42" />
  <line x1="90" y1="55" x2="93" y2="52" />
  <line x1="45" y1="85" x2="42" y2="88" />
  <line x1="75" y1="80" x2="78" y2="77" />
  <line x1="105" y1="95" x2="102" y2="98" />
  <line x1="50" y1="120" x2="53" y2="123" />
  <line x1="85" y1="125" x2="82" y2="122" />
  </g>
  <text x="70" y="165" text-anchor="middle" font-size="11" fill="var(--vp-c-text-2)">梯度微弱，方向随机<br/>λ₁ ≈ 0,  λ₂ ≈ 0</text>
  </g>
  <!-- Edge Region (Middle) -->
  <g transform="translate(230, 20)">
  <text x="70" y="10" text-anchor="middle" font-size="13" fill="currentColor">2. 边缘区域 (Edge)</text>
  <rect x="10" y="25" width="120" height="120" fill="none" stroke="currentColor" stroke-width="1.5" rx="6" />
  <g stroke="#1677ff" stroke-width="2" marker-end="url(#arrow-blue-harris)">
  <line x1="30" y1="50" x2="55" y2="50" />
  <line x1="30" y1="85" x2="55" y2="85" />
  <line x1="30" y1="120" x2="55" y2="120" />
  <line x1="75" y1="50" x2="100" y2="50" />
  <line x1="75" y1="85" x2="100" y2="85" />
  <line x1="75" y1="120" x2="100" y2="120" />
  </g>
  <text x="70" y="165" text-anchor="middle" font-size="11" fill="#1677ff">梯度方向单一且强烈<br/>λ₁ ≫ 0,  λ₂ ≈ 0</text>
  </g>
  <!-- Corner Region (Right) -->
  <g transform="translate(420, 20)">
  <text x="70" y="10" text-anchor="middle" font-size="13" fill="currentColor">3. 角点区域 (Corner)</text>
  <rect x="10" y="25" width="120" height="120" fill="none" stroke="currentColor" stroke-width="1.5" rx="6" />
  <g stroke="#52c41a" stroke-width="2" marker-end="url(#arrow-green-harris)">
  <line x1="30" y1="50" x2="55" y2="50" />
  <line x1="30" y1="110" x2="55" y2="110" />
  <line x1="85" y1="45" x2="85" y2="20" />
  <line x1="85" y1="105" x2="85" y2="80" />
  <line x1="50" y1="80" x2="68" y2="62" />
  <line x1="100" y1="125" x2="118" y2="107" />
  </g>
  <text x="70" y="165" text-anchor="middle" font-size="11" fill="#52c41a">梯度方向丰富且显著<br/>λ₁ ≫ 0,  λ₂ ≫ 0</text>
  </g>
  <!-- Markers -->
  <defs>
  <marker id="arrow-faded" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--vp-c-text-3)" />
  </marker>
  <marker id="arrow-blue-harris" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1677ff" />
  </marker>
  <marker id="arrow-green-harris" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#52c41a" />
  </marker>
  </defs>
</svg>

### 2.2 结构张量与角点响应

二阶矩矩阵（结构张量）$M$ 定义为图像梯度在局部窗口内的聚合：

$$M = \sum_{(x,y) \in W} w(x,y) \begin{bmatrix} I_x^2 & I_x I_y \\ I_x I_y & I_y^2 \end{bmatrix}$$

Harris 角点响应函数：

$$R = \det(M) - k \cdot (\text{tr}(M))^2 = \lambda_1 \lambda_2 - k(\lambda_1 + \lambda_2)^2$$

其中 $k \in [0.04, 0.06]$ 是经验常数。

---

## 三、Harris 3D：从 2D 到 3D 的推广

### 3.1 三维局部协方差矩阵

对于三维点云，我们用局部邻域的协方差矩阵代替梯度结构张量：

$$\Sigma(p_i) = \frac{1}{|N_i|} \sum_{p_j \in N_i} (p_j - \bar{p}_i)(p_j - \bar{p}_i)^T$$

这与 PCA 中的协方差矩阵完全一致（第四章）。

### 3.2 Harris 3D 响应函数

Harris 3D 通过比较局部协方差矩阵的三个特征值来判断点的"角点程度"：

$$R_{\text{Harris3D}} = \lambda_0 \lambda_1 \lambda_2 - k \cdot (\lambda_0 + \lambda_1 + \lambda_2)^3$$

或者使用更简单的响应：

$$R = \frac{\lambda_0 \lambda_1 \lambda_2}{\lambda_0 + \lambda_1 + \lambda_2}$$

### 3.3 Python 实现

```python
import numpy as np
from scipy.spatial import KDTree


def harris_3d_keypoints(points, knn=30, harris_k=0.04,
                        response_threshold=None, nms_radius=0.1):
    """
    Harris 3D 角点检测。

    :param points: N x 3 点云
    :param knn: 局部邻域大小 K
    :param harris_k: Harris 参数 k
    :param response_threshold: 响应值阈值 (None=自动选择前 1%)
    :param nms_radius: 非极大值抑制半径
    :return: (keypoint_indices, response_values)
    """
    N = points.shape[0]
    tree = KDTree(points)

    responses = np.zeros(N)

    for i in range(N):
        # 1. 寻找 K 近邻
        _, indices = tree.query(points[i], k=knn)
        neighborhood = points[indices]

        # 2. 局部协方差矩阵
        centroid = np.mean(neighborhood, axis=0)
        centered = neighborhood - centroid
        cov = np.cov(centered, rowvar=False)

        # 3. 特征值分解
        eigenvalues = np.linalg.eigvalsh(cov)  # 升序: l0 ≤ l1 ≤ l2
        l0, l1, l2 = eigenvalues[0], eigenvalues[1], eigenvalues[2]

        # 4. Harris 3D 响应
        det = l0 * l1 * l2
        trace = l0 + l1 + l2
        if trace > 1e-10:
            responses[i] = det / trace  # 简化形式
        else:
            responses[i] = 0.0

    # 5. 阈值筛选
    if response_threshold is None:
        # 自动选择前 1% 作为特征点
        response_threshold = np.percentile(responses, 99)

    candidate_mask = responses >= response_threshold

    # 6. 非极大值抑制 (NMS)
    keypoint_indices = non_maximum_suppression_3d(
        points, responses, candidate_mask, nms_radius
    )

    return keypoint_indices, responses[keypoint_indices]


def non_maximum_suppression_3d(points, responses, candidate_mask,
                                radius=0.1):
    """
    三维非极大值抑制：在邻域半径内只保留响应最大的点。
    """
    tree = KDTree(points)
    candidate_indices = np.where(candidate_mask)[0]
    suppressed = np.zeros(len(candidate_indices), dtype=bool)

    # 按响应值降序处理
    order = np.argsort(responses[candidate_indices])[::-1]

    for idx in order:
        if suppressed[idx]:
            continue

        pt = points[candidate_indices[idx]]
        # 抑制半径内的所有其他候选点
        neighbors = tree.query_ball_point(pt, radius)
        for n_idx in neighbors:
            if n_idx in candidate_indices and n_idx != candidate_indices[idx]:
                n_local = np.where(candidate_indices == n_idx)[0]
                if len(n_local) > 0:
                    suppressed[n_local[0]] = True

    final_indices = candidate_indices[~suppressed]
    return final_indices
```

---

## 四、Harris 6D：加入法向量信息

### 4.1 6D 联合特征

在 Harris 3D 的基础上加入法向量信息，构建 $6 \times 6$ 的联合协方差矩阵：

$$X_i = \begin{bmatrix} p_j - \bar{p}_i \\ n_j - \bar{n}_i \end{bmatrix} \in \mathbb{R}^6$$

### 4.2 优势

- Harris 3D 只能检测**几何角点**（空间中两个面的交线）。
- Harris 6D 能检测**纹理/曲率角点**——即使几何上是平面，如果法向量存在显著变化（如平面交界处），也能被检测到。

```python
def harris_6d_keypoints(pcd, knn=30, harris_k=0.04):
    """
    Harris 6D 角点检测：同时利用空间坐标和法向量。

    :param pcd: Open3D PointCloud（需要有法向量）
    :return: keypoint_indices, responses
    """
    points = np.asarray(pcd.points)
    if not pcd.has_normals():
        pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamKNN(knn))
    normals = np.asarray(pcd.normals)

    N = points.shape[0]
    tree = KDTree(points)

    responses = np.zeros(N)

    for i in range(N):
        _, indices = tree.query(points[i], k=knn)
        neighborhood_pts = points[indices]
        neighborhood_nml = normals[indices]

        # 构建 6D 联合特征
        centroid_pt = np.mean(neighborhood_pts, axis=0)
        centroid_nml = np.mean(neighborhood_nml, axis=0)

        centered_pts = neighborhood_pts - centroid_pt
        centered_nml = neighborhood_nml - centroid_nml

        # 6D 协方差
        cov_6d = np.zeros((6, 6))
        for c_pt, c_nml in zip(centered_pts, centered_nml):
            vec = np.concatenate([c_pt, c_nml])
            cov_6d += np.outer(vec, vec)
        cov_6d /= knn

        eigenvalues = np.linalg.eigvalsh(cov_6d)  # 升序

        # 响应：最小特征值最大 = 所有方向都有显著变化 = 角点
        responses[i] = eigenvalues[0]

    return harris_3d_keypoints(points, responses=responses)
```

---

## 五、关键点检测结果评估

### 5.1 可视化

```python
import open3d as o3d

def visualize_keypoints(pcd, keypoint_indices, radius_scale=0.02):
    """
    在点云上可视化检测到的关键点（用大球体标记）。
    """
    points = np.asarray(pcd.points)
    keypoints = points[keypoint_indices]

    # 创建关键点球体
    spheres = []
    bbox = pcd.get_axis_aligned_bounding_box()
    scale = np.linalg.norm(bbox.max_bound - bbox.min_bound)

    for kp in keypoints:
        sphere = o3d.geometry.TriangleMesh.create_sphere(
            radius=scale * radius_scale
        )
        sphere.translate(kp)
        sphere.paint_uniform_color([1.0, 0.0, 0.0])  # 红色
        spheres.append(sphere)

    # 原点上色为蓝色
    pcd.paint_uniform_color([0.3, 0.5, 0.8])

    o3d.visualization.draw_geometries([pcd] + spheres)
```

### 5.2 可重复率评估准则

给定同一场景的两帧点云 $S$ 和 $T$ 以及真实的刚体变换 $(R, t)$，关键点的可重复率定义为：

$$\text{Repeatability} = \frac{|\mathcal{K}_S \cap \mathcal{K}_T|}{|\mathcal{K}_S \cup \mathcal{K}_T|}$$

其中一个关键点 $k_S \in \mathcal{K}_S$ 被认为在 $\mathcal{K}_T$ 中有对应，如果：

$$\min_{k_T \in \mathcal{K}_T} \|R k_S + t - k_T\| < \epsilon$$

---

## 六、总结

| 概念 | 要点 |
|------|------|
| **好特征点的标准** | 可重复性、显著性、信息量 |
| **Harris 2D** | 图像梯度结构张量 → $\det(M) - k \cdot \text{tr}^2(M)$ |
| **Harris 3D** | 局部协方差矩阵的特征值 → 三个方向变化都显著的"角点" |
| **Harris 6D** | 协方差扩展为 6D（坐标 + 法向量）→ 能检测几何/曲率角点 |
| **NMS** | 非极大值抑制确保特征点在空间上分散分布 |

Harris 检测器是点云特征检测的起点，但它有几个局限：对尺度变化不鲁棒、在均匀曲面上响应低。下一章将学习 **ISS（固有形状特征）**——一种基于特征值比率的更鲁棒的关键点检测方法，也是目前工业界最广泛使用的三维关键点检测器之一。
