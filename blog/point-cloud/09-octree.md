---
title: 三维点云处理：Octree 八叉树——自适应空间细分与高效体素操作
description: 深入讲解 Octree 的递归八分空间划分原理、构建/遍历/搜索算法，以及八叉树在点云体素化下采样、压缩存储和多分辨率分析中的核心应用。
---

# 三维点云处理：Octree 八叉树——自适应空间细分与高效体素操作

在上一章中，KD-Tree 通过交替坐标轴划分实现了 $O(\log N)$ 的邻域搜索。然而，KD-Tree 的划分方式并不感知空间中点的密度分布——它在每个维度上都等量地进行中位数划分。

**Octree（八叉树）** 采用了不同的策略：将空间递归地**八等分**，仅在有数据存在的子空间中继续细分。这种"有数据才细分"的策略使得 Octree 天然适合三维点云的层次化表达、压缩存储和体素化处理。

---

## 一、Octree 的结构原理

### 1.1 八分递归

Octree 的每个节点代表一个立方体空间区域（Axis-Aligned Bounding Box, AABB）。一个有子节点的内部节点拥有恰好 $2^3 = 8$ 个子节点，分别对应该立方体被三个正交平面切分后的八个子立方体。

```
  Octree 一次细分的八分结构

           ┌─────────────────┐
           │    ┌─────┬─────┐│
           │   /│  左上后  │ /│
           │  / │         │/ │
           │ ├──┼────┼────┤  │
           │ /  │  左上前  │ / │
           │/   │         │/  │
           │    └─────┴─────┘  │
           │    ┌─────┬─────┐ │
           │   /│  左下后  │ / │
           │  / │         │/  │
           │ ├──┼────┼────┤   │
           │ /  │  左下前  │ /  │
           │/   │         │/   │
           └─────┴─────┴──────┘

  8 个子节点 = {000, 001, 010, 011, 100, 101, 110, 111}
  每个二进制位对应 xyz 坐标是否在父节点中心的上方(1)或下方(0)
```

### 1.2 节点数据结构

```python
from dataclasses import dataclass, field
import numpy as np
from typing import List, Optional


@dataclass
class OctreeNode:
    """八叉树节点"""

    # 空间范围：该节点表示的立方体
    center: np.ndarray          # 立方体中心 (3,)
    half_size: float            # 立方体半边长

    # 节点数据
    points: List[np.ndarray] = field(default_factory=list)  # 该节点包含的点
    point_indices: List[int] = field(default_factory=list)  # 点在原始数组中的索引

    # 子节点 (恰好 8 个或 0 个)
    children: List[Optional['OctreeNode']] = field(default_factory=lambda: [None] * 8)

    # 节点类型
    is_leaf: bool = True
    depth: int = 0

    @property
    def size(self):
        """节点立方体边长"""
        return 2 * self.half_size


def get_child_index(center, half_size, point):
    """
    确定点落入哪个子节点。

    八分索引编码:
      第 0 位 (位掩码 1): x > center[0] ? 1 : 0
      第 1 位 (位掩码 2): y > center[1] ? 1 : 0
      第 2 位 (位掩码 4): z > center[2] ? 1 : 0

    返回 0~7 的整数索引。
    """
    child_idx = 0
    if point[0] > center[0]:
        child_idx |= 1  # 设置第 0 位
    if point[1] > center[1]:
        child_idx |= 2  # 设置第 1 位
    if point[2] > center[2]:
        child_idx |= 4  # 设置第 2 位
    return child_idx


def get_child_center(parent_center, parent_half_size, child_index):
    """计算指定子节点的中心坐标"""
    child_half = parent_half_size / 2
    offset = np.array([
        child_half if (child_index & 1) else -child_half,
        child_half if (child_index & 2) else -child_half,
        child_half if (child_index & 4) else -child_half,
    ])
    return parent_center + offset
```

---

## 二、Octree 的构建

### 2.1 构建算法

```
  构建流程:

  1. 计算整个点云的包围盒 (AABB)
  2. 创建根节点（包含整个包围盒的立方体）
  3. 对每个节点递归:
     a) 如果节点内点数 ≤ max_points_per_leaf 或深度 ≥ max_depth → 标记为叶子
     b) 否则 → 将节点 8 等分，将点分配到对应的 8 个子节点
     c) 对每个非空子节点递归执行步骤 3
```

