---
title: 三维点云处理：KD-Tree——多维空间划分与最近邻搜索
description: 深入解析 KD-Tree 的构建算法、k 近邻搜索与半径搜索的剪枝策略，通过 Python 实现和可视化演示其在三维点云邻域搜索中的核心作用。
---

# 三维点云处理：KD-Tree——多维空间划分与最近邻搜索

在上章中，我们学习了二叉搜索树（BST）在一维数据上的高效搜索。然而，三维点云处理中的搜索问题发生在 $\mathbb{R}^3$ 空间中——我们需要找到"三维空间中离某个点最近的点"，而非简单的数值大小比较。

**KD-Tree（K-Dimensional Tree）** 将 BST 的"按一个键值比较"思想推广到多维空间：在每一层树中交替使用不同的坐标轴进行划分，从而实现 $O(\log N)$ 的邻域搜索。

---

## 一、KD-Tree 的构建

### 1.1 划分思想

KD-Tree 是一棵二叉树，每一层对应一个划分维度。对于三维点云，通常按 $x \to y \to z \to x \to \ldots$ 的顺序轮流划分。

```
              第 0 层 (根): 按 x 坐标划分
             ╱                     ╲
    第 1 层: 按 y 坐标划分    第 1 层: 按 y 坐标划分
      ╱       ╲                 ╱       ╲
  第 2 层: 按 z  第 2 层: 按 z ...

  划分维度的循环: depth % 3 == 0 → x, 1 → y, 2 → z
```

### 1.2 构建算法

**算法流程**：

1. 如果点集为空，返回空节点。
2. 选择当前划分维度 $d = \text{depth} \bmod 3$。
3. 在当前维度上找到中位数点作为划分节点。
4. 将点集分为两部分：左子树（维度 $d$ 上小于中位数的点）、右子树（大于中位数的点）。
5. 递归构建左右子树。


