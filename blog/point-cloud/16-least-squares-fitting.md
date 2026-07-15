---
title: 三维点云处理：最小二乘法——从线性回归到平面/球面拟合
description: 严格推导最小二乘法的正规方程、几何解释（投影矩阵与残差正交性），并给出三维点云中平面、球面和多项式曲面拟合的完整 Python 实现。
---

# 三维点云处理：最小二乘法——从线性回归到平面/球面拟合

**最小二乘法（Least Squares）** 是最基础也最重要的参数估计方法之一。在三维点云处理中，它被广泛用于平面拟合、地面估计、球面检测和多项式曲面重建。

本章从线性最小二乘的一般形式出发，逐步推导到三维点云中各种几何基元的拟合。

---

## 一、线性最小二乘的通用形式

### 1.1 问题定义

给定 $N$ 个观测数据点，我们希望用一组基函数的线性组合来拟合响应变量：

$$y_i \approx \sum_{j=1}^m \beta_j \cdot \phi_j(x_i)$$

其中 $\phi_j$ 是基函数（可以是 $x$ 的任何函数），$\beta_j$ 是待估计的参数。

写成矩阵形式：

$$y = A \beta + \epsilon$$

其中 $A \in \mathbb{R}^{N \times m}$ 是设计矩阵（第 $i$ 行第 $j$ 列为 $\phi_j(x_i)$），$y \in \mathbb{R}^N$ 是观测向量，$\beta \in \mathbb{R}^m$ 是参数向量，$\epsilon$ 是误差。

### 1.2 最小化目标与正规方程

目标是找到使残差平方和最小的 $\beta$：

$$\min_\beta \|y - A\beta\|_2^2 = (y - A\beta)^T (y - A\beta)$$

对 $\beta$ 求导并令其为零：

$$\frac{\partial}{\partial \beta} (y^T y - 2\beta^T A^T y + \beta^T A^T A \beta) = -2A^T y + 2A^T A \beta = 0$$

得到**正规方程（Normal Equation）**：

$$A^T A \beta = A^T y$$

若 $A^T A$ 可逆，则参数有闭式解：

$$\hat{\beta} = (A^T A)^{-1} A^T y$$

### 1.3 几何解释：投影矩阵

$\hat{y} = A\hat{\beta} = A(A^T A)^{-1} A^T y$ 是 $y$ 在 $A$ 的列空间上的**正交投影**。

```
  最小二乘的几何直觉

      y
      │╲
      │ ╲  残差 r = y - Aβ̂
      │  ╲
      │   ╲
  ────┼────╲──────────► A 的列空间 (Col Space)
      │     ╲         span{a₁, a₂, ..., a_m}
      │      ╲
      │  A⚬β̂  ╲
      │        ╲

  关键性质: 残差 r ⟂ Col(A)，即 A^T r = 0
  (这正是正规方程的几何含义)
```

```python
def least_squares_solve(A, y):
    """
    求解正规方程: min ||y - Aβ||²

    :param A: N x m 设计矩阵
    :param y: N x 1 观测向量
    :return: β (m,), residuals
    """
    # 方法 1: 正规方程 (小规模、良态时使用)
    # beta = np.linalg.inv(A.T @ A) @ A.T @ y

    # 方法 2: QR 分解 (数值更稳定)
    Q, R = np.linalg.qr(A)
    beta = np.linalg.solve(R, Q.T @ y)

    # 方法 3: 直接使用 lstsq (最稳定，包含秩处理)
    # beta, residuals, rank, singular_vals = np.linalg.lstsq(A, y, rcond=None)

    residuals = y - A @ beta
    return beta, residuals
```

---

## 二、三维空间中的平面拟合

### 2.1 平面方程与最小二乘形式

空间平面的一般方程为：

$$ax + by + cz + d = 0$$

等价于：

$$z = -\frac{a}{c}x - \frac{b}{c}y - \frac{d}{c} = \alpha x + \beta y + \gamma \quad (c \neq 0)$$

构造设计矩阵和观测向量：

$$A = \begin{bmatrix} x_1 & y_1 & 1 \\ x_2 & y_2 & 1 \\ \vdots & \vdots & \vdots \\ x_N & y_N & 1 \end{bmatrix}, \quad y = \begin{bmatrix} z_1 \\ z_2 \\ \vdots \\ z_N \end{bmatrix}, \quad \beta = \begin{bmatrix} \alpha \\ \beta \\ \gamma \end{bmatrix}$$

### 2.2 全最小二乘（Total Least Squares）平面拟合

上述方法假设 $x, y$ 无误差，只有 $z$ 有误差。但对于点云数据，三个坐标的测量误差是同等级的。更合理的方法是使用 **PCA（回想第三章）** 直接拟合平面：