```
  二维类比——Quadtree 的构建过程 (更易可视化):

  第 0 层 (根)                第 1 层细分的节点              第 2 层

  ┌───────────────────┐      ┌─────────┬─────────┐      ┌───┬───┬───┬───┐
  │     ·   ·         │      │  ·  ·   │         │      │   │ · │ · │   │
  │         ·   ·     │      │         │         │      ├───┼───┼───┼───┤
  │ ·                 │      ├─────────┼─────────┤      │   │   │   │   │
  │       ·     ·     │      │ ·       │         │      ├───┼───┼───┼───┤
  │   ·         ·     │      │         │   ·     │      │ · │   │   │   │
  │               ·   │      │   ·     │         │      └───┴───┴───┴───┘
  └───────────────────┘      └─────────┴─────────┘
    根节点包含所有点            只有含点的子节点继续细分       进一步细分
```

### 2.2 构建实现

```python
def build_octree(points, max_points_per_leaf=32, max_depth=10):
    """
    递归构建 Octree。

    :param points: N x 3 的 NumPy 点云数组
    :param max_points_per_leaf: 叶子节点最大点数
    :param max_depth: 最大递归深度
    :return: OctreeNode (根节点)
    """
    if points.shape[0] == 0:
        return None

    # 1. 计算完整包围盒
    min_bound = np.min(points, axis=0)
    max_bound = np.max(points, axis=0)
    center = (min_bound + max_bound) / 2.0
    half_size = np.max(max_bound - min_bound) / 2.0 * 1.01  # 稍微放大避免边界问题

    # 2. 创建根节点
    root = OctreeNode(
        center=center,
        half_size=half_size,
        depth=0
    )

    # 3. 初始化根节点的点列表
    indices = list(range(points.shape[0]))
    root.points = [p for p in points]
    root.point_indices = indices

    # 4. 递归构建
    _build_recursive(root, points, max_points_per_leaf, max_depth)

    return root


def _build_recursive(node, all_points, max_per_leaf, max_depth):
    """递归构建子树"""
    if node.depth >= max_depth:
        return
    if len(node.points) <= max_per_leaf:
        return

    # 八等分
    node.is_leaf = False
    child_points = [[] for _ in range(8)]
    child_indices = [[] for _ in range(8)]

    for i, pt in enumerate(node.points):
        child_idx = get_child_index(node.center, node.half_size, pt)
        child_points[child_idx].append(pt)
        child_indices[child_idx].append(node.point_indices[i])

    # 递归构建每个非空子节点
    for idx in range(8):
        if len(child_points[idx]) == 0:
            continue

        child_center = get_child_center(node.center, node.half_size, idx)
        child = OctreeNode(
            center=child_center,
            half_size=node.half_size / 2,
            points=child_points[idx],
            point_indices=child_indices[idx],
            depth=node.depth + 1
        )
        node.children[idx] = child
        _build_recursive(child, all_points, max_per_leaf, max_depth)
```

---

## 三、Octree 的搜索算法

### 3.1 K 近邻搜索

```python
def octree_knn_search(root, query_point, k=1):
    """
    基于 Octree 的 K 近邻搜索。

    策略：
    1. 从根开始，定位 query_point 所在的叶子节点
    2. 以该叶子中的点初始化 K 近邻集合
    3. 向外扩张搜索：检查相邻节点（通过计算节点包围盒到查询点的最小距离）
    """
    import heapq

    best_heap = []  # (-distance, point_index, point)

    def _point_to_node_min_dist(query, node):
        """
        计算查询点到节点包围盒的理论最小距离。
        如果查询点在包围盒内部，则距离为 0。
        """
        d2 = 0.0
        for dim in range(3):
            lower = node.center[dim] - node.half_size
            upper = node.center[dim] + node.half_size
            if query[dim] < lower:
                d2 += (lower - query[dim]) ** 2
            elif query[dim] > upper:
                d2 += (query[dim] - upper) ** 2
            # else: 查询点在这个维度上位于包围盒内部，距离贡献为 0
        return np.sqrt(d2)

    def _search(node):
        if node is None:
            return

        # 剪枝：如果节点包围盒到查询点的最小距离大于当前第 K 近的距离，跳过
        worst_dist = -best_heap[0][0] if len(best_heap) >= k else np.inf
        node_min_dist = _point_to_node_min_dist(query_point, node)
        if node_min_dist >= worst_dist:
            return

        if node.is_leaf:
            # 检查叶子节点中的所有点
            for pt, pt_idx in zip(node.points, node.point_indices):
                dist = np.linalg.norm(pt - query_point)
                heapq.heappush(best_heap, (-dist, pt_idx, pt))
                if len(best_heap) > k:
                    heapq.heappop(best_heap)
        else:
            # 按子节点到查询点的距离排序，优先搜索最近的子节点
            child_distances = []
            for child_idx, child in enumerate(node.children):
                if child is not None:
                    min_d = _point_to_node_min_dist(query_point, child)
                    child_distances.append((min_d, child))
            child_distances.sort(key=lambda x: x[0])

            for _, child in child_distances:
                # 再次检查剪枝条件
                cur_worst = -best_heap[0][0] if len(best_heap) >= k else np.inf
                if _point_to_node_min_dist(query_point, child) < cur_worst:
                    _search(child)

    _search(root)

    # 提取排序结果
    result = sorted(best_heap, key=lambda x: -x[0])
    distances = np.array([-r[0] for r in result])
    indices = np.array([r[1] for r in result])
    return distances, indices
```

