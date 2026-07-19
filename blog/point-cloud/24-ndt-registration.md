---
title: 三维点云处理：NDT 正态分布变换配准——无需对应点搜索的概率配准
description: 深入讲解 NDT (Normal Distributions Transform) 配准算法的原理，包括点云的体素化分段正态分布建模、概率密度函数的构建、牛顿法/梯度下降的姿态优化，以及与 ICP 的全面对比。
---

# 三维点云处理：NDT 正态分布变换配准——无需对应点搜索的概率配准

ICP 需要在每一次迭代中为每个源点找到目标点云中的最近点，这个 $O(N \log N)$ 的搜索步骤占据了大部分计算时间。**NDT（Normal Distributions Transform，正态分布变换）** 走了一条完全不同的路：它不找显式的点对点对应关系，而是将目标点云建模为概率密度函数（PDF），然后优化源点云在该 PDF 下的"似然"。

---

## 一、NDT 的核心思想

### 1.1 从离散点到连续概率密度

NDT 将目标点云所在的 3D 空间划分为规则的体素网格，在每个体素内用一个 3D 高斯分布来概括该体素内所有点的概率分布：


<svg viewBox="0 0 600 180" width="100%" style="background-color: transparent; font-family: sans-serif; margin: 20px 0; overflow: visible;">
  <!-- Original Point Cloud (Left) -->
  <g transform="translate(40, 20)">
  <rect x="0" y="20" width="120" height="90" fill="rgba(100, 100, 100, 0.05)" stroke="var(--vp-c-divider)" stroke-width="1" rx="4" />
  <text x="60" y="10" text-anchor="middle" font-size="12" fill="currentColor">1. 原始目标点云</text>
  <circle cx="30" cy="40" r="2" fill="var(--vp-c-text-3)" />
  <circle cx="35" cy="45" r="2" fill="var(--vp-c-text-3)" />
  <circle cx="28" cy="50" r="2" fill="var(--vp-c-text-3)" />
  <circle cx="45" cy="38" r="2" fill="var(--vp-c-text-3)" />
  <circle cx="90" cy="80" r="2" fill="var(--vp-c-text-3)" />
  <circle cx="85" cy="85" r="2" fill="var(--vp-c-text-3)" />
  <circle cx="95" cy="75" r="2" fill="var(--vp-c-text-3)" />
  <circle cx="70" cy="50" r="2" fill="var(--vp-c-text-3)" />
  <circle cx="65" cy="55" r="2" fill="var(--vp-c-text-3)" />
  </g>
  <!-- Arrow 1 -->
  <g transform="translate(170, 20)">
  <line x1="0" y1="65" x2="30" y2="65" stroke="currentColor" stroke-width="1.5" marker-end="url(#ndt-arrow)" />
  </g>
  <!-- Grid division (Middle) -->
  <g transform="translate(210, 20)">
  <text x="60" y="10" text-anchor="middle" font-size="12" fill="currentColor">2. 体素网格划分</text>
  <rect x="0" y="20" width="120" height="90" fill="none" stroke="currentColor" stroke-width="1.5" rx="4" />
  <line x1="40" y1="20" x2="40" y2="110" stroke="currentColor" stroke-dasharray="2 2" stroke-width="1" />
  <line x1="80" y1="20" x2="80" y2="110" stroke="currentColor" stroke-dasharray="2 2" stroke-width="1" />
  <line x1="0" y1="50" x2="120" y2="50" stroke="currentColor" stroke-dasharray="2 2" stroke-width="1" />
  <line x1="0" y1="80" x2="120" y2="80" stroke="currentColor" stroke-dasharray="2 2" stroke-width="1" />
  <circle cx="20" cy="35" r="2" fill="#1677ff" />
  <circle cx="25" cy="40" r="2" fill="#1677ff" />
  <circle cx="60" cy="65" r="2" fill="#1677ff" />
  <circle cx="58" cy="72" r="2" fill="#1677ff" />
  <circle cx="100" cy="95" r="2" fill="#1677ff" />
  <circle cx="105" cy="92" r="2" fill="#1677ff" />
  </g>
  <!-- Arrow 2 -->
  <g transform="translate(340, 20)">
  <line x1="0" y1="65" x2="30" y2="65" stroke="currentColor" stroke-width="1.5" marker-end="url(#ndt-arrow)" />
  </g>
  <!-- Gaussian modeling (Right) -->
  <g transform="translate(380, 20)">
  <text x="80" y="10" text-anchor="middle" font-size="12" fill="currentColor">3. 局部高斯拟合 (PDF)</text>
  <rect x="0" y="20" width="160" height="90" fill="none" stroke="currentColor" stroke-width="1.5" rx="4" />
  <line x1="53.3" y1="20" x2="53.3" y2="110" stroke="currentColor" stroke-dasharray="2 2" stroke-width="1" />
  <line x1="106.6" y1="20" x2="106.6" y2="110" stroke="currentColor" stroke-dasharray="2 2" stroke-width="1" />
  <line x1="0" y1="50" x2="160" y2="50" stroke="currentColor" stroke-dasharray="2 2" stroke-width="1" />
  <line x1="0" y1="80" x2="160" y2="80" stroke="currentColor" stroke-dasharray="2 2" stroke-width="1" />
  <ellipse cx="26.6" cy="35" rx="20" ry="12" fill="rgba(82, 196, 26, 0.15)" stroke="#52c41a" stroke-width="1.5" />
  <text x="26.6" y="38" text-anchor="middle" font-size="9" fill="#52c41a">N₁</text>
  <ellipse cx="80" cy="65" rx="18" ry="10" fill="rgba(82, 196, 26, 0.15)" stroke="#52c41a" stroke-width="1.5" />
  <text x="80" y="68" text-anchor="middle" font-size="9" fill="#52c41a">N₂</text>
  <ellipse cx="133.3" cy="95" rx="22" ry="12" fill="rgba(82, 196, 26, 0.15)" stroke="#52c41a" stroke-width="1.5" />
  <text x="133.3" y="98" text-anchor="middle" font-size="9" fill="#52c41a">N₃</text>
  </g>
  <defs>
  <marker id="ndt-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="currentColor" />
  </marker>
  </defs>
