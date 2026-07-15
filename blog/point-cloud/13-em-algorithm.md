---
title: 三维点云处理：EM 期望最大化算法——理论框架、收敛性证明与算法类比
description: 从 Jensen 不等式出发严格推导 EM 算法的下界构造过程，证明其单调收敛性，并与 K-Means、梯度下降、坐标下降等迭代优化算法进行对比分析。
---

# 三维点云处理：EM 期望最大化算法——理论框架、收敛性证明与算法类比

在前一章中，我们使用 EM 算法求解了 GMM 的参数。但 EM 算法的应用范围远不止于此——它是含隐变量概率模型中 MLE 估计的通用框架，在三维点云处理中广泛应用于鲁棒配准、缺失数据填充和混合模型估计。

本章将严格推导 EM 算法的数学基础，并类比其他优化算法，帮助读者建立对 EM 的深层直觉。

---

## 一、问题设定：含隐变量的 MLE

### 1.1 完整数据 vs 观测数据

在许多实际问题中，我们只能观测到**不完全数据（Incomplete Data）** $X$，而"完整数据" $(X, Z)$ 中包含不可观测的**隐变量（Latent Variable）** $Z$。

| 场景 | 观测数据 $X$ | 隐变量 $Z$ |
|------|-------------|-----------|
| **GMM 聚类** | 点的三维坐标 | 每个点属于哪个高斯分量 |
| **点云配准** | 两帧点云的坐标 | 点与点之间的对应关系 |
| **降噪** | 含噪声的观测点 | 无噪声的真实点位置 |
| **缺失数据** | 部分坐标已知的点 | 缺失的坐标分量 |

### 1.2 对数似然与隐变量积分

我们的目标是最大化观测数据的对数似然：

$$\ell(\theta) = \log p(X \mid \theta) = \log \int_Z p(X, Z \mid \theta) \, dZ$$

直接对 $\log \int$ 求导十分困难（大多数情况下没有闭式解）。EM 算法的核心洞察是：**我们可以通过构造似然下界来间接优化**。

---

## 二、EM 算法的严格推导

### 2.1 Jensen 不等式构造下界

引入一个关于 $Z$ 的任意分布 $q(Z)$（满足 $q(Z) \ge 0$ 且 $\int q(Z) dZ = 1$）：

$$\ell(\theta) = \log \int_Z p(X, Z \mid \theta) \, dZ = \log \int_Z q(Z) \frac{p(X, Z \mid \theta)}{q(Z)} \, dZ$$

由 Jensen 不等式（$\log$ 是凹函数，$\log(\mathbb{E}[Y]) \ge \mathbb{E}[\log(Y)]$）：

$$\ell(\theta) \ge \int_Z q(Z) \log \frac{p(X, Z \mid \theta)}{q(Z)} \, dZ \triangleq \mathcal{L}(q, \theta)$$

$\mathcal{L}(q, \theta)$ 称为**证据下界（Evidence Lower BOund, ELBO）**。

```
  EM 的几何直觉

  对数似然 ℓ(θ)
      ▲
      │     ┌────────── ℓ(θ) ──────────┐
      │    ╱                              ╲
      │   ╱    ┌── ELBO(θ; q_new) ──┐      ╲
      │  ╱    ╱                      ╲      ╲
      │ ╱    ╱  ┌─ ELBO(θ; q_old) ─┐  ╲      ╲
      │╱    ╱  ╱                    ╲  ╲      ╲
      │    ╱  ╱                      ╲  ╲
      │   ╱  ╱                        ╲  ╲
      │  θ_old                       θ_new
      └──────────────────────────────────────────► θ

  EM 交替执行:
  E 步: 更新 q → 使 ELBO 在 θ_old 处紧贴 ℓ(θ_old)
  M 步: 更新 θ → 最大化 ELBO，将 ℓ(θ) 推到更高处
```

### 2.2 E 步（Expectation）：使下界紧贴

间隙（Gap）为：

$$\ell(\theta) - \mathcal{L}(q, \theta) = \int q(Z) \log \frac{q(Z)}{p(Z \mid X, \theta)} \, dZ = KL(q \parallel p(Z|X,\theta)) \ge 0$$

要消除这个间隙，只需令 $q(Z) = p(Z \mid X, \theta^{(t)})$——即给定当前参数的后验分布。

E 步的本质：**计算隐变量的后验分布**，使下界在 $\theta = \theta^{(t)}$ 处等于真实对数似然。

### 2.3 M 步（Maximization）：提升下界

固定 $q(Z)$，关于 $\theta$ 最大化 ELBO：

