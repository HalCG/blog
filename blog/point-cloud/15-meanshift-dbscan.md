---
title: 三维点云处理：MeanShift 与 DBSCAN 密度聚类——无需预设 K 的自动聚类
description: 深入讲解两种核心密度聚类算法：MeanShift 的均值漂移向量推导与核密度梯度的关系、DBSCAN 的核心点/边界点/噪声点定义及其在三维点云实例分割中的自动物体发现应用。
---

# 三维点云处理：MeanShift 与 DBSCAN 密度聚类——无需预设 K 的自动聚类

K-Means、GMM 和谱聚类都需要（直接或间接地）指定簇的数量 $K$。在真实的三维点云场景中——例如自动驾驶的激光雷达点云——我们无法预知前方有多少辆车、多少行人。

**密度聚类（Density-Based Clustering）** 将簇定义为"被低密度区域分隔的高密度区域"，天然不需要预设 $K$。本章将详细讲解两种最著名的密度聚类算法：**MeanShift** 和 **DBSCAN**。

---

## 一、MeanShift 均值漂移

### 1.1 核心直觉

MeanShift 的基本思想可以用一个物理隐喻来理解：

> 将每个数据点视为一个球，在当前位置计算周围数据点的加权平均位置（"质心"），然后将球移动到这个新位置。重复这一过程，最终所有的球都会"滚入"局部密度最高处——即**概率密度函数的众数（Mode）**。

```
  MeanShift 的迭代漂移过程

  初始点         迭代 1          迭代 3          迭代 5 (收敛)

  ·  ·  ·        ·  ·  ·        ·  ·  ·        ·  ·  ·
    · ● ·          · ★ ·          ·   ·          ·   ·
  ·  ·  ·        ·  ·  ·        ·  ·  ★        ★★★★★
    ·  ·          ·  ·          ·  ★  ·          ★(众数)
                          ★
  ● = 当前点     ★ = 新位置      逐步向密度    收敛到局部
                                  最高处移动    密度最大点
```

### 1.2 数学推导：MeanShift 向量

给定 $N$ 个数据点 $\{x_i\}_{i=1}^N \subset \mathbb{R}^d$，在某一点 $x$ 处的**核密度估计（Kernel Density Estimation, KDE）**为：

$$\hat{f}(x) = \frac{1}{N h^d} \sum_{i=1}^N K\left(\frac{x - x_i}{h}\right)$$

其中 $K(\cdot)$ 是核函数（通常为高斯核），$h$ 是带宽参数。

MeanShift 向量定义为**密度梯度的归一化方向**。对于使用 Epanechnikov 核（或其他满足一定条件的核），可以证明 MeanShift 向量指向密度增长最快的方向：

$$m(x) = \frac{\sum_{i=1}^N x_i \cdot g\left(\left\|\frac{x - x_i}{h}\right\|^2\right)}{\sum_{i=1}^N g\left(\left\|\frac{x - x_i}{h}\right\|^2\right)} - x$$

其中 $g(u) = -K'(u)$ 是核导数。

### 1.3 算法步骤

```
  ┌──────────────────────────────────────────────┐
  │         MeanShift 聚类算法                     │
  ├──────────────────────────────────────────────┤
  │                                               │
  │  初始化: 将所有点标记为"未访问"                 │
  │                                               │
  │  对每个未访问的点 x:                            │
  │    1. 以 x 为起始点                             │
  │    2. 重复 (MeanShift 漂移):                    │
  │       a) 找到以当前点为圆心、h 为半径的所有点     │
  │       b) 计算这些点的几何质心                    │
  │       c) 将当前点移动到质心位置                  │
  │    直到移动距离 < ε (收敛)                       │
  │    3. 将收敛到的众数标记为新簇                    │
  │    4. 将路径上所有点分配到该簇                    │
  │                                               │
  │  合并过于接近的众数（距离 < h 的众数合并）        │
  └──────────────────────────────────────────────┘
```

### 1.4 Python 实现

