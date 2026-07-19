---
title: 三维点云处理：SHOT 局部特征描述子——球面分区与方向直方图
description: 深入讲解 SHOT (Signature of Histograms of OrienTations) 描述子的构造原理——局部参考坐标系建立、球面空间分区策略、法向量方向直方图编码，以及与 FPFH 的对比分析。
---

# 三维点云处理：SHOT 局部特征描述子——球面分区与方向直方图

SHOT（Signature of Histograms of OrienTations）是 Tombari 等人于 2010 年提出的三维局部特征描述子。相比 FPFH 仅编码点对之间的角度统计，SHOT 通过**球面空间分区**同时编码了局部表面的几何形状（法向量方向分布）和空间结构（点在球形分区中的分布），是目前综合性能最优的描述子之一。

---

## 一、SHOT 的核心设计理念

### 1.1 空间-角度双重编码

SHOT 在一个以关键点为中心的球形支撑区域内，将空间划分为若干个子区域，并在每个子区域内统计法向量方向的直方图：


<svg viewBox="0 0 600 200" width="100%" style="background-color: transparent; font-family: sans-serif; margin: 20px 0; overflow: visible;">
  <!-- Radial Division (Left) -->
  <g transform="translate(100, 100)">
  <circle cx="0" cy="0" r="70" fill="rgba(22, 119, 255, 0.08)" stroke="#1677ff" stroke-width="2" />
  <circle cx="0" cy="0" r="35" fill="rgba(22, 119, 255, 0.15)" stroke="#1677ff" stroke-dasharray="3 3" stroke-width="2" />
  <circle cx="0" cy="0" r="3" fill="#1677ff" />
  <text x="0" y="-85" text-anchor="middle" font-size="13" fill="currentColor">1. 径向分区 (2层)</text>
  <text x="0" y="5" font-size="11" fill="#1677ff" text-anchor="middle">Inner</text>
  <text x="0" y="50" font-size="11" fill="#1677ff" text-anchor="middle">Outer</text>
  </g>
  <!-- Azimuth Division (Middle) -->
  <g transform="translate(300, 100)">
  <circle cx="0" cy="0" r="70" fill="rgba(82, 196, 26, 0.08)" stroke="#52c41a" stroke-width="2" />
  <line x1="0" y1="-70" x2="0" y2="70" stroke="#52c41a" stroke-width="1.5" stroke-dasharray="2 2" />
  <line x1="-70" y1="0" x2="70" y2="0" stroke="#52c41a" stroke-width="1.5" stroke-dasharray="2 2" />
  <line x1="-49.5" y1="-49.5" x2="49.5" y2="49.5" stroke="#52c41a" stroke-width="1.5" stroke-dasharray="2 2" />
  <line x1="-49.5" y1="49.5" x2="49.5" y2="-49.5" stroke="#52c41a" stroke-width="1.5" stroke-dasharray="2 2" />
  <text x="0" y="-85" text-anchor="middle" font-size="13" fill="currentColor">2. 方位角分区 (8等分)</text>
  <text x="30" y="-30" font-size="11" fill="#52c41a">45°</text>
  </g>
  <!-- Elevation Division (Right) -->
  <g transform="translate(500, 100)">
  <circle cx="0" cy="0" r="70" fill="rgba(114, 46, 209, 0.08)" stroke="#722ed1" stroke-width="2" />
  <ellipse cx="0" cy="0" rx="70" ry="20" fill="none" stroke="#722ed1" stroke-width="1.5" stroke-dasharray="4 2" />
  <text x="0" y="-85" text-anchor="middle" font-size="13" fill="currentColor">3. 仰角分区 (2等分)</text>
  <text x="0" y="-30" font-size="11" fill="#722ed1" text-anchor="middle">北半球 (Upper)</text>
  <text x="0" y="40" font-size="11" fill="#722ed1" text-anchor="middle">南半球 (Lower)</text>
  </g>
</svg>

总计: 2 (径向) × 8 (方位角) × 2 (仰角) = 32 个空间分区。


每个空间分区内统计一个 11 bin 的法向量方向直方图（用法向量与关键点法向量的夹角量化）。

最终 SHOT 描述子维度：$32 \times 11 = 352$ 维。

### 1.2 与 FPFH 的本质区别