$$\theta^{(t+1)} = \arg\max_\theta \mathbb{E}_{Z \sim q}[\log p(X, Z \mid \theta)]$$

由于 $q(Z)$ 的熵项不依赖于 $\theta$，M 步等价于最大化**完全数据对数似然的期望**：

$$\theta^{(t+1)} = \arg\max_\theta Q(\theta \mid \theta^{(t)})$$

其中 $Q(\theta \mid \theta^{(t)}) = \mathbb{E}_{Z \mid X, \theta^{(t)}}[\log p(X, Z \mid \theta)]$。

### 2.4 单调收敛性证明

**定理**：$\ell(\theta^{(t+1)}) \ge \ell(\theta^{(t)})$，即每次 EM 迭代不降低对数似然。

**证明**：

$$\ell(\theta^{(t+1)}) \ge \mathcal{L}(q^{(t)}, \theta^{(t+1)}) \quad \text{(Jensen)}$$
$$\ge \mathcal{L}(q^{(t)}, \theta^{(t)}) \quad \text{(M 步的最大化)}$$
$$= \ell(\theta^{(t)}) \quad \text{(E 步消除间隙)}$$

因此 $\ell(\theta^{(t)})$ 单调不减且有上界（若存在）→ 收敛。

---

## 三、EM 算法流程图

```
  ┌─────────────────────────────────────────────────────────┐
  │                   EM 算法通用框架                        │
  ├─────────────────────────────────────────────────────────┤
  │                                                          │
  │  输入: 观测数据 X, 模型 p(X,Z|θ), 初始参数 θ^(0)         │
  │                                                          │
  │  t ← 0                                                   │
  │  ┌──────────────────────────────────────┐                │
  │  │ while 未收敛:                         │                │
  │  │                                       │                │
  │  │  ┌─────────────────────────────────┐  │                │
  │  │  │ E 步 (Expectation):              │  │                │
  │  │  │ 计算后验分布 q(Z) = p(Z|X,θ^(t))  │  │                │
  │  │  │ 计算 Q(θ|θ^(t)) = E_q[log p(X,Z|θ)]│  │                │
  │  │  └─────────────────────────────────┘  │                │
  │  │                                       │                │
  │  │  ┌─────────────────────────────────┐  │                │
  │  │  │ M 步 (Maximization):             │  │                │
  │  │  │ θ^(t+1) = arg max_θ Q(θ|θ^(t))   │  │                │
  │  │  └─────────────────────────────────┘  │                │
  │  │                                       │                │
  │  │  t ← t + 1                            │                │
  │  │                                       │                │
  │  └──────────────────────────────────────┘                │
  │                                                          │
  │  输出: θ^*, 后验分布 q(Z)                                 │
  └─────────────────────────────────────────────────────────┘
```

---

## 四、EM vs 其他迭代优化算法

### 4.1 EM vs K-Means（硬 EM）

K-Means 可以看作是 EM 的一个极限特例——用 Dirac-delta 后验替代软概率分布：

| 方面 | K-Means（硬 EM） | GMM-EM（软 EM） |
|------|---------------------|-------------------|
| E 步 | $\gamma_{ik} \in \{0, 1\}$（硬分配） | $\gamma_{ik} \in [0, 1]$（概率分配） |
| M 步 | $\mu_k = \frac{\sum_{i \in C_k} x_i}{\|C_k\|}$ | $\mu_k = \frac{\sum_i \gamma_{ik} x_i}{\sum_i \gamma_{ik}}$ |
| 收敛 | 有限步内收敛 | 渐近收敛 |

### 4.2 EM vs 梯度下降

| 方面 | EM 算法 | 梯度下降 |
|------|---------|----------|
| **更新方式** | 解析解（或子优化问题） | 一阶导数方向的线搜索 |
| **步长** | 自动确定（M 步最大化） | 需手动设定或自适应学习率 |
| **收敛速度** | 线性收敛（接近最优值时较慢） | 可超线性（如 Newton 法） |
| **约束处理** | 自然满足概率约束 | 需投影或重参数化 |
| **适用性** | 仅限特定概率模型 | 通用（任何可微函数） |

### 4.3 EM vs 坐标下降（Coordinate Descent）

EM 算法本质上是一种**在变分分布 $q$ 和参数 $\theta$ 之间交替的坐标上升法**：

$$\max_{\theta} \ell(\theta) = \max_{\theta} \max_{q} \mathcal{L}(q, \theta)$$

| 坐标 | 更新 | 含义 |
|------|------|------|
| $q$ | $q^{(t+1)} = \arg\max_q \mathcal{L}(q, \theta^{(t)})$ | E 步 |
| $\theta$ | $\theta^{(t+1)} = \arg\max_\theta \mathcal{L}(q^{(t+1)}, \theta)$ | M 步 |