<svg viewBox="0 0 600 240" width="100%" style="background-color: transparent; font-family: sans-serif; margin: 20px 0; overflow: visible;">
  <!-- Spatial Partition Plot (Left) -->
  <g transform="translate(40, 20)">
  <text x="90" y="-5" text-anchor="middle" font-size="13" fill="currentColor">1. 二维空间划分 (交替 X/Y)</text>
  <rect x="0" y="10" width="180" height="180" fill="none" stroke="currentColor" stroke-width="1.5" />
  <line x1="0" y1="190" x2="190" y2="190" stroke="currentColor" stroke-width="1.2" />
  <text x="195" y="194" font-size="10" fill="currentColor">x</text>
  <line x1="-10" y1="190" x2="-10" y2="10" stroke="currentColor" stroke-width="1.2" />
  <text x="-10" y="2" font-size="10" fill="currentColor" text-anchor="middle">y</text>
  <line x1="90" y1="10" x2="90" y2="190" stroke="#f5222d" stroke-width="2" />
  <text x="90" y="202" font-size="9" fill="#f5222d" text-anchor="middle">x = 5</text>
  <line x1="0" y1="136" x2="90" y2="136" stroke="#1677ff" stroke-width="1.5" stroke-dasharray="3 2" />
  <text x="-25" y="140" font-size="9" fill="#1677ff">y = 3</text>
  <line x1="90" y1="82" x2="180" y2="82" stroke="#1677ff" stroke-width="1.5" stroke-dasharray="3 2" />
  <text x="195" y="86" font-size="9" fill="#1677ff">y = 6</text>
  <circle cx="90" cy="118" r="4.5" fill="#f5222d" />
  <text x="98" y="114" font-size="9" fill="#f5222d">(5,4)</text>
  <circle cx="36" cy="136" r="4.5" fill="#1677ff" />
  <text x="44" y="132" font-size="9" fill="#1677ff">(2,3)</text>
  <circle cx="144" cy="82" r="4.5" fill="#1677ff" />
  <text x="134" y="78" font-size="9" fill="#1677ff">(8,6)</text>
  <circle cx="18" cy="154" r="3.5" fill="var(--vp-c-text-3)" />
  <text x="10" y="170" font-size="9" fill="var(--vp-c-text-3)">(1,2)</text>
  <circle cx="54" cy="82" r="3.5" fill="var(--vp-c-text-3)" />
  <text x="44" y="96" font-size="9" fill="var(--vp-c-text-3)">(3,6)</text>
  <circle cx="126" cy="46" r="3.5" fill="var(--vp-c-text-3)" />
  <text x="134" y="42" font-size="9" fill="var(--vp-c-text-3)">(7,8)</text>
  <circle cx="162" cy="154" r="3.5" fill="var(--vp-c-text-3)" />
  <text x="154" y="170" font-size="9" fill="var(--vp-c-text-3)">(9,2)</text>
  </g>
  <!-- Binary Tree (Right) -->
  <g transform="translate(320, 20)">
  <text x="110" y="-5" text-anchor="middle" font-size="13" fill="currentColor">2. 对应的 KD-Tree 二叉树结构</text>
  <line x1="110" y1="35" x2="60" y2="85" stroke="currentColor" stroke-width="1.5" />
  <line x1="110" y1="35" x2="160" y2="85" stroke="currentColor" stroke-width="1.5" />
  <line x1="60" y1="95" x2="35" y2="145" stroke="currentColor" stroke-width="1.5" />
  <line x1="60" y1="95" x2="85" y2="145" stroke="currentColor" stroke-width="1.5" />
  <line x1="160" y1="95" x2="135" y2="145" stroke="currentColor" stroke-width="1.5" />
  <line x1="160" y1="95" x2="185" y2="145" stroke="currentColor" stroke-width="1.5" />
  <rect x="90" y="20" width="40" height="22" rx="4" fill="rgba(245, 34, 45, 0.15)" stroke="#f5222d" stroke-width="2" />
  <text x="110" y="34" text-anchor="middle" font-size="10" fill="#f5222d">(5,4)</text>
  <text x="110" y="12" text-anchor="middle" font-size="8" fill="#f5222d">[Split X]</text>
  <rect x="40" y="80" width="40" height="22" rx="4" fill="rgba(22, 119, 255, 0.15)" stroke="#1677ff" stroke-width="2" />
  <text x="60" y="94" text-anchor="middle" font-size="10" fill="#1677ff">(2,3)</text>
  <text x="60" y="72" text-anchor="middle" font-size="8" fill="#1677ff">[Split Y]</text>
  <rect x="140" y="80" width="40" height="22" rx="4" fill="rgba(22, 119, 255, 0.15)" stroke="#1677ff" stroke-width="2" />
  <text x="160" y="94" text-anchor="middle" font-size="10" fill="#1677ff">(8,6)</text>
  <text x="160" y="72" text-anchor="middle" font-size="8" fill="#1677ff">[Split Y]</text>
  <rect x="15" y="140" width="40" height="22" rx="4" fill="rgba(100, 100, 100, 0.05)" stroke="var(--vp-c-text-3)" stroke-width="1.5" />
  <text x="35" y="154" text-anchor="middle" font-size="10" fill="var(--vp-c-text-1)">(1,2)</text>
  <text x="35" y="174" text-anchor="middle" font-size="8" fill="var(--vp-c-text-3)">叶子</text>
  <rect x="65" y="140" width="40" height="22" rx="4" fill="rgba(100, 100, 100, 0.05)" stroke="var(--vp-c-text-3)" stroke-width="1.5" />
  <text x="85" y="154" text-anchor="middle" font-size="10" fill="var(--vp-c-text-1)">(3,6)</text>
  <text x="85" y="174" text-anchor="middle" font-size="8" fill="var(--vp-c-text-3)">叶子</text>
  <rect x="115" y="140" width="40" height="22" rx="4" fill="rgba(100, 100, 100, 0.05)" stroke="var(--vp-c-text-3)" stroke-width="1.5" />
  <text x="135" y="154" text-anchor="middle" font-size="10" fill="var(--vp-c-text-1)">(7,8)</text>
  <text x="135" y="174" text-anchor="middle" font-size="8" fill="var(--vp-c-text-3)">叶子</text>
  <rect x="165" y="140" width="40" height="22" rx="4" fill="rgba(100, 100, 100, 0.05)" stroke="var(--vp-c-text-3)" stroke-width="1.5" />
  <text x="185" y="154" text-anchor="middle" font-size="10" fill="var(--vp-c-text-1)">(9,2)</text>
  <text x="185" y="174" text-anchor="middle" font-size="8" fill="var(--vp-c-text-3)">叶子</text>
  </g>
</svg>


### 1.3 节点数据结构

```python
import numpy as np
from dataclasses import dataclass
from typing import Optional


@dataclass
class KDTreeNode:
    """KD-Tree 节点"""
    point: np.ndarray          # 该节点存储的三维点坐标 (3,)
    point_index: int           # 点在原始点云中的索引
    split_dim: int             # 划分维度 (0=x, 1=y, 2=z)
    left: Optional['KDTreeNode'] = None
    right: Optional['KDTreeNode'] = None
```

