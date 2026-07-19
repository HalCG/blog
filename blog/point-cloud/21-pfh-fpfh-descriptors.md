---
title: 三维点云处理：PFH 与 FPFH 点特征直方图描述子
description: 深入讲解 PFH (Point Feature Histogram) 和 FPFH (Fast PFH) 局部几何描述子的数学原理，包括 Darboux 坐标系的构建、四元组角度特征的计算、直方图离散化策略及其在点云配准特征匹配中的应用。
---

# 三维点云处理：PFH 与 FPFH 点特征直方图描述子

检测到关键点只是第一步。为了让两个不同视角的关键点能够相互识别，我们需要为每个关键点构建一个**局部特征描述子（Descriptor）**——一个高维向量，编码了该点周围局部表面的几何形状信息。

**PFH（Point Feature Histogram）** 和它的加速版本 **FPFH（Fast Point Feature Histogram）** 是三维计算机视觉中最经典、最广泛使用的局部几何描述子。

---

## 一、描述子的设计要求

一个好的三维局部描述子应满足：

| 要求 | 含义 | 反例 |
|------|------|------|
| **刚体不变性** | 旋转/平移不改变描述子 | 依赖坐标绝对值的描述 |
| **采样密度鲁棒** | 不同分辨率的扫描产生相近描述子 | 对点间距敏感的统计 |
| **噪声鲁棒** | 传感器噪声不显著改变描述子 | 直接用梯度/曲率 |
| **区分力** | 不同几何形状产生明显不同的描述子 | 只有空间坐标的简单统计 |

---

## 二、PFH 的核心数学构造

### 2.1 Darboux 坐标系

PFH 为一对点 $(p_s, p_t)$ 构建局部 Darboux 坐标系（UVW 框架）：


<svg viewBox="0 0 600 240" width="100%" style="background-color: transparent; font-family: sans-serif; margin: 20px auto; display: block; overflow: visible;">
  <!-- Point ps (source) -->
  <g transform="translate(180, 140)">
  <circle cx="0" cy="0" r="5" fill="#1677ff" />
  <text x="-12" y="22" font-size="13" fill="currentColor">p_s (Source)</text>
  <!-- Axis u = n_s -->
  <line x1="0" y1="0" x2="0" y2="-90" stroke="#f5222d" stroke-width="2.5" marker-end="url(#arrow-red-darboux)" />
  <text x="12" y="-80" font-size="12" fill="#f5222d">u = n_s</text>
  <!-- Axis v = u x (pt-ps)/||pt-ps|| -->
  <line x1="0" y1="0" x2="-75" y2="45" stroke="#52c41a" stroke-width="2.5" marker-end="url(#arrow-green-darboux)" />
  <text x="-80" y="65" font-size="12" fill="#52c41a">v = u × (p_t - p_s) / ||d||</text>
  <!-- Axis w = u x v -->
  <line x1="0" y1="0" x2="100" y2="40" stroke="#722ed1" stroke-width="2.5" marker-end="url(#arrow-purple-darboux)" />
  <text x="80" y="60" font-size="12" fill="#722ed1">w = u × v</text>
  </g>
  <!-- Point pt (target) -->
  <g transform="translate(420, 90)">
  <circle cx="0" cy="0" r="5" fill="#fa8c16" />
  <text x="12" y="-12" font-size="13" fill="currentColor">p_t (Target)</text>
  <!-- Normal n_t -->
  <line x1="0" y1="0" x2="30" y2="-70" stroke="#fa8c16" stroke-width="2" marker-end="url(#arrow-orange-darboux)" />
  <text x="40" y="-60" font-size="12" fill="#fa8c16">n_t</text>
  </g>
  <!-- Vector connecting ps and pt -->
  <line x1="180" y1="140" x2="420" y2="90" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.6" />
  <text x="300" y="105" font-size="12" fill="var(--vp-c-text-2)" text-anchor="middle">d = ||p_t - p_s||</text>
  <!-- Markers -->
  <defs>
  <marker id="arrow-red-darboux" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f5222d" />
  </marker>
  <marker id="arrow-green-darboux" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#52c41a" />
  </marker>
  <marker id="arrow-purple-darboux" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#722ed1" />
  </marker>
  <marker id="arrow-orange-darboux" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#fa8c16" />
  </marker>
  </defs>