### 3.2 半径搜索

```python
def octree_radius_search(root, query_point, radius):
    """
    基于 Octree 的半径搜索。
    返回所有距离 ≤ radius 的点。
    """
    results = []

    def _point_to_node_max_dist(query, node):
        """计算查询点到节点包围盒的理论最大距离"""
        corners = []
        for dx in [-1, 1]:
            for dy in [-1, 1]:
                for dz in [-1, 1]:
                    corner = node.center + node.half_size * np.array([dx, dy, dz])
                    corners.append(np.linalg.norm(corner - query))
        return max(corners)

    def _search(node):
        if node is None:
            return

        # 全包含快速通道：如果包围盒完全在球内，直接添加所有点
        max_d = _point_to_node_max_dist(query_point, node)
        if max_d <= radius and node.is_leaf:
            for pt, pt_idx in zip(node.points, node.point_indices):
                results.append((pt_idx, np.linalg.norm(pt - query_point), pt))
            return

        # 剪枝
        min_d = 0.0
        for dim in range(3):
            lower = node.center[dim] - node.half_size
            upper = node.center[dim] + node.half_size
            if query_point[dim] < lower:
                min_d += (lower - query_point[dim]) ** 2
            elif query_point[dim] > upper:
                min_d += (query_point[dim] - upper) ** 2
        if np.sqrt(min_d) > radius:
            return

        if node.is_leaf:
            for pt, pt_idx in zip(node.points, node.point_indices):
                dist = np.linalg.norm(pt - query_point)
                if dist <= radius:
                    results.append((pt_idx, dist, pt))
        else:
            for child in node.children:
                _search(child)

    _search(root)
    results.sort(key=lambda x: x[1])
    return ([r[0] for r in results],
            [r[1] for r in results],
            [r[2] for r in results])
```

---

## 四、Open3D 中的 Octree

```python
import open3d as o3d
import numpy as np


def open3d_octree_demo():
    """演示 Open3D 内置 Octree 功能"""
    # 创建点云
    pcd = o3d.geometry.PointCloud()
    pcd.points = o3d.utility.Vector3dVector(np.random.randn(5000, 3) * 2)

    # 构建 Octree（最大深度 8）
    octree = o3d.geometry.Octree(max_depth=8)
    octree.convert_from_point_cloud(pcd, size_expand=0.01)

    print(f"Octree 根节点: origin={octree.origin}, size={octree.size}")

    # 遍历叶子节点
    def count_leaves(node, node_info):
        if isinstance(node, o3d.geometry.OctreeLeafNode):
            if len(node.indices) > 0:
                print(f"  叶子节点 [{node_info.origin}], "
                      f"size={node_info.size}, "
                      f"点数={len(node.indices)}")

    print("\n叶子节点列表:")
    octree.traverse(count_leaves)

    # 定位某个点所在的叶子节点
    query_point = pcd.points[0]
    leaf, node_info = octree.locate_leaf_node(query_point)
    print(f"\n查询点 {query_point} 所在的叶子节点: origin={node_info.origin}")

    return octree
```

---

## 五、Octree 的核心应用

### 5.1 体素化下采样 (Voxel Downsampling)

```python
def octree_voxel_downsample(pcd, voxel_size=0.1):
    """
    利用 Octree 进行体素化质心下采样。
    每个体素内的所有点合并为质心。
    """
    points = np.asarray(pcd.points)

    # 计算体素索引
    min_bound = np.min(points, axis=0)
    voxel_indices = np.floor((points - min_bound) / voxel_size).astype(np.int32)

    # 按体素索引分组
    voxel_dict = {}
    for i, vi in enumerate(voxel_indices):
        key = tuple(vi)
        if key not in voxel_dict:
            voxel_dict[key] = []
        voxel_dict[key].append(i)

    # 每个体素取质心
    down_points = []
    down_colors = []
    has_colors = pcd.has_colors()
    colors = np.asarray(pcd.colors) if has_colors else None

    for key, indices in voxel_dict.items():
        cluster_pts = points[indices]
        down_points.append(np.mean(cluster_pts, axis=0))
        if has_colors:
            down_colors.append(np.mean(colors[indices], axis=0))

    down_pcd = o3d.geometry.PointCloud()
    down_pcd.points = o3d.utility.Vector3dVector(np.array(down_points))
    if has_colors:
        down_pcd.colors = o3d.utility.Vector3dVector(np.array(down_colors))

    print(f"[Voxel Downsample] {len(pcd.points)} → {len(down_points)} 点")
    return down_pcd


# Open3D 内置的体素下采样:
# pcd_down = pcd.voxel_down_sample(voxel_size=0.1)
```