### 1.4 构建实现

```python
def build_kdtree(points, depth=0, indices=None):
    """
    递归构建 KD-Tree。

    :param points: N x 3 的 NumPy 点云数组
    :param depth: 当前递归深度
    :param indices: 当前子集的点在原始数组中的索引（用于回溯点索引）
    :return: KDTreeNode | None
    """
    if points.shape[0] == 0:
        return None

    if indices is None:
        indices = np.arange(points.shape[0])

    # 1. 确定当前划分维度
    dim = depth % 3

    # 2. 在当前维度上排序并找到中位数
    sorted_idx = np.argsort(points[:, dim])
    median_local_idx = len(sorted_idx) // 2
    median_global_idx = indices[sorted_idx[median_local_idx]]

    # 3. 创建节点
    node = KDTreeNode(
        point=points[sorted_idx[median_local_idx]],
        point_index=median_global_idx,
        split_dim=dim
    )

    # 4. 递归构建左右子树
    left_mask = sorted_idx[:median_local_idx]
    right_mask = sorted_idx[median_local_idx + 1:]

    node.left = build_kdtree(
        points[left_mask], depth + 1, indices[sorted_idx][:median_local_idx]
    )
    node.right = build_kdtree(
        points[right_mask], depth + 1, indices[sorted_idx][median_local_idx + 1:]
    )

    return node
```

---

## 二、最近邻搜索（Nearest Neighbor Search）

### 2.1 搜索策略与剪枝

KD-Tree 最近邻搜索的核心是**分支定界（Branch and Bound）**：

1. 沿树向下递归到达叶子节点，记录当前最近距离 $d_{\text{best}}$。
2. 回溯时检查：目标点到当前节点划分超平面的距离是否小于 $d_{\text{best}}$。
3. 如果是，说明"另一侧子树"中可能存在更近的点，需要进入搜索；否则可以直接剪枝跳过。


<svg viewBox="0 0 500 200" width="100%" style="background-color: transparent; font-family: sans-serif; margin: 20px 0; overflow: visible;">
  <line x1="200" y1="20" x2="200" y2="180" stroke="#f5222d" stroke-width="2.5" />
  <text x="200" y="15" text-anchor="middle" font-size="11" fill="#f5222d">划分超平面 (x = 5)</text>
  <text x="100" y="175" font-size="12" fill="var(--vp-c-text-2)" text-anchor="middle">左子树空间 (未访问)</text>
  <text x="320" y="175" font-size="12" fill="var(--vp-c-text-2)" text-anchor="middle">右子树空间 (已访问)</text>
  <polygon points="260,70 265,80 275,82 267,89 270,99 260,93 250,99 253,89 245,82 255,80" fill="#1677ff" />
  <text x="260" y="60" text-anchor="middle" font-size="11" fill="#1677ff">目标点 ★ (Target)</text>
  <circle cx="260" cy="85" r="80" fill="rgba(22, 119, 255, 0.05)" stroke="#1677ff" stroke-dasharray="3 3" stroke-width="1.5" />
  <line x1="260" y1="85" x2="316" y2="141" stroke="#1677ff" stroke-width="1.5" />
  <circle cx="316" cy="141" r="3.5" fill="var(--vp-c-text-3)" />
  <text x="325" y="145" font-size="11" fill="#1677ff">当前最近点</text>
  <text x="295" y="110" font-size="11" fill="#1677ff">d_best</text>
  <line x1="260" y1="85" x2="200" y2="85" stroke="#fa8c16" stroke-width="2" />
  <text x="225" y="80" font-size="11" fill="#fa8c16">d_plane = 60</text>
  <text x="250" y="195" text-anchor="middle" font-size="11" fill="currentColor">因为 d_plane (60) &lt; d_best (80) -> 超平面与搜索球相交 -> 左子树可能有更近的点 -> 无法剪枝！</text>
</svg>


### 2.2 完整实现

