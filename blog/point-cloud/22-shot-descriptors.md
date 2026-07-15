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

```
  SHOT 的球面分区结构

  径向分区 (2 层)      方位角分区 (8 份)      仰角分区 (2 份)

  ╭───────╮            ┌──┬──┬──┬──┐          ╭───────────╮
  │ inner │            │  │  │  │  │          │ upper     │
  │  ╭─╮  │            ├──┼──┼──┼──┤          │  hemisphere│
  │  ╰─╯  │            │  │  │  │  │          ├───────────┤
  │ outer │            │  │  │  │  │          │ lower     │
  ╰───────╯            └──┴──┴──┴──┘          │  hemisphere│
                                               ╰───────────╯

  总计: 2 (径向) × 8 (方位角) × 2 (仰角) = 32 个空间分区
```

每个空间分区内统计一个 11 bin 的法向量方向直方图（用法向量与关键点法向量的夹角量化）。

最终 SHOT 描述子维度：$32 \times 11 = 352$ 维。

### 1.2 与 FPFH 的本质区别

```
  FPFH (全局统计)                    SHOT (空间分区统计)

  ┌─────────────────┐              ┌──┬──┬──┬──┐
  │  ●               │              │▓▓│  │  │▓▓│
  │    ∘ ∘          │              ├──┼──┼──┼──┤
  │  ∘   ∘ ∘   ∘   │              │  │▓▓│▓▓│  │
  │    ∘     ∘      │              ├──┼──┼──┼──┤
  │  ∘   ●   ∘      │              │  │  │  │  │
  │    ∘   ∘        │              ├──┼──┼──┼──┤
  └─────────────────┘              │▓▓│  │▓▓│  │
                                   └──┴──┴──┴──┘
  全邻域统计一个直方图              各分区独立统计 → 保留空间结构
  丢失空间分布信息                 空间-角度都编码
```

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

```
  符号消歧示意

  特征向量方向 v            -v 方向
  ●  ●  ●                              ●
  ●  ●  ●                           ●  ●
  ●  ★  ●                        ●  ★  ●
  ●  ●  ●                           ●  ●
  ●  ●  ●                           ●  ●
          ●                              ●  ●  ●

  v 方向点多 → 保留 v
```

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
