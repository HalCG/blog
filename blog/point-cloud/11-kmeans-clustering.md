---
title: 三维点云处理：K-Means 聚类——原理推导、代码详解与点云应用
description: 深入推导 K-Means 算法的数学原理（Lloyd 迭代的收敛性）、K-Means++ 初始化策略与 Elkan 加速技巧，给出完整 Python 实现及其在点云分割中的应用。
---

# 三维点云处理：K-Means 聚类——原理推导、代码详解与点云应用

K-Means 是最经典、最广泛使用的划分式聚类算法。尽管它诞生于 1957 年（Stuart Lloyd 在 Bell 实验室），至今仍是点云预处理、颜色量化和初始物体分割的首选工具之一。

---

## 一、K-Means 的问题定义与优化目标

### 1.1 优化目标

给定 $N$ 个点 $\{p_1, \ldots, p_N\} \subset \mathbb{R}^d$ 和预设的簇数 $K$，K-Means 的目标是最小化**簇内平方误差和（Within-Cluster Sum of Squares, WCSS）**：

$$\min_{C, \mu} \sum_{k=1}^K \sum_{p_i \in C_k} \|p_i - \mu_k\|_2^2$$

其中：
- $C_k \subset \{1, \ldots, N\}$ 是第 $k$ 个簇的点索引集合
- $\mu_k \in \mathbb{R}^d$ 是第 $k$ 个簇的中心（质心）

```
  K-Means 的几何直观 (K=3, 2D 数据)

  初始随机选择质心              迭代收敛后的结果

     ○ ○ ○
        ○  ●₁                   ┌───●₁───┐
      ○  ○                      │  ○ ○ ○ │
   ●₂         ○    ○            │    ○ ○  │
         ○       ○              └─────────┘
     ○    ○                     ┌───●₂───┐
          ○          ●₃         │ ○ ○  ○ │
     ○       ○   ○              │  ○   ○ ○│
       ○   ○    ○               └─────────┘
                                ┌───●₃───┐
  ● = 质心                       │○ ○ ○ ○ │
                                │ ○ ○  ○ │
                                └─────────┘
```

### 1.2 为什么是 $L_2$ 范数？

使用欧氏距离平方有一个关键性质：**质心 $\mu_k$ 的最优解恰好是簇内点的算术平均**。

证明：对目标函数关于 $\mu_k$ 求导：
$$\frac{\partial}{\partial \mu_k} \sum_{p_i \in C_k} \|p_i - \mu_k\|^2 = -2 \sum_{p_i \in C_k} (p_i - \mu_k) = 0$$

$$\implies \mu_k^* = \frac{1}{|C_k|} \sum_{p_i \in C_k} p_i$$

---

## 二、Lloyd 迭代算法

### 2.1 标准算法流程

K-Means 通过交替执行以下两步直到收敛：

```
  ┌─────────────────────────────────────────────────┐
  │             K-Means Lloyd 迭代                    │
  ├─────────────────────────────────────────────────┤
  │                                                  │
  │  初始化: 随机选择 K 个中心 {μ₁, ..., μ_K}        │
  │                                                  │
  │  ┌──────────────────────────────────────┐        │
  │  │  while 中心变化 > ε:                   │        │
  │  │                                       │        │
  │  │    步骤 1 (Assignment):                │        │
  │  │      将每个点分配给最近的中心           │        │
  │  │      C_k = {i : k = arg min ||p_i-μ_j||}│       │
  │  │                                       │        │
  │  │    步骤 2 (Update):                    │        │
  │  │      重新计算每个簇的中心               │        │
  │  │      μ_k = (1/|C_k|) Σ_{i∈C_k} p_i    │        │
  │  │                                       │        │
  │  └──────────────────────────────────────┘        │
  │                                                  │
  └─────────────────────────────────────────────────┘
```

### 2.2 收敛性分析

Lloyd 迭代保证收敛——因为：

1. **Assignment 步骤**不增加目标函数值（每个点选择最近的质心）。
2. **Update 步骤**也不增加目标函数值（算术平均是簇内距离平方和的最小值点）。
3. 目标函数有下界（0），且每次迭代单调不增 → 收敛。