```python
def fit_plane_ls(points):
    """
    最小二乘平面拟合 (z = αx + βy + γ)

    :param points: N x 3 点云
    :return: (normal, centroid, params)
             normal — 法向量 (A, B, C)，满足 Ax+By+Cz+D=0
             centroid — 点云质心
    """
    # 方法 1: z = f(x, y) 的线性回归（仅适合近水平的平面）
    A = np.column_stack([points[:, 0], points[:, 1], np.ones(len(points))])
    y = points[:, 2]
    alpha, beta, gamma, *_ = np.linalg.lstsq(A, y, rcond=None)[0]

    # 法向量: (α, β, -1) → 归一化
    normal = np.array([alpha, beta, -1.0])
    normal = normal / np.linalg.norm(normal)

    return normal


def fit_plane_total_ls(points):
    """
    全最小二乘平面拟合 (PCA 方法，无坐标假设)

    :param points: N x 3 点云
    :return: (normal, centroid, d)
             normal — 单位法向量
             centroid — 点云质心
             d — 平面方程 Ax+By+Cz+d=0 中的 d
    """
    centroid = np.mean(points, axis=0)
    centered = points - centroid

    # 计算协方差矩阵
    cov = np.cov(centered, rowvar=False)  # 或 (centered.T @ centered) / N

    # 特征分解
    eigenvalues, eigenvectors = np.linalg.eigh(cov)

    # 法向量 = 最小特征值对应的特征向量
    normal = eigenvectors[:, 0]
    normal = normal / np.linalg.norm(normal)

    # d = -normal · centroid
    d = -np.dot(normal, centroid)

    # 计算拟合质量
    residuals = np.abs(centered @ normal)
    rmse = np.sqrt(np.mean(residuals ** 2))

    return normal, centroid, d, rmse


# ────── 使用示例 ──────
def fit_plane_demo():
    import open3d as o3d

    # 生成带噪声的平面点
    np.random.seed(42)
    xx, yy = np.meshgrid(np.linspace(-2, 2, 20), np.linspace(-2, 2, 20))
    # 真实平面: z = 0.5x + 0.3y + 1.0
    zz = 0.5 * xx + 0.3 * yy + 1.0 + 0.05 * np.random.randn(20, 20)
    points = np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])

    normal, centroid, d, rmse = fit_plane_total_ls(points)

    print(f"拟合平面: {normal[0]:.4f}x + {normal[1]:.4f}y + "
          f"{normal[2]:.4f}z + {d:.4f} = 0")
    print(f"RMSE: {rmse:.4f}")
```

---

## 三、球面拟合

### 3.1 球面方程

空间中球的方程为（中心 $c = (c_x, c_y, c_z)$，半径 $r$）：

$$(x - c_x)^2 + (y - c_y)^2 + (z - c_z)^2 = r^2$$

展开：

$$x^2 + y^2 + z^2 - 2c_x x - 2c_y y - 2c_z z + (c_x^2 + c_y^2 + c_z^2 - r^2) = 0$$

令 $\alpha = -2c_x$，$\beta = -2c_y$，$\gamma = -2c_z$，$\delta = c_x^2 + c_y^2 + c_z^2 - r^2$，则可转化为线性最小二乘：

$$\underbrace{\begin{bmatrix} x_1 & y_1 & z_1 & 1 \\ \vdots & \vdots & \vdots & \vdots \\ x_N & y_N & z_N & 1 \end{bmatrix}}_{A} \underbrace{\begin{bmatrix} \alpha \\ \beta \\ \gamma \\ \delta \end{bmatrix}}_{\beta} = -\underbrace{\begin{bmatrix} x_1^2 + y_1^2 + z_1^2 \\ \vdots \\ x_N^2 + y_N^2 + z_N^2 \end{bmatrix}}_{b}$$

求解后还原：

$$c = \left(-\frac{\alpha}{2}, -\frac{\beta}{2}, -\frac{\gamma}{2}\right), \quad r = \sqrt{c_x^2 + c_y^2 + c_z^2 - \delta}$$