</svg>

$N_k = (\mu_k, \Sigma_k)$: 该体素内所有点的均值和协方差矩阵。


### 1.2 为什么要这样做？

ICP 的"找最近点"是一个明确的 hard assignment。而 NDT 是 **soft assignment**：一个点可以"部分属于"多个高斯分布（通过 PDF 的值来体现）。

这种概率化建模带来了天然的优势：

- **不需要显式的对应关系**——每个源点只需评估它在 PDF 中的"得分"。
- **对初始位姿更宽容**——PDF 的连续性使得梯度信息在整个空间中都存在。
- **在结构化环境中特别鲁棒**——当 ICP 在走廊/隧道等场景中因对称性迷失时，NDT 的全局 PDF 形状能提供正确的梯度。

---

## 二、NDT 的数学推导

### 2.1 体素内的高斯建模

对于体素 $k$ 内包含的点集 $\{p_1, \ldots, p_m\}$，计算其均值和协方差：

$$\mu_k = \frac{1}{m} \sum_{j=1}^m p_j$$

$$\Sigma_k = \frac{1}{m-1} \sum_{j=1}^m (p_j - \mu_k)(p_j - \mu_k)^T$$

体素 $k$ 在空间位置 $x$ 处的概率密度为：

$$p_k(x) = \frac{1}{(2\pi)^{3/2} \sqrt{|\Sigma_k|}} \exp\left(-\frac{1}{2}(x - \mu_k)^T \Sigma_k^{-1} (x - \mu_k)\right)$$

### 2.2 优化目标：最大化对数似然

给定变换 $(R, t)$，源点 $s_i$ 变换后的位置为 $s_i' = R s_i + t$。NDT 的优化目标是最大化所有源点的对数似然之和：