> ⚠️ 但注意：Lloyd 迭代收敛到的是**局部最优**而非全局最优。不同的初始质心可能收敛到不同的局部极小值。

### 2.3 基础 Python 实现

```python
import numpy as np


def kmeans_basic(points, k, max_iters=100, tol=1e-4, seed=None):
    """
    基础 K-Means 实现 (Lloyd 迭代)。

    :param points: N x d 的输入点集
    :param k: 簇的数量
    :param max_iters: 最大迭代次数
    :param tol: 收敛容限
    :param seed: 随机种子
    :return: (labels, centroids, n_iters)
    """
    if seed is not None:
        np.random.seed(seed)

    N, d = points.shape

    # 1. 随机初始化：从数据中选择 K 个点作为初始质心
    init_indices = np.random.choice(N, k, replace=False)
    centroids = points[init_indices].copy().astype(np.float64)

    labels = np.zeros(N, dtype=np.int32)

    for iteration in range(max_iters):
        # ── 步骤 1: 分配 (Assignment) ──
        # 计算每个点到所有质心的距离平方
        # ||p_i - μ_j||² = ||p_i||² + ||μ_j||² - 2 p_i · μ_j
        pts_norm_sq = np.sum(points ** 2, axis=1).reshape(-1, 1)     # N x 1
        cen_norm_sq = np.sum(centroids ** 2, axis=1).reshape(1, -1)   # 1 x K
        dists_sq = pts_norm_sq + cen_norm_sq - 2 * points @ centroids.T  # N x K
        dists_sq = np.maximum(dists_sq, 0)  # 避免极小负值（舍入误差）

        new_labels = np.argmin(dists_sq, axis=1)

        # ── 步骤 2: 更新 (Update) ──
        new_centroids = np.zeros_like(centroids)
        for j in range(k):
            mask = (new_labels == j)
            if mask.sum() > 0:
                new_centroids[j] = points[mask].mean(axis=0)
            else:
                # 空簇: 保留原质心或重新初始化
                new_centroids[j] = centroids[j]

        # ── 收敛检查 ──
        shift = np.linalg.norm(new_centroids - centroids, axis=1).max()
        centroids = new_centroids
        labels = new_labels

        if shift < tol:
            print(f"[K-Means] 在第 {iteration+1} 轮收敛 (shift={shift:.6f})")
            break
    else:
        print(f"[K-Means] 达到最大迭代次数 {max_iters}")

    return labels, centroids, iteration + 1
```

---

## 三、K-Means++ 初始化策略

### 3.1 随机初始化的缺陷

随机从数据中选择初始质心存在严重问题：如果两个初始质心碰巧十分接近，会导致收敛到极差的局部最优解。

```
  随机初始化的两种极端情况

  ✅ 良好初始化                    ❌ 不良初始化

  ●₁                                ●₁●₂
    ○ ○ ○                            ○ ○ ○
       ○                                ○
     ○    ○  ●₂                      ○     ○
                                        ○  ○
     ○    ○                          ○     ○
        ○                               ○
   ●₃ ○  ○ ○                           ○ ○ ○

  质心分散在各簇中                  两个质心挤在同一簇
  快速收敛到全局最优                收敛极慢，可能拆分自然簇
```

### 3.2 K-Means++ 算法

K-Means++ 的初始化策略：**让初始质心尽可能分散**。

1. 随机选择第一个质心 $\mu_1$。
2. 对 $j = 2, \ldots, K$：
   - 对每个点 $p_i$，计算其到**最近已有质心**的距离 $D(p_i)$
   - 以概率 $\propto D(p_i)^2$ 选择下一个质心
3. 使用选出的 $K$ 个质心运行标准 Lloyd 迭代。