```python
def fit_sphere_ls(points):
    """
    最小二乘球面拟合。

    :param points: N x 3 点云
    :return: (center (3,), radius, rmse)
    """
    N = points.shape[0]
    x, y, z = points[:, 0], points[:, 1], points[:, 2]

    # 构造设计矩阵
    A = np.column_stack([x, y, z, np.ones(N)])
    b = -(x**2 + y**2 + z**2)

    # 求解
    beta, residuals, rank, sv = np.linalg.lstsq(A, b, rcond=None)

    alpha, beta_, gamma, delta = beta

    # 还原球心与半径
    center = np.array([-alpha / 2, -beta_ / 2, -gamma / 2])
    radius = np.sqrt(center[0]**2 + center[1]**2 + center[2]**2 - delta)

    # 残差分析
    predicted_r2 = np.sum((points - center)**2, axis=1)
    residual = np.abs(np.sqrt(predicted_r2) - radius)
    rmse = np.sqrt(np.mean(residual**2))

    return center, radius, rmse


def fit_sphere_ransac_ls(points, max_iters=1000, inlier_threshold=0.02):
    """
    RANSAC + 最小二乘的球面拟合（鲁棒版本，结合第 18 章的概念）。

    先用 RANSAC 筛选内点，再用最小二乘精拟合。
    """
    N = points.shape[0]
    best_inliers = []
    best_center, best_radius = None, None

    for _ in range(max_iters):
        # 随机采样 4 个点（球面有 4 个自由度）
        sample_idx = np.random.choice(N, 4, replace=False)
        sample = points[sample_idx]

        try:
            center, radius, _ = fit_sphere_ls(sample)
        except np.linalg.LinAlgError:
            continue

        # 验证内点
        dists = np.abs(np.linalg.norm(points - center, axis=1) - radius)
        inliers = np.where(dists < inlier_threshold)[0]

        if len(inliers) > len(best_inliers):
            best_inliers = inliers
            best_center, best_radius = center, radius

    # 用所有内点进行最终的 LS 精拟合
    if len(best_inliers) >= 4:
        center, radius, rmse = fit_sphere_ls(points[best_inliers])
        return center, radius, rmse, best_inliers

    return best_center, best_radius, None, best_inliers
```

---

## 四、多项式曲面拟合

对于非平面的弯曲表面（如地形），可以用多项式基函数：

$$z = f(x, y) = \sum_{i=0}^{p} \sum_{j=0}^{p-i} \beta_{ij} \cdot x^i y^j$$

```python
def fit_polynomial_surface(points, degree=2):
    """
    多项式曲面拟合: z = f(x, y)

    :param points: N x 3 点云
    :param degree: 多项式阶数
    :return: (coefficients, rmse)
    """
    x, y, z = points[:, 0], points[:, 1], points[:, 2]
    N = len(points)

    # 构造多项式特征
    # degree=2: [1, x, y, x², xy, y²] → 6 项
    features = []
    for i in range(degree + 1):
        for j in range(degree + 1 - i):
            features.append((x ** i) * (y ** j))

    A = np.column_stack(features)
    coeffs, _, _, _ = np.linalg.lstsq(A, z, rcond=None)

    z_pred = A @ coeffs
    rmse = np.sqrt(np.mean((z - z_pred) ** 2))

    return coeffs, rmse


def evaluate_polynomial(x, y, coeffs, degree=2):
    """计算多项式曲面在 (x, y) 处的 z 值"""
    result = 0.0
    idx = 0
    for i in range(degree + 1):
        for j in range(degree + 1 - i):
            result += coeffs[idx] * (x ** i) * (y ** j)
            idx += 1
    return result
```

---

## 五、加权最小二乘（Weighted Least Squares）

当数据点的测量精度不同时，可为每个点赋予不同的权重：

$$\min_\beta \sum_{i=1}^N w_i (y_i - a_i^T \beta)^2 = (y - A\beta)^T W (y - A\beta)$$

其中 $W = \text{diag}(w_1, \ldots, w_N)$。

加权正规方程：

$$\hat{\beta} = (A^T W A)^{-1} A^T W y$$

```python
def weighted_least_squares(A, y, weights):
    """
    加权最小二乘。

    :param A: N x m 设计矩阵
    :param y: N x 1 观测向量
    :param weights: N x 1 权重向量
    :return: beta
    """
    W = np.diag(weights)
    beta = np.linalg.solve(A.T @ W @ A, A.T @ W @ y)
    return beta
```

---

## 六、总结

| 拟合目标 | 设计矩阵 $A$ | 参数 $\beta$ | 还原公式 |
|----------|-------------|-------------|----------|
| **直线** (2D) | $[x_i, 1]$ | $[k, b]$ | $y = kx + b$ |
| **平面** | $[x_i, y_i, 1]$ | $[\alpha, \beta, \gamma]$ | $z = \alpha x + \beta y + \gamma$ |
| **平面 (TLS)** | PCA (无设计矩阵) | 特征向量 | $n \cdot p + d = 0$ |
| **球面** | $[x_i, y_i, z_i, 1]$ | $[\alpha, \beta, \gamma, \delta]$ | $c = -[\alpha,\beta,\gamma]/2$, $r = \sqrt{\|c\|^2 - \delta}$ |
| **多项式曲面** | $[1, x, y, x^2, xy, y^2, \ldots]$ | $\beta$ | $z = \sum \beta_{ij} x^i y^j$ |

> **关键洞见**：最小二乘的核心是将一个非线性几何拟合问题转化为线性代数问题——解一个 $m \times m$ 的正规方程。只要基函数的选取合适，几乎所有几何基元的拟合都可以归于这个框架。

然而，最小二乘对离群点极其敏感（一个远处的飞点就可能完全拉偏拟合结果）。下一章将学习**霍夫变换**——一种基于投票机制的鲁棒拟合方法，能够天然抵抗离群点的干扰。