<svg viewBox="0 0 600 200" width="100%" style="background-color: transparent; font-family: sans-serif; margin: 20px 0; overflow: visible;">
  <!-- FPFH -->
  <g transform="translate(150, 100)">
  <circle cx="0" cy="0" r="65" fill="rgba(100, 100, 100, 0.08)" stroke="currentColor" stroke-width="2" />
  <circle cx="0" cy="0" r="4" fill="#1677ff" />
  <circle cx="-35" cy="-25" r="3.5" fill="#1677ff" />
  <circle cx="35" cy="-35" r="3.5" fill="#1677ff" />
  <circle cx="-40" cy="25" r="3.5" fill="#1677ff" />
  <circle cx="25" cy="35" r="3.5" fill="#1677ff" />
  <rect x="-40" y="-95" width="80" height="20" rx="3" fill="#1677ff" opacity="0.15" stroke="#1677ff" />
  <text x="0" y="-81" font-size="11" fill="#1677ff" text-anchor="middle">单个全局直方图</text>
  <line x1="0" y1="-75" x2="0" y2="-65" stroke="#1677ff" stroke-width="1.5" />
  <text x="0" y="90" text-anchor="middle" font-size="13" fill="currentColor">FPFH (全局统计)</text>
  <text x="0" y="110" text-anchor="middle" font-size="11" fill="var(--vp-c-text-2)">全邻域统计一个直方图，丢失空间分布</text>
  </g>
  <!-- SHOT -->
  <g transform="translate(450, 100)">
  <circle cx="0" cy="0" r="65" fill="rgba(100, 100, 100, 0.08)" stroke="currentColor" stroke-width="2" />
  <circle cx="0" cy="0" r="32.5" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.5" />
  <line x1="-65" y1="0" x2="65" y2="0" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.5" />
  <line x1="0" y1="-65" x2="0" y2="65" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" opacity="0.5" />
  <circle cx="0" cy="0" r="4" fill="#52c41a" />
  <g opacity="0.8">
  <rect x="-55" y="-55" width="22" height="15" rx="2" fill="#52c41a" />
  <circle cx="-25" cy="-20" r="3.5" fill="#52c41a" />
  <rect x="33" y="-55" width="22" height="15" rx="2" fill="#52c41a" />
  <circle cx="20" cy="-25" r="3.5" fill="#52c41a" />
  <rect x="-55" y="40" width="22" height="15" rx="2" fill="#52c41a" />
  <circle cx="-25" cy="20" r="3.5" fill="#52c41a" />
  <rect x="33" y="40" width="22" height="15" rx="2" fill="#52c41a" />
  <circle cx="20" cy="25" r="3.5" fill="#52c41a" />
  </g>
  <text x="0" y="90" text-anchor="middle" font-size="13" fill="currentColor">SHOT (空间分区统计)</text>
  <text x="0" y="110" text-anchor="middle" font-size="11" fill="var(--vp-c-text-2)">各子空间独立统计直方图，保留局部结构</text>
  </g>
</svg>


> FPFH 告诉你"邻域内法向量整体偏转多少度"，但丢失了"在哪个方向偏转"的空间信息。SHOT 通过空间分区保留了这些信息，区分力显著更高。

---

## 二、局部参考坐标系（LRF）

### 2.1 为什么需要 LRF？

为了获得旋转不变性，SHOT 需要为每个关键点建立一个**唯一的、可重复的局部参考坐标系（Local Reference Frame, LRF）**。所有点相对于该 LRF 的坐标才是旋转不变的。

### 2.2 LRF 的构建——加权 PCA + 符号消歧

LRF 的三轴构建过程：

1. **计算加权协方差矩阵**（距离关键点越近权重越大）：

   $$\Sigma = \frac{1}{\sum_j (r - d_j)} \sum_{p_j \in N} (r - d_j) (p_j - p_q)(p_j - p_q)^T$$

2. **特征分解**得到正交方向，但特征向量的符号存在歧义（$v_k$ 和 $-v_k$ 都是特征向量）。

3. **符号消歧**（Sign Disambiguation）：对于每个特征向量 $v_k$，统计邻域点在该方向上的分布偏向：

$$S_k^+ = \{p_j : (p_j - p_q) \cdot v_k \ge 0\}$$
$$S_k^- = \{p_j : (p_j - p_q) \cdot v_k < 0\}$$

如果 $|S_k^+| < |S_k^-|$，则将 $v_k$ 反转为 $-v_k$。这确保了 LRF 三轴的符号一致性。