```python
import numpy as np


def meanshift_clustering(points, bandwidth=0.5, max_iters=100,
                         convergence_threshold=1e-4, merge_threshold=None):
    """
    MeanShift 密度聚类。

    :param points: N x d 输入数据
    :param bandwidth: 核带宽 h
    :param max_iters: 每个点的最大漂移迭代次数
    :param convergence_threshold: 漂移收敛阈值
    :param merge_threshold: 众数合并距离（默认 = bandwidth）
    :return: labels, modes
    """
    if merge_threshold is None:
        merge_threshold = bandwidth

    N, d = points.shape

    # 存储每个点收敛到的众数
    shifted_points = points.copy()

    for i in range(N):
        x = points[i].copy()

        for _ in range(max_iters):
            # 找到 bandwidth 内的所有点
            dists = np.linalg.norm(points - x, axis=1)
            neighbors = points[dists < bandwidth]

            if len(neighbors) == 0:
                break

            # 计算质心
            new_x = neighbors.mean(axis=0)

            # 检查收敛
            shift = np.linalg.norm(new_x - x)
            x = new_x

            if shift < convergence_threshold:
                break

        shifted_points[i] = x

    # 合并距离 < merge_threshold 的众数
    modes = []
    labels = np.full(N, -1, dtype=int)

    for i in range(N):
        assigned = False
        for mode_idx, mode in enumerate(modes):
            if np.linalg.norm(shifted_points[i] - mode) < merge_threshold:
                labels[i] = mode_idx
                assigned = True
                break
        if not assigned:
            labels[i] = len(modes)
            modes.append(shifted_points[i])

    return labels, np.array(modes)
```

### 1.5 带宽 $h$ 的影响

```
  带宽选择对 MeanShift 的影响

  h 太小                       h 适中                       h 太大

  ·  ·    ·  ·              ·  ·  ·  ·              ·  ·  ·  ·
   · ·    · ·                · · · ·                · · · · ·
    ·      ·                  ·  ·  ·                 过聚类！
                                                                  欠聚类！
  每个点都是自己的簇          正确发现两个簇              所有点合并为一个簇

  簇数 K 很大                 K 正确                     K 过小
```

---

## 二、DBSCAN

### 2.1 核心概念：密度连接

DBSCAN (Density-Based Spatial Clustering of Applications with Noise) 提出三种点的分类：

| 类型 | 条件 | 角色 |
|------|------|------|
| **核心点（Core Point）** | 半径 $\epsilon$ 内至少有 $\text{minPts}$ 个点（含自身） | 簇的种子 |
| **边界点（Border Point）** | $\epsilon$ 内邻居数 $<$ minPts，但位于某个核心点的邻域内 | 簇的边缘 |
| **噪声点（Noise Point）** | $\epsilon$ 内邻居数 $<$ minPts，且不在任何核心点邻域内 | 丢弃 |

```
  DBSCAN 三种点的示意 (minPts = 4)

  · ·    · ·            ○ = 核心点 (≥4 个邻居)
   · ○──○  ·            ◈ = 边界点 (<4 但可达核心点)
    │ ╲ │               × = 噪声点 (不可达)
   ○───○─┼─○
    │   │ ╱             ○──○ 密度直达
   · ○──○  ·            ○──◈ 密度可达（通过核心点链）
   ·   ·                 ○──× 不可达
```

### 2.2 密度可达与密度连接

- **密度直达（Directly Density-Reachable）**：$q$ 在 $p$ 的 $\epsilon$-邻域内，且 $p$ 是核心点。
- **密度可达（Density-Reachable）**：存在一条核心点链 $p = p_1 \to p_2 \to \cdots \to p_k = q$，每步都是密度直达。
- **密度连接（Density-Connected）**：存在点 $o$，使 $p$ 和 $q$ 都从 $o$ 密度可达。

> **簇的定义**：从任意核心点出发，所有密度连接的核心点和边界点构成一个簇。

### 2.3 算法流程

