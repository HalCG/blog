---
title: 三维点云处理：RANSAC 鲁棒拟合——随机采样一致性算法
description: 系统讲解 RANSAC 算法的数学原理，包括内点/外点模型、采样次数公式推导、终止条件与质量评估，并给出点云平面、球面、圆柱拟合的完整 Open3D 实现。
---

# 三维点云处理：RANSAC 鲁棒拟合——随机采样一致性算法

在上一章中我们看到，霍夫变换在高维参数空间中的计算代价是惊人的。**RANSAC（RANdom SAmple Consensus，随机采样一致性）** 是另一种鲁棒参数估计方法，它通过"假设-验证"范式绕过了对参数空间的显式离散化，特别适合三维点云的几何基元拟合。

---

## 一、RANSAC 的哲学：假设-验证

### 1.1 核心思想

RANSAC 的基本循环只有两步：

1. **假设（Hypothesize）**：从数据中随机采样最小点集，拟合一个候选模型。
2. **验证（Verify）**：用全体数据验证该模型——统计一致点的数量（"内点"）。

重复以上过程，保留内点最多的模型。

```
  RANSAC vs 最小二乘 vs 霍夫变换

  数据: 平面点 + 离群点          最小二乘                RANSAC

  ·  ·  ·  ·  ·                                ────────────────
  · ───────────── ·            ─────╱─────      · ──────────── ·
  · ───────────── ·           拟合结果被     · ──────────────── ·
  · ───────────── ·           离群点拉偏         · (离群点被忽略) ·
  ·  ·  ·  ·  ·               ❌                   ✅
```

### 1.2 最小采样点集

要唯一确定一个模型的参数，需要的最少点数：

| 几何基元 | 参数数 | 最少采样点数 |
|----------|--------|-------------|
| **2D 直线** | 2 | 2 |
| **2D 圆** | 3 | 3 |
| **3D 平面** | 3 | 3 |
| **3D 球面** | 4 | 4 |
| **3D 圆柱** | 5（方向 2 + 半径 1 + 轴上点偏移 2） | 5（或 2 点 + 法向量） |

---

## 二、采样次数：需要多少次迭代？

### 2.1 采样次数公式

设：
- $s$：最小采样点集的大小
- $p$：内点率（inlier ratio）= 内点数 / 总点数
- $P$：期望成功率（如 0.99 = 99% 置信度）

则需要的最少采样次数 $N$ 满足：

$$1 - (1 - p^s)^N \geq P$$

解得：

$$N \geq \frac{\log(1 - P)}{\log(1 - p^s)}$$

### 2.2 数值直觉

```
  不同内点率和采样大小下的所需迭代次数 (P=0.99)

  p (内点率)    s=3 (平面)    s=4 (球面)    s=5 (圆柱)
  ──────────────────────────────────────────────────
  0.9              3              4             4
  0.7             10             17            25
  0.5             35             71           145
  0.3            169            509         1,527
  0.1          4,603         46,049       460,495

  关键洞察: 内点率过低时，RANSAC 的采样次数急剧增加。
```

```python
def ransac_iterations(sample_size, inlier_ratio, confidence=0.99):
    """
    计算 RANSAC 所需的最小迭代次数。

    :param sample_size: 最小采样点集的大小 s
    :param inlier_ratio: 估计的内点率 p
    :param confidence: 期望成功率 P
    """
    import math
    if inlier_ratio >= 1.0:
        return 1
    p_s = inlier_ratio ** sample_size
    if p_s >= 1.0:
        return 1
    return int(math.ceil(math.log(1 - confidence) / math.log(1 - p_s)))
```

### 2.3 自适应停止条件

在运行中动态估计内点率，自适应调整迭代次数：

```python
def adaptive_ransac_max_iters(current_best_inliers, total_points, sample_size,
                               confidence=0.99):
    """自适应更新最大迭代次数"""
    inlier_ratio = current_best_inliers / total_points
    if inlier_ratio > 0:
        return ransac_iterations(sample_size, inlier_ratio, confidence)
    return float('inf')
```

---

## 三、RANSAC 算法流程

```
  ┌─────────────────────────────────────────────────────┐
  │                RANSAC 算法                            │
  ├─────────────────────────────────────────────────────┤
  │                                                      │
  │  输入: 数据 X, 模型类型, 距离阈值 τ, 置信度 P          │
  │                                                      │
  │  best_model ← None                                    │
  │  best_inliers ← []                                    │
  │  max_iters ← ∞                                       │
  │  iter ← 0                                             │
  │                                                      │
  │  while iter < max_iters:                             │
  │    1. 随机采样 s 个点                                  │
  │    2. 拟合模型 hypothesis ← fit(sample)                │
  │    3. 验证：统计误差 < τ 的内点数 n_inliers            │
  │    4. 如果 n_inliers > best_inliers:                  │
  │          best_model ← hypothesis                      │
  │          best_inliers ← n_inliers                      │
  │          更新 max_iters (自适应)                       │
  │    5. iter ← iter + 1                                 │
  │                                                      │
  │  可选: 用所有内点重新拟合模型 (LS 精化)                 │
  │                                                      │
  │  输出: best_model, best_inlier_indices               │
  └─────────────────────────────────────────────────────┘
```