```python
def kmeans_plusplus_init(points, k, seed=None):
    """
    K-Means++ 初始化。

    :return: (centroids, labels) 初始质心和初始分配
    """
    if seed is not None:
        np.random.seed(seed)

    N, d = points.shape
    centroids = np.zeros((k, d), dtype=np.float64)

    # 1. 随机选择第一个质心
    first_idx = np.random.randint(N)
    centroids[0] = points[first_idx]

    # 2. 依次选择剩余质心
    for j in range(1, k):
        # 计算每个点到最近已有质心的距离平方
        dists_sq = np.full(N, np.inf)
        for c in range(j):
            d2 = np.sum((points - centroids[c]) ** 2, axis=1)
            dists_sq = np.minimum(dists_sq, d2)

        # 以概率正比于 D(p_i)² 选择下一个质心
        probs = dists_sq / dists_sq.sum()
        cumulative = np.cumsum(probs)
        r = np.random.random()
        next_idx = np.searchsorted(cumulative, r)
        centroids[j] = points[next_idx]

    return centroids


def kmeans_plusplus(points, k, max_iters=100, tol=1e-4, seed=None):
    """带 K-Means++ 初始化的 K-Means"""
    centroids = kmeans_plusplus_init(points, k, seed)

    # 后续与 kmeans_basic 相同的 Lloyd 迭代...
    # （此处省略，实际项目中将初始化部分替换即可）
    return kmeans_basic(points, k, max_iters, tol, seed)
```

---

## 四、在点云处理中的应用

### 4.1 基于空间坐标的点云分割

直接将 K-Means 应用于点的 $(x, y, z)$ 坐标，可用于粗略的空间分割：

```python
def spatial_kmeans_segmentation(pcd, k=5):
    """
    基于空间位置的 K-Means 点云分割。

    适用场景: 场景中的物体在空间上明显分离（如室内家具）。
    """
    points = np.asarray(pcd.points)
    labels, centroids, _ = kmeans_plusplus(points, k=k, seed=42)

    # 为每个簇分配颜色
    import matplotlib.pyplot as plt
    colors = plt.cm.tab10(labels / k)[:, :3]

    segmented_pcd = o3d.geometry.PointCloud()
    segmented_pcd.points = o3d.utility.Vector3dVector(points)
    segmented_pcd.colors = o3d.utility.Vector3dVector(colors)

    return segmented_pcd, labels, centroids
```

### 4.2 颜色量化 (Color Quantization)

将点云的 RGB 颜色空间聚类为 $K$ 个主色调，实现颜色压缩或基于颜色的分割：

```python
def color_kmeans_quantization(pcd, k=8):
    """
    对点云的颜色进行 K-Means 量化。

    将 RGB 值聚类为 K 种主色，每个点替换为最近的簇中心颜色。
    常用于点云的颜色去噪和风格化渲染。
    """
    colors = np.asarray(pcd.colors)  # N x 3, 每行 (R,G,B)
    labels, palette, _ = kmeans_plusplus(colors, k=k)

    # 每个点的颜色替换为所属簇的质心颜色
    quantized_colors = palette[labels]

    quantized_pcd = o3d.geometry.PointCloud()
    quantized_pcd.points = pcd.points
    quantized_pcd.colors = o3d.utility.Vector3dVector(quantized_colors)

    return quantized_pcd, palette
```

### 4.3 法向量辅助聚类

将空间坐标 $(x, y, z)$ 和法向量 $(n_x, n_y, n_z)$ 拼接为 6D 特征进行聚类，可以更好地区分不同朝向的平面：

```python
def spatial_normal_kmeans(pcd, k=5, normal_weight=0.5):
    """
    结合空间位置和法向量的 K-Means 聚类。

    :param normal_weight: 法向量维度在距离计算中的权重
    """
    points = np.asarray(pcd.points)
    # 确保点云有法向量
    if not pcd.has_normals():
        pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamKNN(30))
    normals = np.asarray(pcd.normals)

    # 构建 6D 特征向量
    features = np.hstack([
        points,                              # (x, y, z)
        normal_weight * normals              # (nx, ny, nz) * weight
    ])

    labels, centroids, _ = kmeans_plusplus(features, k=k)
    return labels, centroids
```

---

## 五、K-Means 的局限性与改进

### 5.1 主要局限性

```
  K-Means 失效场景

  1. 非球形簇                    2. 大小悬殊的簇              3. 密度不均的簇

      ●●●                           ○ ○ ○
    ●●   ●●                       ○       ○                     ○○
   ●       ●                      ○   ●   ○ ●●             ○  ○○  ○
    ●●   ●●                       ○       ○  ●●●           ○ ○ ○  ○ ○
      ●●●                           ○ ○ ○                     ○○
                                                           ○ ○○○○○○○ ○
  实际: 两圈                     K-Means:                   实际: 2 簇
  K-Means: 一堆奇怪的对角线划分     大簇被拆分                  K-Means: 错误切分
```