```
  ┌──────────────────────────────────────────────┐
  │              DBSCAN 算法                       │
  ├──────────────────────────────────────────────┤
  │                                               │
  │  输入: 点云, ε (邻域半径), minPts (最小点数)    │
  │                                               │
  │  1. 将所有点标记为 "unvisited"                  │
  │  2. 对每个 unvisited 点 p:                     │
  │     a) 标记 p 为 "visited"                     │
  │     b) 找到 p 的 ε-邻域 N(p)                    │
  │     c) 如果 |N(p)| < minPts:                   │
  │          标记 p 为 NOISE (之后可能被改判)        │
  │     d) 否则:                                   │
  │         创建新簇 C, 将 p 归入 C                 │
  │         将 N(p) 中的所有点加入种子集合 S          │
  │         对 S 中每个点 q:                         │
  │           • 如果 q 是 NOISE, 改判为 C 的边界点   │
  │           • 如果 q 是 unvisited:                │
  │               标记 visited                      │
  │               找到 N(q)                         │
  │               如果 |N(q)| ≥ minPts:              │
  │                  将 N(q) 加入 S  (区域增长)      │
  │               如果 q 未归属任何簇, 归入 C         │
  └──────────────────────────────────────────────┘
```

### 2.4 Python 实现

```python
def dbscan(points, eps=0.5, min_pts=10):
    """
    DBSCAN 密度聚类。

    :param points: N x 3 NumPy 数组
    :param eps: 邻域半径 ε
    :param min_pts: 核心点的最小邻居数
    :return: labels (N,) — 噪声点标记为 -1
    """
    from scipy.spatial import KDTree

    N = points.shape[0]
    labels = np.full(N, -1, dtype=int)  # -1 = UNCLASSIFIED
    tree = KDTree(points)

    cluster_id = 0

    for i in range(N):
        if labels[i] != -1:
            continue

        # 查找 ε-邻域
        neighbor_indices = tree.query_ball_point(points[i], eps)

        if len(neighbor_indices) < min_pts:
            labels[i] = -2  # NOISE (可能之后被改判)
            continue

        # 新簇
        labels[i] = cluster_id

        # 种子集（区域增长队列）
        seed_set = [idx for idx in neighbor_indices if idx != i]
        j = 0
        while j < len(seed_set):
            q = seed_set[j]
            j += 1

            # 之前被判为 NOISE 的点可能是边界点
            if labels[q] == -2:
                labels[q] = cluster_id

            if labels[q] != -1:
                continue

            labels[q] = cluster_id

            # 检查 q 是否是核心点
            q_neighbors = tree.query_ball_point(points[q], eps)
            if len(q_neighbors) >= min_pts:
                # 将新邻居加入种子集（去重）
                for neighbor in q_neighbors:
                    if labels[neighbor] == -1 or labels[neighbor] == -2:
                        if neighbor not in seed_set[j:]:
                            seed_set.append(neighbor)

        cluster_id += 1

    # 将 -2 (NOISE) 转为 -1
    labels[labels == -2] = -1

    n_clusters = cluster_id
    n_noise = np.sum(labels == -1)
    print(f"[DBSCAN] 发现 {n_clusters} 个簇, {n_noise} 个噪声点 "
          f"({100*n_noise/N:.1f}%)")

    return labels
```

### 2.5 参数敏感性

```
  不同参数组合的聚类结果 (同一数据)

  ε 太小 / minPts 太大          适中参数                   ε 太大 / minPts 太小

  ○ ○  ·  ○ ○                  ○○○○○                    ○○○
  ○ ○  ·  ○ ○                  ○○○○○                    ○○○○○○○○
  · · × · ·                    ○○○○○                    ○○○○○○○○
  ○ ○  ·  ○ ○                  ○○○○○                    ○○○○○○○○
  ○ ○  ·  ○ ○                                              ○○○

  几乎全是噪声                  正确聚类                    所有点合并为一簇
```

**参数选择经验法则**：

- **$\epsilon$**：画 $K$-距离图（对每个点计算到第 $K$ 近邻的距离，排序），选择拐点处的距离值。
- **$\text{minPts}$**：通常取 $\text{minPts} \ge d + 1$（三维点云中取 4~20）。