</svg>


$$u = n_s$$
$$v = u \times \frac{p_t - p_s}{\|p_t - p_s\|_2}$$
$$w = u \times v$$

### 2.2 四元组角度特征（SPFH 特征）

在 Darboux 框架中，两点之间的相对几何关系被编码为三个角度和一个距离：

$$\alpha = v \cdot n_t$$

$$\phi = u \cdot \frac{p_t - p_s}{d}$$

$$\theta = \arctan(w \cdot n_t, u \cdot n_t)$$

$$d = \|p_t - p_s\|_2$$

```
  四元组角度的几何含义

  α (alpha):  target 法向量在 v-w 平面上的投影 → n_t 与 n_s 的"面外"倾斜
  φ (phi):    p_t-p_s 方向与 n_s 的夹角 → 两点的"高度差"方向
  θ (theta):  n_t 在 u-w 平面上的偏转 → n_t 绕 n_s 的旋转
  d:          两点间的欧氏距离
```

### 2.3 PFH 的计算

对于关键点 $p_q$，PFH 考虑其球邻域（半径 $r$）内所有点对的两两关系：

1. 找到 $p_q$ 的 $K$ 个邻域点。
2. 对邻域内所有 $\binom{K+1}{2}$ 对点，计算 $(\alpha, \phi, \theta, d)$。
3. 将每个角度或距离量化为 $b$ 个 bin（通常 $b=5$），拼接为一个 $b^3$（或 $b^4$）维直方图。

```
  PFH vs FPFH 的邻域关系图

  PFH (完全连接)              FPFH (星形连接 + 聚合)

  p_q ●──● neighbor          p_q ●──● neighbor
      │╲ ╱│                       │
      │ ╳ │                        ╲
      │╱ ╲│                          ●
      ●───●                            ╲
                                         ●

  复杂度: O(K²)                 复杂度: O(K)
  125 维 (5³)                   33 维 (SPFH = 3×11)
```

---

## 三、FPFH：快速点特征直方图

### 3.1 加速策略

PFH 的 $O(K^2)$ 复杂度在邻域较大时（$K=50$）计算代价很高。FPFH 将复杂度降至 $O(K)$，通过两步：

**Step 1: SPFH（Simplified PFH）**

只计算关键点 $p_q$ 与每个邻居 $p_k$ 之间的三组角度 $(\alpha, \phi, \theta)$，量化为 $3 \times 11 = 33$ 维直方图。

**Step 2: 加权聚合**

对每个邻居 $p_k$，也计算其 SPFH。最终 FPFH 是查询点 SPFH 和邻居 SPFH 的加权和：

$$FPFH(p_q) = SPFH(p_q) + \frac{1}{K} \sum_{k=1}^K \frac{1}{\omega_k} \cdot SPFH(p_k)$$

其中权重 $\omega_k$ 是 $p_q$ 与 $p_k$ 之间的距离。

### 3.2 Python 实现