---

## 四、完整 Python 实现

### 4.1 通用 RANSAC 框架

```python
import numpy as np


def ransac(data, fit_func, residual_func, sample_size,
           inlier_threshold, max_iters=None, confidence=0.99,
           min_inliers_ratio=0.1, refine=True):
    """
    通用 RANSAC 框架。

    :param data: N x d 输入数据
    :param fit_func: fit(sample_points) → model
    :param residual_func: residual(model, point) → float (越小越好)
    :param sample_size: 每次采样的点数 s
    :param inlier_threshold: 内点判定距离阈值 τ
    :param max_iters: 最大迭代次数 (None=自适应)
    :param confidence: 期望成功率 P
    :param min_inliers_ratio: 最小可接受的内点率
    :param refine: 是否用最终内点重新拟合
    :return: (best_model, best_inlier_indices, best_inlier_count)
    """
    N = data.shape[0]
    best_model = None
    best_inlier_indices = np.array([], dtype=np.int64)
    best_inlier_count = 0

    if max_iters is None:
        max_iters = float('inf')

    iter_count = 0
    while iter_count < max_iters and iter_count < 10000:  # 硬上限避免无限循环
        # 1. 随机采样
        sample_indices = np.random.choice(N, sample_size, replace=False)
        sample = data[sample_indices]

        # 2. 拟合模型
        try:
            model = fit_func(sample)
            if model is None:
                iter_count += 1
                continue
        except Exception:
            iter_count += 1
            continue

        # 3. 计算所有点的残差并统计内点
        residuals = np.array([residual_func(model, data[i]) for i in range(N)])
        inlier_mask = residuals < inlier_threshold
        inlier_count = inlier_mask.sum()

        # 4. 更新最佳模型
        if inlier_count > best_inlier_count:
            best_inlier_count = inlier_count
            best_model = model
            best_inlier_indices = np.where(inlier_mask)[0]

            # 自适应更新迭代次数
            if max_iters == float('inf') or True:
                inlier_ratio = inlier_count / N
                if inlier_ratio > 0:
                    new_max = ransac_iterations(sample_size, inlier_ratio, confidence)
                    max_iters = min(max_iters, new_max) if max_iters != float('inf') else new_max

        iter_count += 1

    # 5. 可选：用最佳内点进行最终精拟合
    if refine and best_inlier_count >= sample_size:
        best_model = fit_func(data[best_inlier_indices])

    return best_model, best_inlier_indices, best_inlier_count
```

### 4.2 平面拟合

```python
def ransac_plane(points, distance_threshold=0.05, max_iters=None,
                 confidence=0.99):
    """
    RANSAC 三维平面拟合。

    :param points: N x 3 点云
    :return: (plane_model, inlier_indices)
             plane_model = [a, b, c, d] 满足 ax + by + cz + d = 0
    """
    def fit_plane(sample):
        """从 3 个点拟合平面法向量"""
        v1 = sample[1] - sample[0]
        v2 = sample[2] - sample[0]
        normal = np.cross(v1, v2)
        norm = np.linalg.norm(normal)
        if norm < 1e-10:
            return None
        normal = normal / norm
        d = -np.dot(normal, sample[0])
        return np.array([normal[0], normal[1], normal[2], d])

    def residual_plane(model, point):
        """点到平面的垂直距离"""
        a, b, c, d = model
        return np.abs(a * point[0] + b * point[1] + c * point[2] + d)

    model, inliers, count = ransac(
        points, fit_plane, residual_plane,
        sample_size=3,
        inlier_threshold=distance_threshold,
        max_iters=max_iters,
        confidence=confidence
    )

    return model, inliers
```

### 4.3 球面拟合

```python
def ransac_sphere(points, distance_threshold=0.05, max_iters=None):
    """
    RANSAC 三维球面拟合。

    :return: (center, radius), inlier_indices
    """
    def fit_sphere(sample):
        """从 4 个点拟合球面（使用线性化技巧）"""
        x, y, z = sample[:, 0], sample[:, 1], sample[:, 2]
        A = np.column_stack([x, y, z, np.ones(4)])
        b = -(x**2 + y**2 + z**2)

        try:
            beta = np.linalg.solve(A, b)
        except np.linalg.LinAlgError:
            return None

        center = -beta[:3] / 2
        radius = np.sqrt(np.sum(center**2) - beta[3])
        return (center, radius)

    def residual_sphere(model, point):
        center, radius = model
        return np.abs(np.linalg.norm(point - center) - radius)

    model, inliers, count = ransac(
        points, fit_sphere, residual_sphere,
        sample_size=4,
        inlier_threshold=distance_threshold,
        max_iters=max_iters
    )

    return model, inliers
```