<svg viewBox="0 0 500 160" width="100%" style="background-color: transparent; font-family: sans-serif; margin: 20px 0; overflow: visible;">
  <!-- Axis line -->
  <line x1="50" y1="80" x2="450" y2="80" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" />
  <!-- Query point -->
  <polygon points="250,70 255,80 265,82 257,89 260,99 250,93 240,99 243,89 235,82 245,80" fill="#f5222d" />
  <text x="250" y="60" text-anchor="middle" font-size="11" fill="#f5222d">关键点 ★</text>
  <!-- Left Side: -v direction (Fewer points) -->
  <g transform="translate(100, 80)">
  <circle cx="-20" cy="-20" r="4" fill="var(--vp-c-text-3)" />
  <circle cx="-10" cy="15" r="4" fill="var(--vp-c-text-3)" />
  <circle cx="30" cy="-25" r="4" fill="var(--vp-c-text-3)" />
  <text x="-40" y="5" font-size="13" fill="var(--vp-c-text-2)">-v 方向 (点较稀疏)</text>
  </g>
  <!-- Right Side: +v direction (More points) -->
  <g transform="translate(350, 80)">
  <circle cx="-10" cy="-20" r="4" fill="#1677ff" />
  <circle cx="-20" cy="10" r="4" fill="#1677ff" />
  <circle cx="10" cy="25" r="4" fill="#1677ff" />
  <circle cx="20" cy="-15" r="4" fill="#1677ff" />
  <circle cx="30" cy="10" r="4" fill="#1677ff" />
  <circle cx="45" cy="-25" r="4" fill="#1677ff" />
  <line x1="-30" y1="0" x2="60" y2="0" stroke="#1677ff" stroke-width="2.5" marker-end="url(#arrow-blue-lrf)" />
  <text x="75" y="4" font-size="13" fill="#1677ff">+v 方向 (点较密集)</text>
  </g>
  <text x="250" y="140" text-anchor="middle" font-size="12" fill="var(--vp-c-text-1)">统计沿特征向量两个方向的点云分布偏向 -> 统一选择点多的一侧作为正向，消除符号模糊</text>
  <defs>
  <marker id="arrow-blue-lrf" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#1677ff" />
  </marker>
  </defs>
</svg>


### 2.3 LRF 实现的代码

```python
def compute_shot_lrf(points, query_idx, radius):
    """
    为 SHOT 描述子计算局部参考坐标系。

    :param points: N x 3
    :param query_idx: 关键点索引
    :param radius: 支撑半径
    :return: LRF 的 3x3 旋转矩阵 (列为主轴)
    """
    p_q = points[query_idx]

    # 1. 半径搜索
    dists = np.linalg.norm(points - p_q, axis=1)
    mask = dists < radius
    neighborhood = points[mask]
    neighborhood_dists = dists[mask]

    if len(neighborhood) < 10:
        return np.eye(3)

    # 2. 加权协方差矩阵
    weights = radius - neighborhood_dists
    weights = weights / weights.sum()

    centered = neighborhood - p_q
    cov = np.zeros((3, 3))
    for j, pt in enumerate(centered):
        cov += weights[j] * np.outer(pt, pt)

    # 3. 特征分解
    eigenvalues, eigenvectors = np.linalg.eigh(cov)  # 升序

    # 4. 符号消歧
    for k in range(3):
        v_k = eigenvectors[:, k]
        projections = centered @ v_k

        n_pos = np.sum(projections >= 0)
        n_neg = np.sum(projections < 0)

        if n_pos < n_neg:
            eigenvectors[:, k] = -v_k

    return eigenvectors
```

---

## 三、SHOT 描述子的构造

### 3.1 球面分区

在 LRF 中对邻域点进行空间分区：

- **径向 (Radial)**：2 份（inner sphere + outer shell）
- **仰角 (Elevation)**：2 份（upper + lower hemisphere）
- **方位角 (Azimuth)**：8 份（每份 45°）

$$32 = 2 \times 2 \times 8$$

### 3.2 每个分区内的方向直方图

在每个空间分区内，统计该分区内所有点的法向量与关键点法向量之间的夹角余弦 $\cos\theta$ 的分布，量化为 11 bins：

$$\text{bin}(\theta) = \lfloor \cos\theta \times 5.5 + 5.5 \rfloor \quad (\in [0, 10])$$

### 3.3 插值策略（避免边界效应）

SHOT 对每个邻域点使用三线性插值（trilinear interpolation）将其贡献分配到相邻的分区中，避免空间分区边界处的硬分配导致的量化伪影。

### 3.4 Python 实现