### 5.2 多分辨率分析（LOD）

Octree 天然支持多级细节层次（Level of Detail, LOD）：

```
  LOD 层次                    可视化效果                  点数
  ───────────────────────────────────────────────────────────
  LOD 0 (深度 0)              ┌──────────┐                 1 个质心
                              │    ★     │
                              └──────────┘
  LOD 1 (深度 2)              ┌──┬──┬──┬──┐                ~64 个质心
                              │★ │  │ ★│  │
                              └──┴──┴──┴──┘
  LOD 2 (深度 5)              ┌┬┬┬┬┬┬┬┬┐                 ~32K 个点
                              ├┼┼┼┼┼┼┼┼┤
                              └┴┴┴┴┴┴┴┴┘
```

```python
def extract_lod(octree, max_depth):
    """从 Octree 中提取指定深度的 LOD 点集"""
    points = []

    def _collect(node, node_info):
        if isinstance(node, o3d.geometry.OctreeInternalNode):
            if node_info.depth >= max_depth:
                points.append(node_info.origin)
            # 如果未到目标深度，traverse 会继续深入子节点

    # 重建 Octree 的 LOD 提取
    # （注：此处为示意，Open3D 的 Octree.traverse 会自动处理深度）
    return np.array(points)
```

### 5.3 点云压缩与序列化

Octree 的结构可以用二进制流高效编码：每个内部节点用 8 bits 表示哪些子节点非空，叶子节点存储点数据。这使得 Octree 成为点云压缩标准（如 MPEG G-PCC）的核心数据结构。

```
  二进制编码示意 (每个节点一个字节):

  根节点:  11100000  → 子节点 0,1,2 非空
  节点 0:  10100000  → 子节点 0,2 非空
  节点 1:  00000000  → 叶子节点（全0表示无子节点）
  ...

  这种编码方式在存储和网络传输中极其高效。
```

---

## 六、Octree vs KD-Tree 详细对比

```
  Octree (空间驱动划分)              KD-Tree (数据驱动划分)

  ┌─────┬─────┬─────┬─────┐        ┌───────────┬───────────┐
  │ ··  │  ·  │     │     │        │    · ·    │           │
  ├─────┼─────┼─────┼─────┤        │     ·     │    · ·    │
  │  ·  │ ··  │  ·  │     │        ├───────────┼───────────┤
  ├─────┼─────┼─────┼─────┤        │  ·   ·    │    ··     │
  │     │   · │     │   · │        │           │   ·    ·  │
  ├─────┼─────┼─────┼─────┤        │          ·│           │
  │     │     │ ·   │ ·   │        └───────────┴───────────┘
  └─────┴─────┴─────┴─────┘
  均匀切分，不管点在哪              在中位数处切分，保证平衡
```

| 特性 | Octree | KD-Tree |
|------|--------|---------|
| **划分策略** | 空间八等分（固定） | 数据中位数（自适应） |
| **平衡性** | 空间平衡，数据可能不平衡 | 数据平衡（树高 $O(\log N)$） |
| **空洞处理** | 空区域被合并跳过 | 不处理空洞 |
| **最近邻搜索** | $O(\log N)$（需处理跨体素） | $O(\log N)$（剪枝更优） |
| **半径搜索** | 可直接跳过大片空白区域 | 依赖剪枝策略 |
| **体素操作** | 天然适配 | 不适合 |
| **增删点** | 需局部重构 | 树的旋转/重构更复杂 |
| **压缩存储** | 优秀（二进制编码） | 一般 |

---

## 总结

Octree 是三维点云处理中"空间驱动"的索引结构，其核心优势在于：

1. **自适应密度**：只有含数据的区域才会被继续细分，避免了 KD-Tree 在稀疏区域的浪费。
2. **体素操作天然适配**：体素下采样、体素融合、碰撞检测等。
3. **多分辨率表达**：通过控制遍历深度，可获取不同精度的 LOD。
4. **高效压缩**：8-bit 子节点掩码 + 叶子数据 = 极简的二进制序列化。

对于大规模非均匀分布的点云（如室外 LiDAR 扫描数据），Octree 往往是比 KD-Tree 更优的选择。

下一章将进入聚类算法模块，从**聚类算法简介**开始，学习如何在点云中自动发现物体和区域。