---

## 五、EM 在点云处理中的更多应用

### 5.1 鲁棒点云配准（EM-ICP）

传统 ICP 假设最近点即为对应点（硬对应）。EM-ICP 将对应关系视为隐变量 $Z$：

- **隐变量 $Z = \{m_{ij}\}$**：源点 $s_i$ 是否对应目标点 $t_j$（$m_{ij} \in \{0, 1\}$）
- **E 步**：计算每对点之间的匹配概率（基于距离和几何相容性）
- **M 步**：用匹配概率加权更新变换矩阵

```python
def em_icp_step(source, target, sigma2, max_iter=50):
    """
    单步 EM-ICP 的简化示意。

    :param source: 源点云 N_s x 3
    :param target: 目标点云 N_t x 3
    :param sigma2: 噪声方差
    :return: (R, t) 变换矩阵
    """
    N_s, N_t = source.shape[0], target.shape[0]
    R, t = np.eye(3), np.zeros(3)

    for it in range(max_iter):
        # E 步: 计算 N_s x N_t 的匹配概率矩阵
        transformed = (R @ source.T).T + t  # N_s x 3

        # 距离平方矩阵
        dist_sq = np.sum(transformed[:, None, :] ** 2, axis=2) + \
                  np.sum(target[None, :, :] ** 2, axis=2) - \
                  2 * transformed @ target.T

        # 软匹配概率（GMM 形式）
        soft_correspondences = np.exp(-dist_sq / (2 * sigma2))
        # 添加均匀分布分量处理 outliers
        soft_correspondences += 1e-6
        soft_correspondences /= soft_correspondences.sum(axis=1, keepdims=True)

        # M 步: 加权 Procrustes 求解
        # 计算加权质心
        weights = soft_correspondences.sum(axis=1)
        s_centered = source - np.average(source, axis=0, weights=weights)
        t_weighted = soft_correspondences @ target
        t_weighted /= weights[:, None]
        t_centered = t_weighted - np.average(t_weighted, axis=0, weights=weights)

        # 加权 SVD 求解旋转
        H = (s_centered * weights[:, None]).T @ (t_centered - t_weighted)
        U, _, Vt = np.linalg.svd(H)
        R = Vt.T @ U.T
        if np.linalg.det(R) < 0:
            Vt[-1, :] *= -1
            R = Vt.T @ U.T

        t = np.average(target @ soft_correspondences.T - R @ source.T, axis=1).T

    return R, t
```

### 5.2 点云缺失数据填充

当点云因遮挡而有缺失区域时，可以将缺失坐标视为隐变量，用 EM 迭代：

- **E 步**：基于完整区域的模型，预测缺失点的期望位置
- **M 步**：用完整数据（含预测值）重新估计全局分布参数

---

## 六、EM 的局限性与改进

| 局限性 | 描述 | 改进方案 |
|--------|------|----------|
| **局部最优** | EM 收敛到局部最优，对初始化敏感 | 多次随机初始化 / Deterministic Annealing EM |
| **收敛慢** | 接近最优值时为线性收敛 | 加速 EM (Aitken 加速)、SEM |
| **E 步难算** | $p(Z \mid X, \theta)$ 可能无闭式解 | Monte Carlo EM、变分 EM |
| **M 步难算** | $\arg\max_\theta$ 可能需要数值优化 | GEM（广义 EM）：只需提升而非最大化 |

---

## 总结

| 概念 | 核心要点 |
|------|----------|
| **EM 本质** | 坐标上升法，在 $q$（E 步）和 $\theta$（M 步）之间交替 |
| **E 步** | 计算隐变量后验 $p(Z \mid X, \theta^{(t)})$，使 ELBO 紧贴在 $\theta^{(t)}$ 处 |
| **M 步** | 最大化 $Q(\theta \mid \theta^{(t)})$，提升对数似然 |
| **收敛性** | 单调收敛（$\ell$ 不降），但不保证全局最优 |
| **K-Means 关系** | K-Means = GMM 的硬 EM（$\gamma_{ik} \in \{0,1\}$） |
| **梯度下降关系** | EM = 自动步长的自然梯度下降 |

> **直觉记忆法**：EM 就像"猜-验-调整"循环。E 步是"猜测缺失的拼图碎片在哪"，M 步是"基于完整拼图调整参数"。每轮循环都让你对数据的理解更准确。

下一章将学习**谱聚类**——一种基于图论和矩阵特征分解的强大聚类方法，能够处理 K-Means 和 GMM 都无法解决的非凸数据分布。