```python
def knn_search(root, query_point, k=1):
    """
    KD-Tree K 近邻搜索。

    :param root: KDTreeNode | None
    :param query_point: 查询点 (3,) NumPy 数组
    :param k: 要找的最近邻数量
    :return: (distances, indices) — 排序后的距离数组和索引数组
    """
    if root is None:
        return np.array([]), np.array([])

    # 使用最大堆维护 K 个最近邻（存负距离以用最小堆模拟最大堆）
    import heapq
    best_heap = []  # 元素: (-distance, point_index, point)

    def _search(node, depth):
        if node is None:
            return

        dim = node.split_dim

        # 1. 计算当前节点到查询点的欧氏距离
        dist = np.linalg.norm(node.point - query_point)

        # 2. 更新最近邻堆
        # 使用负距离来实现最大堆（堆顶是当前第 K 远）
        heapq.heappush(best_heap, (-dist, node.point_index, node.point))
        if len(best_heap) > k:
            heapq.heappop(best_heap)  # 踢出当前第 K+1 远的

        # 3. 确定先搜索哪一侧
        diff = query_point[dim] - node.point[dim]
        if diff < 0:
            near_child, far_child = node.left, node.right
        else:
            near_child, far_child = node.right, node.left

        # 4. 先搜索近侧子树
        _search(near_child, depth + 1)

        # 5. 剪枝判断：是否探索远侧子树
        # 当前第 K 远的距离 = -best_heap[0][0]（堆中存的是负距离）
        worst_dist_in_heap = -best_heap[0][0] if len(best_heap) == k else np.inf

        # 查询点到划分超平面的距离 = |query[dim] - node.point[dim]|
        dist_to_splitting_plane = abs(diff)

        if dist_to_splitting_plane < worst_dist_in_heap or len(best_heap) < k:
            # 远侧子树可能有更近的点，必须探索
            _search(far_child, depth + 1)

    _search(root, 0)

    # 提取结果并按距离升序排列
    result = [(-d, idx, pt) for d, idx, pt in best_heap]
    result.sort(key=lambda x: x[0])  # 按距离（正数）升序

    distances = np.array([r[0] for r in result])
    indices = np.array([r[1] for r in result])

    return distances, indices
```

### 2.3 半径搜索（Radius Search）

```python
def radius_search(root, query_point, radius):
    """
    KD-Tree 半径搜索：返回所有距离 query_point ≤ radius 的点。

    :param root: KDTreeNode | None
    :param query_point: 查询点 (3,)
    :param radius: 搜索半径
    :return: (indices, distances, points) 列表
    """
    results = []

    def _search(node, depth):
        if node is None:
            return

        dim = node.split_dim

        # 1. 计算距离
        dist = np.linalg.norm(node.point - query_point)
        if dist <= radius:
            results.append((node.point_index, dist, node.point))

        # 2. 确定先搜索哪一侧
        diff = query_point[dim] - node.point[dim]
        if diff < 0:
            near_child, far_child = node.left, node.right
        else:
            near_child, far_child = node.right, node.left

        # 3. 先搜索近侧
        _search(near_child, depth + 1)

        # 4. 剪枝：远侧是否可能包含半径内的点
        if abs(diff) < radius:
            _search(far_child, depth + 1)

    _search(root, 0)
    results.sort(key=lambda x: x[1])  # 按距离排序

    indices = np.array([r[0] for r in results]) if results else np.array([])
    distances = np.array([r[1] for r in results]) if results else np.array([])
    points = np.array([r[2] for r in results]) if results else np.array([])

    return indices, distances, points
```

---

## 三、使用 Open3D 内置 KD-Tree

在实际项目中，Open3D 提供了基于 FLANN 库的高性能 C++ KD-Tree 实现：

```python
import open3d as o3d
import numpy as np

def open3d_kdtree_example():
    """演示 Open3D 内置 KD-Tree 的使用"""
    # 加载或创建点云
    pcd = o3d.io.read_point_cloud("example.ply")
    # 或者生成随机点云
    # pcd = o3d.geometry.PointCloud()
    # pcd.points = o3d.utility.Vector3dVector(np.random.randn(10000, 3))

    # 构建 KD-Tree (FLANN 加速)
    pcd_tree = o3d.geometry.KDTreeFlann(pcd)

    # 选择查询点
    query_idx = 0
    query_point = pcd.points[query_idx]

    # 1. K 最近邻搜索
    k = 20
    [k_found, knn_indices, knn_distances] = \
        pcd_tree.search_knn_vector_3d(query_point, k)
    print(f"KNN (k={k}): 找到 {k_found} 个邻居")
    print(f"  距离范围: [{np.min(np.sqrt(knn_distances)):.4f}, "
          f"{np.max(np.sqrt(knn_distances)):.4f}]")

    # 2. 半径搜索
    radius = 0.5
    [r_found, r_indices, r_distances] = \
        pcd_tree.search_radius_vector_3d(query_point, radius)
    print(f"半径搜索 (r={radius}): 找到 {r_found} 个点")

    # 3. 混合搜索：K 近邻 + 半径限制
    [h_found, h_indices, h_distances] = \
        pcd_tree.search_hybrid_vector_3d(query_point, radius, k)
    print(f"混合搜索 (k={k}, r={radius}): 找到 {h_found} 个点")

    return pcd_tree
```