$$\max_{R, t} \sum_{i=1}^{N_s} \log \sum_{k=1}^{K} p_k(s_i')$$

但由于每个点只落在少数几个体素内，实际只需评估所在体素的高斯分布。

可引入均匀分布分量来处理离群点：

$$\tilde{p}(x) = c_1 \cdot \exp\left(-\frac{(x-\mu)^T \Sigma^{-1} (x-\mu)}{2}\right) + c_2 \cdot p_0$$

其中 $p_0$ 是常数（均匀分布的 PDF），$c_1 + c_2 = 1$。

### 2.3 目标函数的 Hessian 与牛顿法

定义评分函数：

$$s(x) = -\log \tilde{p}(x)$$

总目标：

$$\min_{R, t} \sum_{i=1}^{N_s} s(R s_i + t)$$

牛顿法需要梯度 $\nabla s$ 和 Hessian $\nabla^2 s$。对于 3D NDT，这是一个 6 自由度的优化问题（3 旋转 + 3 平移），通过流形上的牛顿法或 LM（Levenberg-Marquardt）求解。

---

## 三、Python 实现

```python
import numpy as np
from scipy.spatial import KDTree


def build_ndt_model(points, voxel_size=0.5, min_points_per_voxel=5):
    """
    构建 NDT 模型：将点云划分为体素，每个体素拟合高斯分布。

    :param points: N x 3 目标点云
    :param voxel_size: 体素边长
    :param min_points_per_voxel: 体素中最小点数
    :return: dict {(voxel_idx_tuple): (mean, cov)}
    """
    min_bound = np.min(points, axis=0)
    voxel_dict = {}

    for pt in points:
        voxel_idx = tuple(np.floor((pt - min_bound) / voxel_size).astype(int))
        if voxel_idx not in voxel_dict:
            voxel_dict[voxel_idx] = []
        voxel_dict[voxel_idx].append(pt)

    ndt_model = {}
    for idx, pts in voxel_dict.items():
        if len(pts) < min_points_per_voxel:
            continue
        pts_arr = np.array(pts)
        mean = np.mean(pts_arr, axis=0)
        cov = np.cov(pts_arr, rowvar=False)
        # 正则化防止奇异
        cov += 1e-6 * np.eye(3)
        ndt_model[idx] = (mean, cov)

    return ndt_model, min_bound, voxel_size


def ndt_score(transformed_point, ndt_model, min_bound, voxel_size):
    """
    计算单个变换后的点在 NDT 模型中的"负对数似然"得分。
    """
    voxel_idx = tuple(np.floor((transformed_point - min_bound) / voxel_size).astype(int))
    if voxel_idx not in ndt_model:
        return 1e6  # 高惩罚：点落在无数据区域

    mean, cov = ndt_model[voxel_idx]
    diff = transformed_point - mean

    # 马氏距离平方
    try:
        maha_sq = diff @ np.linalg.solve(cov, diff)
    except np.linalg.LinAlgError:
        return 1e6

    # 简化的负对数似然（忽略常数项）
    return 0.5 * maha_sq


def ndt_registration(source, target, voxel_size=0.5, max_iters=50,
                     step_size=0.1, tol=1e-6):
    """
    简化的 NDT 配准（使用梯度下降而非牛顿法，便于理解）。

    :param source: N_s x 3 源点云
    :param target: N_t x 3 目标点云
    :return: R, t
    """
    # 1. 构建 NDT 模型
    ndt_model, min_bound, vs = build_ndt_model(target, voxel_size)

    # 2. 初始化变换
    R = np.eye(3)
    t = np.zeros(3)

    prev_score = np.inf

    for iteration in range(max_iters):
        # 变换源点
        transformed = (R @ source.T).T + t

        # 计算总得分
        total_score = sum(
            ndt_score(pt, ndt_model, min_bound, vs) for pt in transformed
        )

        # 数值梯度（简化的 6DOF 梯度）
        delta = 1e-4
        grad = np.zeros(6)

        # 对旋转的扰动（使用 axis-angle 参数化）
        for d in range(3):
            axis = np.zeros(3); axis[d] = delta
            theta = delta
            K = np.array([[0, -axis[2], axis[1]],
                          [axis[2], 0, -axis[0]],
                          [-axis[1], axis[0], 0]])
            dR = np.eye(3) + np.sin(theta) * K + (1 - np.cos(theta)) * K @ K
            R_plus = dR @ R
            transformed_plus = (R_plus @ source.T).T + t
            score_plus = sum(
                ndt_score(p, ndt_model, min_bound, vs) for p in transformed_plus
            )
            grad[d] = (score_plus - total_score) / delta

        # 对平移的梯度
        for d in range(3):
            t_plus = t.copy(); t_plus[d] += delta
            transformed_plus = (R @ source.T).T + t_plus
            score_plus = sum(
                ndt_score(p, ndt_model, min_bound, vs) for p in transformed_plus
            )
            grad[3 + d] = (score_plus - total_score) / delta

        # 梯度下降更新
        omega_update = -step_size * grad[:3]
        t_update = -step_size * grad[3:]

        # 从 omega 构建旋转更新
        theta = np.linalg.norm(omega_update)
        if theta > 1e-10:
            axis = omega_update / theta
            K_mat = np.array([
                [0, -axis[2], axis[1]],
                [axis[2], 0, -axis[0]],
                [-axis[1], axis[0], 0]
            ])
            dR = np.eye(3) + np.sin(theta) * K_mat + (1 - np.cos(theta)) * K_mat @ K_mat
            R = dR @ R

        t = t + t_update

        # 收敛检查
        score_change = abs(prev_score - total_score)
        if score_change < tol:
            print(f"[NDT] 第 {iteration+1} 轮收敛 (Δscore={score_change:.6f})")
            break
        prev_score = total_score

    return R, t
```

---

## 四、使用 Open3D 的 NDT 配准

```python
import open3d as o3d


def open3d_ndt_registration(source, target, voxel_size=0.5, init=np.eye(4)):
    """
    使用 Open3D 进行 NDT 配准（使用 Pipelines 注册模块）。
    """
    # NDT 配准
    result = o3d.pipelines.registration.registration_ndt(
        source, target,
        max_correspondence_distance=voxel_size * 2,
        init=init,
        estimation_method=o3d.pipelines.registration.TransformationEstimationPointToPoint(),
        criteria=o3d.pipelines.registration.ICPConvergenceCriteria(
            relative_fitness=1e-6,
            relative_rmse=1e-6,
            max_iteration=200
        )
    )

    print(f"[NDT] fitness={result.fitness:.3f}, "
          f"inlier_rmse={result.inlier_rmse:.4f}")

    return result.transformation
```

---

## 五、NDT vs ICP 深度对比


<svg viewBox="0 0 600 220" width="100%" style="background-color: transparent; font-family: sans-serif; margin: 20px 0; overflow: visible;">
  <!-- ICP Corridor (Left) -->
  <g transform="translate(50, 20)">
  <text x="100" y="0" text-anchor="middle" font-size="14" fill="currentColor">ICP (最近邻搜索)</text>
  <line x1="10" y1="40" x2="190" y2="40" stroke="currentColor" stroke-width="2" />
  <line x1="10" y1="120" x2="190" y2="120" stroke="currentColor" stroke-width="2" />
  <circle cx="40" cy="50" r="3" fill="#1677ff" />
  <circle cx="40" cy="70" r="3" fill="#1677ff" />
  <circle cx="40" cy="90" r="3" fill="#1677ff" />
  <circle cx="40" cy="110" r="3" fill="#1677ff" />
  <circle cx="160" cy="55" r="3" fill="#fa8c16" />
  <circle cx="160" cy="75" r="3" fill="#fa8c16" />
  <circle cx="160" cy="95" r="3" fill="#fa8c16" />
  <circle cx="160" cy="115" r="3" fill="#fa8c16" />
  <line x1="40" y1="50" x2="160" y2="55" stroke="#f5222d" stroke-width="1.5" stroke-dasharray="2 2" />
  <line x1="40" y1="70" x2="160" y2="75" stroke="#f5222d" stroke-width="1.5" stroke-dasharray="2 2" />
  <line x1="40" y1="90" x2="160" y2="95" stroke="#f5222d" stroke-width="1.5" stroke-dasharray="2 2" />
  <line x1="40" y1="110" x2="160" y2="115" stroke="#f5222d" stroke-width="1.5" stroke-dasharray="2 2" />
  <text x="100" y="160" text-anchor="middle" font-size="12" fill="#f5222d">"最近点"沿走廊方向关联模糊<br/>容易陷入错误的纵向平移量</text>
  </g>
  <!-- NDT Corridor (Right) -->
  <g transform="translate(350, 20)">
  <text x="100" y="0" text-anchor="middle" font-size="14" fill="currentColor">NDT (概率高斯似然)</text>
  <line x1="10" y1="40" x2="190" y2="40" stroke="currentColor" stroke-width="2" />
  <line x1="10" y1="120" x2="190" y2="120" stroke="currentColor" stroke-width="2" />
  <ellipse cx="160" cy="80" rx="30" ry="40" fill="rgba(82, 196, 26, 0.15)" stroke="#52c41a" stroke-dasharray="3 1" stroke-width="1.5" />
  <circle cx="40" cy="50" r="3" fill="#1677ff" />
  <circle cx="40" cy="70" r="3" fill="#1677ff" />
  <circle cx="40" cy="90" r="3" fill="#1677ff" />
  <circle cx="40" cy="110" r="3" fill="#1677ff" />
  <line x1="40" y1="50" x2="130" y2="70" stroke="#52c41a" stroke-width="1.5" marker-end="url(#arrow-green-corridor)" />
  <line x1="40" y1="70" x2="130" y2="75" stroke="#52c41a" stroke-width="1.5" marker-end="url(#arrow-green-corridor)" />
  <line x1="40" y1="90" x2="130" y2="85" stroke="#52c41a" stroke-width="1.5" marker-end="url(#arrow-green-corridor)" />
  <line x1="40" y1="110" x2="130" y2="90" stroke="#52c41a" stroke-width="1.5" marker-end="url(#arrow-green-corridor)" />
  <text x="100" y="160" text-anchor="middle" font-size="12" fill="#52c41a">PDF 梯度指向高斯分布中心<br/>提供明确的平移对齐梯度</text>
  </g>
  <defs>
  <marker id="arrow-green-corridor" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto">
  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#52c41a" />
  </marker>
  </defs>
</svg>


| 维度 | ICP | NDT |
|------|-----|-----|
| **对应关系** | 显式（找最近点） | 隐式（通过 PDF） |
| **计算瓶颈** | 最近邻搜索 $O(N \log N)$ | PDF 评估 + Hessian 计算 |
| **对初始位姿** | 敏感 | 相对宽容 |
| **在结构化场景** | 易迷失（走廊/隧道） | 鲁棒 ✅ |
| **对非结构化场景** | 表现好 | 可能过平滑 |
| **参数** | 对应距离阈值 | 体素大小（关键） |
| **速度（大点云）** | 快（KD-Tree 加速） | 中等（依赖体素分辨率） |
| **收敛盆地** | 小（需好的初值） | 较大 |

### 5.1 何时选择 NDT？

- ✅ 场景具有重复结构（走廊、隧道、建筑立面）
- ✅ 初始位姿不太精确（NDT 有更宽的收敛域）
- ✅ 激光扫描数据（NDT 原始为 2D 激光设计，3D LiDAR 天然适配）
- ❌ 非常稀疏的点云（体素内点数不足，高斯估计不可靠）
- ❌ 极度非刚性的变形场景

---

## 六、总结

| 概念 | 要点 |
|------|------|
| **NDT 核心** | 将点云建模为分段连续的概率密度函数（体素高斯混合） |
| **优化方式** | 最大化源点在 PDF 下的对数似然 → 牛顿法/梯度下降 |
| **关键参数** | 体素大小（trade-off：精度 vs 速度 vs 收敛性） |
| **最大优势** | 不需要显式对应点搜索，对初始位姿宽容，在结构化场景中鲁棒 |
| **与 ICP 的关系** | 互补而非替代——NDT 可作粗配准，ICP 作精配准 |

NDT 和 ICP 各有擅长。在实际项目中，许多 SLAM 系统（如 hdl_graph_slam）使用 NDT 作为前端里程计，ICP 作为后端全局优化。下一章将学习最后一种配准方法——**RANSAC 粗配准**，用几何一致性快速找到初始变换。