---

## 五、使用 Open3D 内置 RANSAC

Open3D 提供了高度优化的 C++ 级 RANSAC 实现：

```python
import open3d as o3d
import numpy as np


def open3d_ransac_demo(pcd):
    """演示 Open3D 的 RANSAC 平面和球面检测"""

    # ── 平面检测 ──
    plane_model, inlier_indices = pcd.segment_plane(
        distance_threshold=0.05,
        ransac_n=3,                # 最小采样点数
        num_iterations=1000        # 最大迭代次数
    )
    # plane_model = [a, b, c, d] 满足 ax + by + cz + d = 0

    inlier_cloud = pcd.select_by_index(inlier_indices)
    outlier_cloud = pcd.select_by_index(inlier_indices, invert=True)

    # 给内点上色
    inlier_cloud.paint_uniform_color([1.0, 0.0, 0.0])   # 红色 = 平面
    outlier_cloud.paint_uniform_color([0.6, 0.6, 0.6])  # 灰色 = 其余

    print(f"检测到平面: {plane_model}")
    print(f"  内点数: {len(inlier_indices)}/{len(pcd.points)}")

    return plane_model, inlier_cloud, outlier_cloud


def sequential_ransac(pcd, n_planes=3, distance_threshold=0.03):
    """
    序贯 RANSAC：依次从点云中提取多个平面。

    每检测到一个平面，将对应内点从点云中移除，然后继续检测下一个。
    """
    remaining = pcd
    planes = []
    all_inlier_indices = []

    for i in range(n_planes):
        plane_model, inliers = remaining.segment_plane(
            distance_threshold=distance_threshold,
            ransac_n=3,
            num_iterations=1000
        )

        if len(inliers) < 100:  # 内点太少，停止
            print(f"  第 {i+1} 个平面只找到 {len(inliers)} 个内点，停止。")
            break

        planes.append(plane_model)

        # 为可视化着色
        remaining = remaining.select_by_index(inliers, invert=True)

        ratio = 100 * len(inliers) / len(pcd.points)
        print(f"平面 {i+1}: {plane_model[:3]} (法向量), "
              f"内点: {len(inliers)} ({ratio:.1f}%)")

    return planes
```

---

## 六、RANSAC 的局限性与改进

| 局限性 | 说明 | 改进方案 |
|--------|------|----------|
| **阈值 $\tau$ 敏感** | 太大会混入噪声、太小会丢失内点 | MSAC（软阈值） |
| **退化配置** | 3 个采样点共线时无法定义平面 | 采样后检查退化并重采 |
| **多模型** | 只能找一个模型 | 序贯 RANSAC（逐个移除） |
| **伪影** | 可能在随机噪声中找到虚假结构 | 用统计检验验证最终模型 |
| **内点率极低** | $p < 10\%$ 时几乎不可能采样到好集合 | PROSAC（渐进采样）或局部优化 |

### 6.1 MSAC（M-Estimator SAmple Consensus）

MSAC 不设硬阈值，而是对残差进行平滑惩罚（如 Huber 损失），降低了阈值敏感度：

$$L(r) = \begin{cases} r^2 & |r| \leq \tau \\ 2\tau|r| - \tau^2 & |r| > \tau \end{cases}$$

### 6.2 退化检测

```python
def is_degenerate_plane_sample(sample):
    """检查 3 个采样点是否共线（会导致无法确定平面）"""
    v1 = sample[1] - sample[0]
    v2 = sample[2] - sample[0]
    cross_norm = np.linalg.norm(np.cross(v1, v2))
    # 叉积接近于 0 → 三点接近共线 → 退化
    return cross_norm < 1e-6
```

---

## 七、总结

| 概念 | 要点 |
|------|------|
| **范式** | 假设（随机采样 + 拟合）+ 验证（统计内点），重复 |
| **采样次数** | $N = \log(1-P) / \log(1-p^s)$，自适应更新 |
| **关键参数** | 距离阈值 $\tau$（最敏感）、最小采样数 $s$、置信度 $P$ |
| **优势** | 鲁棒（可容忍 $>50\%$ 外点）、通用（任何模型）、简单 |
| **劣势** | 阈值敏感、内点率极低时效率差、非确定性 |
| **点云应用** | 地面分割、建筑物立面提取、球/圆柱检测 |

> **RANSAC 的本质**：RANSAC 不做参数空间的显式格点化，而是通过随机采样在模型空间中"跳跃"，用一致性投票来验证。这是它与霍夫变换最大的区别——霍夫变换用显式累加器，RANSAC 用随机假设。

本章是拟合模块的最后一章。从下一章开始，我们将进入一个新的主题——**三维特征点检测与描述**，这是点云配准和识别的基础。