```python
import numpy as np
from scipy.spatial import KDTree


def compute_spfh(points, normals, query_idx, neighbor_indices):
    """
    计算单个点的 Simplified PFH (SPFH)。

    :param points: N x 3 点云
    :param normals: N x 3 法向量
    :param query_idx: 查询点索引
    :param neighbor_indices: 邻域点索引列表
    :return: 33 维 SPFH 直方图 (α, φ, θ 各 11 bins)
    """
    n_bins = 11
    hist_alpha = np.zeros(n_bins)
    hist_phi = np.zeros(n_bins)
    hist_theta = np.zeros(n_bins)

    p_q = points[query_idx]
    n_q = normals[query_idx]
    # 确保法向量是单位向量
    n_q = n_q / (np.linalg.norm(n_q) + 1e-10)

    for k_idx in neighbor_indices:
        if k_idx == query_idx:
            continue

        p_k = points[k_idx]
        n_k = normals[k_idx]
        n_k = n_k / (np.linalg.norm(n_k) + 1e-10)

        # Darboux 坐标系
        diff = p_k - p_q
        d = np.linalg.norm(diff)
        if d < 1e-10:
            continue

        u = n_q
        v = np.cross(u, diff / d)
        v_norm = np.linalg.norm(v)
        if v_norm < 1e-10:
            continue
        v = v / v_norm
        w = np.cross(u, v)

        # 三个角度特征
        alpha = np.dot(v, n_k)
        phi = np.dot(u, diff) / d
        theta = np.arctan2(np.dot(w, n_k), np.dot(u, n_k))

        # 量化到直方图 bin
        # α, φ ∈ (-1, 1), θ ∈ (-π, π)
        bin_alpha = int((alpha + 1.0) / 2.0 * n_bins)
        bin_phi = int((phi + 1.0) / 2.0 * n_bins)
        bin_theta = int((theta + np.pi) / (2 * np.pi) * n_bins)

        bin_alpha = np.clip(bin_alpha, 0, n_bins - 1)
        bin_phi = np.clip(bin_phi, 0, n_bins - 1)
        bin_theta = np.clip(bin_theta, 0, n_bins - 1)

        hist_alpha[bin_alpha] += 1
        hist_phi[bin_phi] += 1
        hist_theta[bin_theta] += 1

    return np.concatenate([hist_alpha, hist_phi, hist_theta])


def compute_fpfh(points, normals, query_indices, knn=30):
    """
    计算一组查询点的 FPFH 特征。

    :param points: N x 3 点云
    :param normals: N x 3 法向量
    :param query_indices: 要计算特征的查询点索引
    :param knn: 邻域点数
    :return: M x 33 FPFH 特征矩阵
    """
    N = points.shape[0]
    tree = KDTree(points)

    # 预计算所有点的 SPFH（如果查询点 == 所有点）
    all_spfh = {}

    def get_spfh(idx):
        if idx not in all_spfh:
            _, neighbors = tree.query(points[idx], k=knn)
            all_spfh[idx] = compute_spfh(points, normals, idx, neighbors)
        return all_spfh[idx]

    fpfh_features = np.zeros((len(query_indices), 33))

    for i, q_idx in enumerate(query_indices):
        _, neighbors = tree.query(points[q_idx], k=knn)

        # SPFH of query point
        spfh_q = get_spfh(q_idx)

        # 加权聚合邻居的 SPFH
        weighted_sum = np.zeros(33)
        weight_sum = 0.0

        for k in neighbors:
            if k == q_idx:
                continue
            dist = np.linalg.norm(points[q_idx] - points[k])
            weight = 1.0 / (dist + 1e-10)

            spfh_k = get_spfh(k)
            weighted_sum += weight * spfh_k
            weight_sum += weight

        fpfh_features[i] = spfh_q + weighted_sum / (weight_sum + 1e-10)

    return fpfh_features
```

### 3.3 Open3D 内置 FPFH

```python
import open3d as o3d


def open3d_fpfh_demo(pcd):
    """
    使用 Open3D 计算 FPFH 特征并进行特征匹配。
    """
    # 1. 计算法向量（FPFH 的前提）
    if not pcd.has_normals():
        pcd.estimate_normals(
            search_param=o3d.geometry.KDTreeSearchParamKNN(30)
        )

    # 2. ISS 关键点检测
    keypoints = o3d.geometry.keypoint.compute_iss_keypoints(
        pcd, salient_radius=0.05, non_max_radius=0.08,
        gamma_21=0.975, gamma_32=0.975, min_neighbors=5
    )

    # 3. 计算 FPFH 特征
    fpfh = o3d.pipelines.registration.compute_fpfh_feature(
        pcd,
        o3d.geometry.KDTreeSearchParamKNN(30)
    )
    # fpfh.data 是一个 33 x N 的数组

    print(f"FPFH 特征维度: {fpfh.data.shape[0]} x {fpfh.data.shape[1]}")
    print(f"  (33 维特征 x {fpfh.data.shape[1]} 个点)")

    return keypoints, fpfh
```