### 5.2 改进方向

| 改进 | 方法 | 解决的问题 |
|------|------|------------|
| **初始化** | K-Means++ | 随机初始化的不稳定性 |
| **加速** | Elkan 三角不等式 | 大量冗余距离计算 |
| **大数据** | Mini-Batch K-Means | 百万级以上样本的计算瓶颈 |
| **非球形** | Kernel K-Means | 非球形分布的聚类 |
| **自动 K** | Gap Statistic / Elbow Method | 人工设定 K 的问题 |

### 5.3 肘部法则（Elbow Method）

如何选择 $K$？画出 WCSS 随 $K$ 变化的曲线：

```
  WCSS ▲
       │
       │ ╲
       │  ╲
       │   ╲___ ← 肘部 (最佳 K)
       │       ╲___
       │           ╲_____
       │                  ╲_________
       └────┬────┬────┬────┬────┬────► K
            1    2    3    4    5    6

  肘部之前 WCSS 快速下降（每个新簇捕获了新结构）
  肘部之后 WCSS 缓慢下降（过度分割，只是分裂自然簇）
```

```python
def elbow_method(points, k_range=range(1, 11)):
    """肘部法则：计算不同 K 下的 WCSS"""
    wcss_values = []
    for k in k_range:
        labels, centroids, _ = kmeans_plusplus(points, k=k)
        wcss = sum(
            np.sum((points[labels == j] - centroids[j]) ** 2)
            for j in range(k)
        )
        wcss_values.append(wcss)
        print(f"  K={k}: WCSS={wcss:.2f}")
    return wcss_values
```

---

## 六、完整示例：K-Means 点云场景分割

```python
import numpy as np
import open3d as o3d


def kmeans_scene_segmentation(pcd, k_range=(2, 8)):
    """
    使用 K-Means 对点云场景进行分割，自动选择最佳 K。
    """
    points = np.asarray(pcd.points)
    N = points.shape[0]

    # 如果点云过大，先下采样
    if N > 50000:
        pcd = pcd.voxel_down_sample(voxel_size=0.02)
        points = np.asarray(pcd.points)
        print(f"下采样后点数: {len(points)}")

    # 肘部法则选 K
    print("运行肘部法则...")
    wcss_vals = elbow_method(points, range(k_range[0], k_range[1] + 1))

    # 计算肘部位置（最大曲率点）
    from numpy import diff
    k_vals = list(range(k_range[0], k_range[1] + 1))
    deltas = -diff(wcss_vals)  # WCSS 的一阶差分
    best_k = k_vals[np.argmax(diff(deltas)) + 1]
    print(f"\n最佳 K = {best_k}")

    # 执行最终分割
    labels, centroids, _ = kmeans_plusplus(points, k=best_k, seed=42)

    # 可视化
    import matplotlib.pyplot as plt
    colors = plt.cm.tab20(labels % 20 / 20)[:, :3]
    segmented = o3d.geometry.PointCloud()
    segmented.points = o3d.utility.Vector3dVector(points)
    segmented.colors = o3d.utility.Vector3dVector(colors)

    return segmented, labels, centroids
```

---

## 总结

| 概念 | 要点 |
|------|------|
| **优化目标** | 最小化簇内平方误差和 $\sum_k \sum_{i \in C_k} \|p_i - \mu_k\|^2$ |
| **Lloyd 迭代** | 交替执行 Assignment（分配最近质心）和 Update（重算质心） |
| **收敛性** | 单调收敛到局部最优解，不保证全局最优 |
| **K-Means++** | 距离加权随机采样初始化，显著减少坏局部最优 |
| **时间复杂度** | $O(N K d \cdot \text{iters})$，通常 iters $\ll N$ |
| **空间复杂度** | $O(N + K d)$ |

K-Means 虽然简单，但在点云处理中有着广泛的实际应用。然而，它无法处理各向异性的簇（椭圆形簇）——这正是下一章 **GMM 高斯混合模型聚类** 所要解决的问题，它允许每个簇拥有自己的协方差矩阵，从而可以拟合任意方向的椭球形分布。