---

## 四、KD-Tree 在点云处理中的核心应用

### 4.1 下采样滤波器

基于体素或基于最近距离的下采样都依赖 KD-Tree：

```python
def voxel_grid_downsample_with_kdtree(pcd, voxel_size=0.05):
    """
    基于体素的下采样。

    原理：用 KD-Tree 半径搜索将落在同一体素内的点合并为质心。
    """
    points = np.asarray(pcd.points)
    pcd_tree = o3d.geometry.KDTreeFlann(pcd)

    # 体素对角半径
    voxel_radius = voxel_size * np.sqrt(3) / 2

    processed = np.zeros(len(points), dtype=bool)
    downsampled = []

    for i in range(len(points)):
        if processed[i]:
            continue
        # 找到同一体素内的所有点
        [k, idx, _] = pcd_tree.search_radius_vector_3d(points[i], voxel_radius)
        processed[idx] = True
        downsampled.append(np.mean(points[idx], axis=0))

    down_pcd = o3d.geometry.PointCloud()
    down_pcd.points = o3d.utility.Vector3dVector(np.array(downsampled))
    return down_pcd
```

### 4.2 DBSCAN 聚类加速

DBSCAN 算法核心是对每个点做半径搜索，KD-Tree 可将其复杂度从 $O(N^2)$ 降至 $O(N \log N)$。

### 4.3 ICP 配准中的对应点搜索

ICP 算法的每一轮迭代需要为源点云中每个点寻找目标点云中的最近点。使用 KD-Tree 可将每轮迭代的对应搜索从 $O(N_s \cdot N_t)$ 降至 $O(N_s \log N_t)$。

---

## 五、复杂度分析

| 操作 | 平均复杂度 | 最坏复杂度 |
|------|------------|------------|
| **构建** | $O(N \log N)$ | $O(N \log N)$（中位数选择） |
| **最近邻搜索** | $O(\log N)$ | $O(N)$（所有点共面时） |
| **K 近邻搜索** | $O(K \log N)$ | $O(N)$ |
| **半径搜索** | $O(\log N + M)$ | $O(N)$ |
| **空间复杂度** | $O(N)$ | $O(N)$ |

> $M$ 为半径范围内的点数。最坏情况发生在所有点在一个平面上且查询点在平面上时——划分超平面永远与表面平行，导致剪枝失效。

---

## 六、KD-Tree vs 暴力搜索 vs Octree

| 方法 | 单次 KNN (K=10) | 单次半径搜索 (r=0.1) | 优势/特点 |
| :--- | :--- | :--- | :--- |
| **暴力搜索** | ~100 ms | ~100 ms | 简单、精确、无预处理开销 |
| **KD-Tree** | ~0.1 ms | ~0.5 ms | 精确最近邻搜索，不依赖密度 |
| **Octree** | ~0.2 ms | ~0.3 ms | 自适应密度，更适合大规模不均匀点云 |

| 方法 | 优点 | 缺点 |
|------|------|------|
| **暴力搜索** | 简单、精确、无预处理开销 | $O(N)$ 每次搜索，大点云不可用 |
| **KD-Tree** | $O(\log N)$ 搜索、精确结果 | 高维（$d > 20$）效率退化、构建需要排序 |
| **Octree** | 自适应密度、更适合大规模 | 半径搜索可能跨越多个体素 |

---

## 总结

KD-Tree 是 BST 向多维空间的直接推广。掌握它的关键在于理解三点：

1. **维度交替划分**——每层切换划分轴，递归地将空间切分为超矩形区域。
2. **近侧优先 + 剪枝**——先搜索目标点所在的半空间，仅在必要时探索另一侧——这是 $O(\log N)$ 效率的核心。
3. **适用场景判断**——对于 $d \leq 10$ 的精确最近邻搜索，KD-Tree 是最优选择；对于 $d > 20$ 的高维数据，需考虑近似最近邻（ANN）方案。

下一章将学习 Octree（八叉树）——另一种空间索引结构，它通过自适应的八分递归提供了密度感知的空间搜索能力。