```python
def compute_shot_descriptor(points, normals, query_idx, radius=0.1,
                             n_radial=2, n_elevation=2, n_azimuth=8, n_bins=11):
    """
    计算单个关键点的 SHOT 描述子 (简化版，无插值)。

    :return: 352 维描述子向量
    """
    p_q = points[query_idx]
    n_q = normals[query_idx]
    n_q = n_q / (np.linalg.norm(n_q) + 1e-10)

    # 1. 搜索支撑域
    dists = np.linalg.norm(points - p_q, axis=1)
    mask = dists < radius
    neighbors = points[mask]
    neighbor_normals = normals[mask]
    neighbor_dists = dists[mask]

    if len(neighbors) < 10:
        return np.zeros(n_radial * n_elevation * n_azimuth * n_bins)

    # 2. 计算 LRF
    lrf = compute_shot_lrf(points, query_idx, radius)

    # 3. 转换到 LRF 坐标系
    local_neighbors = (neighbors - p_q) @ lrf  # 旋转到 LRF
    local_normals = neighbor_normals @ lrf

    # 4. 对每个邻域点进行分区和累加
    descriptor = np.zeros((n_radial, n_elevation, n_azimuth, n_bins))

    for j, pt in enumerate(local_neighbors):
        r = np.linalg.norm(pt)
        if r < 1e-10:
            continue

        # 径向分区
        r_idx = 0 if r < radius / 2 else 1
        r_idx = min(r_idx, n_radial - 1)

        # 仰角分区 (基于 z 坐标的符号)
        e_idx = 0 if pt[2] >= 0 else 1

        # 方位角分区 (基于 xy 平面中的角度)
        azimuth = np.arctan2(pt[1], pt[0])  # (-π, π)
        azimuth = (azimuth + np.pi) / (2 * np.pi)  # (0, 1)
        a_idx = int(azimuth * n_azimuth) % n_azimuth

        # 法向量夹角
        cos_theta = np.dot(local_normals[j], n_q @ lrf)
        cos_theta = np.clip(cos_theta, -1.0, 1.0)
        b_idx = int((cos_theta + 1.0) / 2.0 * n_bins)
        b_idx = np.clip(b_idx, 0, n_bins - 1)

        descriptor[r_idx, e_idx, a_idx, b_idx] += 1

    # 5. L2 归一化
    desc_flat = descriptor.ravel()
    norm = np.linalg.norm(desc_flat)
    if norm > 1e-10:
        desc_flat = desc_flat / norm

    return desc_flat
```

---

## 四、SHOT vs FPFH 对比总结

```
  描述能力对比示意

  场景: 一个点云中的"台阶"结构 (平面 + 垂直面)

  FPFH 描述子                     SHOT 描述子

  α 分布: ██░░░░░░░░             分区 [0,0,0]: ████░░░░░░░  (台阶顶面)
  φ 分布: ██████░░░░             分区 [0,0,1]: ██░░████░░░  (左上角点集)
  θ 分布: ███░░░░░░░              分区 [1,0,0]: ░░░░████░░  (台阶立面)
                                  分区 [1,1,0]: ██░░░░░░██  (右下角点集)
                                  分区 ...
  ─────────────────────           ──────────────────────────
  只告诉你"法向量偏了多少度"      告诉你"在哪个方向偏了多少度"
  无法区分对称结构                可以区分空间上不同的相似形状
```

| 维度 | FPFH | SHOT |
|------|------|------|
| **描述子维度** | 33 | 352 |
| **空间信息** | ❌ 不保留 | ✅ 球面网格分区 |
| **LRF 需求** | ❌（Darboux 框架隐式处理） | ✅（需要显式建立 LRF） |
| **旋转不变性** | ✅ | ✅（通过 LRF） |
| **噪声鲁棒性** | 好 | 极好（分区 + 直方图平滑） |
| **匹配精度** | 中等 | 高（尤其是结构丰富的场景） |
| **计算速度** | 极快 | 较快（比 PFH 快，比 FPFH 慢） |
| **存储开销** | 33 维 × 4 bytes | 352 维 × 4 bytes（大 10 倍） |

---

## 五、使用 Open3D 的 SHOT 实现

> 注意：截至 Open3D 0.18，SHOT 需要从源码编译开启 `WITH_OPENMP` 和点云特征模块。

```python
# 如果 PCL 可用，使用 PCL 的 SHOT 实现是更常见的选择
# 以下是概念性代码示意

def pcl_shot_example(source_pcd, target_pcd):
    """
    使用 PCL (Python-PCL) 进行 SHOT 特征匹配（概念示意）。
    实际项目中使用 pclpy 或 Open3D + FPFH 作为替代。
    """
    # import pclpy
    # shot_est = pclpy.shot.ShOTEstimation()
    # ...
    pass
```

在实践中，由于 SHOT 的描述子维度较高（352 维），特征匹配的存储和计算成本都高于 FPFH。对于大多数配准场景，**FPFH + ICP 的组合**已经足够精确。SHOT 更适用于需要高区分力的三维物体识别场景。

---

## 六、总结

| 概念 | 要点 |
|------|------|
| **SHOT 设计** | 球面空间分区（32 格）× 法向量方向直方图（11 bins）= 352 维 |
| **LRF** | 加权 PCA + 符号消歧 → 可重复的局部坐标系 |
| **核心优势** | 同时编码几何（法向量方向）和空间（哪个分区）信息 |
| **核心代价** | 高维（352 vs FPFH 的 33）、需要稳定 LRF |
| **适用场景** | 高精度三维物体识别、对空间结构敏感的特征匹配 |

特征点检测与描述的学习到此结束。从下一章开始，我们将进入三维点云处理的最后一个核心模块——**点云配准**，学习如何将不同视角的点云对齐到同一坐标系下。