```python
def plot_k_distance(points, k=10):
    """K-距离图：帮助选择 eps"""
    from scipy.spatial import KDTree
    tree = KDTree(points)
    dists, _ = tree.query(points, k=k + 1)
    k_dists = np.sort(dists[:, k])

    # 拐点即为推荐的 eps
    import matplotlib.pyplot as plt
    plt.plot(k_dists)
    plt.xlabel("Points (sorted)")
    plt.ylabel(f"{k}-th nearest neighbor distance")
    plt.title("K-Distance Graph for DBSCAN ε selection")
    plt.grid(True, alpha=0.3)
    plt.show()
```

---

## 三、MeanShift vs DBSCAN 对比

| 维度 | MeanShift | DBSCAN |
|------|-----------|--------|
| **核心理念** | 梯度上升找密度众数 | 密度连接的区域增长 |
| **参数** | 带宽 $h$ | 半径 $\epsilon$ + 最小点数 minPts |
| **自动选 K** | ✅ 自动（=众数数量） | ✅ 自动（=连通分量数） |
| **簇形状** | 密度凸包 | 任意形状 |
| **噪声处理** | 隐式（低密度区域自然无众数） | 显式（噪声标签 = -1） |
| **计算复杂度** | $O(N^2)$ 朴素，KD-Tree 加速后 $O(N \log N)$ | $O(N \log N)$（KD-Tree 半径搜索） |
| **密度不均** | 差（单一 $h$ 无法适应多尺度） | 差（单一 $\epsilon$ 无法适应多尺度） |
| **变尺度版本** | Adaptive MeanShift | OPTICS / HDBSCAN |

---

## 四、点云实例分割应用

```python
import open3d as o3d
import numpy as np


def dbscan_instance_segmentation(pcd, eps=0.3, min_pts=15, ground_height=None):
    """
    使用 DBSCAN 对点云进行实例级物体分割。

    典型管道:
      1. 地面分割 (可选)
      2. 体素下采样 (降采样加速)
      3. DBSCAN 聚类
      4. 噪声过滤 + 小簇过滤
    """
    # 可选: 移除地面点
    if ground_height is not None:
        points = np.asarray(pcd.points)
        non_ground_mask = points[:, 2] > ground_height
        pcd = pcd.select_by_index(np.where(non_ground_mask)[0])

    # 体素下采样
    pcd_down = pcd.voxel_down_sample(voxel_size=0.05)

    points = np.asarray(pcd_down.points)

    # DBSCAN 聚类
    labels = dbscan(points, eps=eps, min_pts=min_pts)

    # 后处理: 过滤过小簇（可能是残余噪声）
    unique_labels, counts = np.unique(labels, return_counts=True)
    min_cluster_size = 20
    for label, count in zip(unique_labels, counts):
        if label >= 0 and count < min_cluster_size:
            labels[labels == label] = -1

    # 可视化
    max_label = labels.max()
    import matplotlib.pyplot as plt
    colors = plt.cm.tab20(labels % 20 / 20)[:, :3]
    colors[labels == -1] = [0.3, 0.3, 0.3]  # 噪声为灰色

    segmented = o3d.geometry.PointCloud()
    segmented.points = o3d.utility.Vector3dVector(points)
    segmented.colors = o3d.utility.Vector3dVector(colors)

    print(f"检测到 {max_label + 1} 个物体实例")

    return segmented, labels
```

---

## 总结

| 概念 | 要记住什么 |
|------|-----------|
| **MeanShift** | 走核密度梯度的上升方向，收敛到众数。单一带宽 $h$ 控制一切。 |
| **DBSCAN** | 核心点 → 密度可达 → 密度连接 → 簇 = 最大密度连接集。 |
| **共同优势** | 不需预设 K、可发现任意形状的簇、能自动识别噪声点。 |
| **共同弱点** | 单一密度阈值无法处理密度不均的数据 → 用 OPTICS/HDBSCAN。 |
| **点云应用** | 地面分割 + DBSCAN = 自动驾驶中经典的物体检测流水线。 |

下一章将进入拟合算法的世界——从**最小二乘法**开始，学习如何从点云中提取平面、球面等几何基元。