---

## 四、特征匹配与配准

FPFH 的典型用途是在两帧点云之间进行特征匹配：

```python
def match_fpfh_features(source_pcd, target_pcd, voxel_size=0.05):
    """
    基于 FPFH 特征的 RANSAC 粗配准。
    """
    # 1. 下采样
    src_down = source_pcd.voxel_down_sample(voxel_size)
    tgt_down = target_pcd.voxel_down_sample(voxel_size)

    # 2. 法向量
    src_down.estimate_normals(o3d.geometry.KDTreeSearchParamKNN(30))
    tgt_down.estimate_normals(o3d.geometry.KDTreeSearchParamKNN(30))

    # 3. FPFH
    src_fpfh = o3d.pipelines.registration.compute_fpfh_feature(
        src_down, o3d.geometry.KDTreeSearchParamKNN(30)
    )
    tgt_fpfh = o3d.pipelines.registration.compute_fpfh_feature(
        tgt_down, o3d.geometry.KDTreeSearchParamKNN(30)
    )

    # 4. RANSAC 全局配准
    distance_threshold = voxel_size * 1.5
    result = o3d.pipelines.registration.registration_ransac_based_on_feature_matching(
        src_down, tgt_down, src_fpfh, tgt_fpfh,
        mutual_filter=True,
        max_correspondence_distance=distance_threshold,
        estimation_method=o3d.pipelines.registration.TransformationEstimationPointToPoint(),
        ransac_n=3,
        checkers=[
            o3d.pipelines.registration.CorrespondenceCheckerBasedOnEdgeLength(0.9),
            o3d.pipelines.registration.CorrespondenceCheckerBasedOnDistance(distance_threshold)
        ],
        criteria=o3d.pipelines.registration.RANSACConvergenceCriteria(1000000, 0.999)
    )

    print(f"RANSAC 配准结果: fitness={result.fitness:.3f}, "
          f"inlier_rmse={result.inlier_rmse:.4f}")

    return result.transformation, result
```

---

## 五、FPFH vs PFH vs SHOT

| 描述子 | 维度 | 复杂度 | 特征类型 | 旋转不变性 |
|--------|------|--------|----------|-----------|
| **PFH** | 125 (5³) | $O(NK^2)$ | 几何 | ✅（基于局部坐标框架） |
| **FPFH** | 33 | $O(NK)$ | 几何 | ✅ |
| **SHOT** | 352 | $O(NK)$ | 几何 + 空间分布 | ✅ |
| **3DSC** | 1980 | $O(NK)$ | 空间分布 | ✅ |
| **RoPS** | 135 | $O(NK)$ | 几何投影 | ✅ |

---

## 六、总结

| 概念 | 要点 |
|------|------|
| **Darboux 框架** | 以源点法向量为 $u$ 轴的局部 UVW 坐标系 |
| **四元组特征** | $(\alpha, \phi, \theta, d)$——两个点之间的全部相对几何信息 |
| **PFH** | 邻域内所有点对的两两关系（$O(K^2)$），125 维 |
| **FPFH** | 星形连接 + 邻居 SPFH 加权聚合（$O(K)$），33 维 |
| **旋转不变性** | 由于 Darboux 坐标系仅依赖法向量，整体旋转不影响角度特征 |
| **典型应用** | FPFH 是 RANSAC 粗配准中最常用的特征描述子 |

FPFH 虽然速度快，但其描述能力受到 33 维直方图的限制。下一章将学习 **SHOT（Signature of Histograms of OrienTations）** 描述子——它在局部球面网格中同时编码几何信息和空间分布，是精度最高的局部描述子之一。
