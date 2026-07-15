---
title: 三维点云处理（四）：Kernel PCA 核主成分分析——从线性到非线性降维
description: 深入推导核主成分分析（Kernel PCA）的数学原理，包括核技巧（Kernel Trick）、正定核函数与 Hilbert 空间映射，以及 Kernel PCA 在非线性点云分布中的应用。
---

# 三维点云处理（四）：Kernel PCA 核主成分分析——从线性到非线性降维

在上一章中，我们推导了标准 PCA 的数学原理。然而，现实世界中的点云数据往往呈现出**非线性分布**——例如螺旋状点云、环形轨迹或任意弯曲的曲面。对于这类数据，线性 PCA 的降维效果非常有限。

Kernel PCA（核主成分分析）通过**核技巧（Kernel Trick）**将数据隐式地映射到高维特征空间，使得在原空间中非线性可分的数据在映射后的高维空间中变为线性可分，再执行标准 PCA。

---

## 一、从线性到非线性：PCA 的局限性

### 1.1 线性 PCA 的失效场景

```
  原始空间 (2D)                  线性 PCA 投影                  期望的降维
                                                               (沿流形展开)

    ╭───╮                                                     ────────
   ╱ ╭─╮ ╲              ×××××××××××××××××
  │  │   │  │            ×××××××××××××××××
   ╲ ╰─╯ ╱              ×××××××××××××××××
    ╰───╯

  环形数据分布           PCA 无法区分的投影          按角度展开才能保留结构
```

线性 PCA 只能找到数据方差最大的**直线方向**。当数据沿曲线或圆环分布时，任何直线的投影都会丢失其内在的拓扑结构。

### 1.2 核方法的核心思想

核方法的基本思路是：**通过非线性映射 $\phi: \mathbb{R}^d \to \mathcal{H}$ 将数据从原始空间映射到高维（甚至无限维）特征空间 $\mathcal{H}$，然后在 $\mathcal{H}$ 中执行线性 PCA**。

```
  原始空间 R^d                  特征空间 H (高维)               H 中的 PCA

     ╭───╮                    ┌──────────┐
    ╱     ╲      φ(·)         │    ·     │              ──────► 第一主成分
   │   ·   │  =============►  │   / \    │              ──► 第二主成分
    ╲     ╱                  │  /   \   │
     ╰───╯                   └──────────┘

  非线性可分                   映射后线性可分                   在 H 中降维
```

---

## 二、数学推导：从协方差到核矩阵

### 2.1 特征空间中的 PCA 优化问题

设映射函数为 $\phi: \mathbb{R}^d \to \mathcal{H}$，且有 $N$ 个数据点 $\{x_1, \ldots, x_N\}$。假设映射后的数据已中心化：

$$\sum_{i=1}^N \phi(x_i) = 0$$

特征空间中的协方差矩阵为：

$$\Sigma_\phi = \frac{1}{N} \sum_{i=1}^N \phi(x_i) \phi(x_i)^T$$

PCA 的目标是求解 $\Sigma_\phi$ 的特征向量 $v$：

$$\Sigma_\phi v = \lambda v$$

### 2.2 特征向量存在于数据张成的空间中

由于 $\Sigma_\phi$ 是 $N$ 个 $\phi(x_i)$ 的外积之和，其特征向量 $v$ 必然位于 $\{\phi(x_1), \ldots, \phi(x_N)\}$ 所张成的子空间中。因此存在一组系数 $\alpha = [\alpha_1, \ldots, \alpha_N]^T$ 使得：

$$v = \sum_{i=1}^N \alpha_i \phi(x_i)$$

### 2.3 核矩阵的引入

将 $v$ 的展开式代入特征方程 $\Sigma_\phi v = \lambda v$：

$$\frac{1}{N} \sum_{i=1}^N \phi(x_i) \phi(x_i)^T \left( \sum_{j=1}^N \alpha_j \phi(x_j) \right) = \lambda \sum_{i=1}^N \alpha_i \phi(x_i)$$

对两边左乘 $\phi(x_k)^T$（对任意 $k$），并引入**核函数** $k(x_i, x_j) = \phi(x_i)^T \phi(x_j)$：

$$\frac{1}{N} \sum_{i=1}^N \sum_{j=1}^N k(x_k, x_i) k(x_i, x_j) \alpha_j = \lambda \sum_{i=1}^N k(x_k, x_i) \alpha_i$$

用矩阵形式表示为：

$$K^2 \alpha = N \lambda K \alpha$$

其中核矩阵 $K \in \mathbb{R}^{N \times N}$ 定义为：

$$K_{ij} = k(x_i, x_j) = \phi(x_i)^T \phi(x_j)$$

### 2.4 简化与求解

消去 $K$（假设 $K$ 可逆），得到简化形式：

$$K \alpha = N \lambda \alpha$$

这意味着 $\alpha$ 是核矩阵 $K$ 的特征向量，$N\lambda$ 是对应的特征值。

> **关键洞察**：我们从未显式计算 $\phi(x)$。所有计算都通过核函数 $k(\cdot, \cdot)$ 完成——这正是核技巧的精髓。

---

## 三、常用核函数

核函数 $k(x, y)$ 隐含地定义了一个特征映射 $\phi$。选择不同的核函数相当于选择不同的特征空间。

| 核函数 | 数学形式 $k(x, y)$ | 参数 | 适用场景 |
|--------|---------------------|------|----------|
| **线性核** | $x^T y$ | 无 | 退化为标准 PCA |
| **多项式核** | $(x^T y + c)^d$ | $c \geq 0$, $d \in \mathbb{N}^+$ | 已知多项式关系 |
| **高斯核 (RBF)** | $\exp\left(-\frac{\|x-y\|^2}{2\sigma^2}\right)$ | $\sigma > 0$（带宽） | 通用场景，最常用 |
| **Sigmoid 核** | $\tanh(\gamma x^T y + c)$ | $\gamma > 0$, $c < 0$ | 神经网络视角 |

### 3.1 高斯核（RBF Kernel）的几何直觉

```
  高斯核相似度随距离衰减

  k(x, y) = exp(-||x-y||² / 2σ²)

  1.0 ┤***
      │    *
  0.8 ┤     *
      │      *
  0.6 ┤       *
      │        *
  0.4 ┤         *
      │           *
  0.2 ┤             *
      │                *  *  *  *
  0.0 ┼────┬────┬────┬────┬────┬────► ||x-y||
      0    σ   2σ   3σ   4σ   5σ

  σ 越小 → 衰减越快 → 局部性越强 → 越容易过拟合
  σ 越大 → 衰减越慢 → 全局性越强 → 越平滑
```

---

## 四、中心化处理

### 4.1 特征空间中的中心化

前面的推导假设 $\sum_i \phi(x_i) = 0$，但这在现实中并不成立。特征空间的中心化公式为：

$$\tilde{\phi}(x_i) = \phi(x_i) - \frac{1}{N} \sum_{j=1}^N \phi(x_j)$$

### 4.2 中心化后的核矩阵

中心化后的核矩阵 $\tilde{K}$ 可以通过原始核矩阵 $K$ 直接计算：

$$\tilde{K} = K - 1_N K - K 1_N + 1_N K 1_N$$

其中 $1_N$ 是 $N \times N$ 的矩阵，每个元素均为 $1/N$。

用代码表示即为：

```python
N = K.shape[0]
one_n = np.ones((N, N)) / N
K_centered = K - one_n @ K - K @ one_n + one_n @ K @ one_n
```

---

## 五、新数据点的投影

### 5.1 投影公式

对于一个新数据点 $x_{\text{new}}$，其到第 $k$ 个主成分 $v_k$ 的投影为：

$$\text{proj}_k(x_{\text{new}}) = v_k^T \phi(x_{\text{new}}) = \sum_{i=1}^N \alpha_{k,i} \, k(x_i, x_{\text{new}})$$

其中 $\alpha_k$ 是核矩阵 $\tilde{K}$ 的第 $k$ 个特征向量（需要归一化为 $\|\alpha_k\|^2 = 1 / \lambda_k$）。

### 5.2 重构（Pre-image Problem）

与标准 PCA 不同，Kernel PCA 的**逆映射（Pre-image）问题**通常没有闭式解——在特征空间中找到一个点后，很难找到原始空间中对应的点。这需要使用数值优化方法（如梯度下降）来近似求解：

$$\hat{x} = \arg\min_{x \in \mathbb{R}^d} \|\phi(x) - P\phi(x)\|^2$$

---

## 六、Python 实现

```python
import numpy as np
from scipy.linalg import eigh

def rbf_kernel(X, Y=None, sigma=1.0):
    """
    计算高斯核 (RBF Kernel) 矩阵。
    k(x, y) = exp(-||x - y||² / (2σ²))

    :param X: N x d 的输入矩阵
    :param Y: M x d 的输入矩阵 (None 表示 Y = X)
    :param sigma: 高斯核带宽参数
    :return: N x M 的核矩阵
    """
    if Y is None:
        Y = X

    # 计算成对距离平方: ||x - y||² = ||x||² + ||y||² - 2 x·y
    X_norm_sq = np.sum(X ** 2, axis=1).reshape(-1, 1)
    Y_norm_sq = np.sum(Y ** 2, axis=1).reshape(1, -1)
    sq_dists = X_norm_sq + Y_norm_sq - 2 * np.dot(X, Y.T)

    return np.exp(-sq_dists / (2 * sigma ** 2))


def kernel_pca(X, n_components=2, kernel='rbf', sigma=1.0, degree=3, coef0=1):
    """
    执行 Kernel PCA 降维。

    :param X: N x d 的输入数据矩阵，每行为一个数据点
    :param n_components: 保留的主成分数量
    :param kernel: 核函数类型 ('rbf', 'poly', 'linear')
    :param sigma: RBF 核的带宽参数
    :param degree: 多项式核的阶数
    :param coef0: 多项式核的常数项
    :return: (alphas, lambdas, projected)
             alphas   — 特征向量矩阵 (N x n_components)
             lambdas  — 特征值向量 (n_components,)
             projected — 投影后的数据 (N x n_components)
    """
    N = X.shape[0]

    # 1. 计算核矩阵
    if kernel == 'rbf':
        K = rbf_kernel(X, sigma=sigma)
    elif kernel == 'poly':
        K = (np.dot(X, X.T) + coef0) ** degree
    elif kernel == 'linear':
        K = np.dot(X, X.T)
    else:
        raise ValueError(f"Unsupported kernel: {kernel}")

    # 2. 中心化核矩阵
    one_n = np.ones((N, N)) / N
    K_centered = K - one_n @ K - K @ one_n + one_n @ K @ one_n

    # 3. 特征值分解（取最大的 n_components 个特征对）
    eigenvalues, eigenvectors = eigh(K_centered)
    # eigh 返回升序，我们取最后 n_components 个（即最大的）
    idx = np.argsort(eigenvalues)[::-1][:n_components]
    lambdas = eigenvalues[idx]
    alphas = eigenvectors[:, idx]

    # 4. 归一化特征向量: ||α_k||² = 1 / λ_k
    for k in range(n_components):
        alphas[:, k] /= np.sqrt(lambdas[k])

    # 5. 计算投影坐标
    projected = K_centered @ alphas

    return alphas, lambdas, projected


# ────── 使用示例 ──────
if __name__ == "__main__":
    import matplotlib.pyplot as plt

    # 生成同心圆数据（线性不可分）
    np.random.seed(42)
    n_samples = 200

    # 外圈
    theta_outer = np.random.uniform(0, 2 * np.pi, n_samples)
    r_outer = 2.0 + 0.1 * np.random.randn(n_samples)
    outer = np.column_stack([r_outer * np.cos(theta_outer),
                             r_outer * np.sin(theta_outer)])

    # 内圈
    theta_inner = np.random.uniform(0, 2 * np.pi, n_samples)
    r_inner = 1.0 + 0.1 * np.random.randn(n_samples)
    inner = np.column_stack([r_inner * np.cos(theta_inner),
                             r_inner * np.sin(theta_inner)])

    X = np.vstack([outer, inner])  # 400 x 2

    # Kernel PCA 降维
    alphas, lambdas, projected = kernel_pca(X, n_components=2, kernel='rbf', sigma=0.5)

    # 可视化对比
    fig, axes = plt.subplots(1, 2, figsize=(12, 5))

    axes[0].scatter(X[:n_samples, 0], X[:n_samples, 1], c='blue', s=15, alpha=0.6, label='Outer')
    axes[0].scatter(X[n_samples:, 0], X[n_samples:, 1], c='red', s=15, alpha=0.6, label='Inner')
    axes[0].set_title("Original Space (concentric circles)")
    axes[0].set_xlabel("x"); axes[0].set_ylabel("y")
    axes[0].legend(); axes[0].axis('equal')

    axes[1].scatter(projected[:n_samples, 0], projected[:n_samples, 1],
                    c='blue', s=15, alpha=0.6, label='Outer')
    axes[1].scatter(projected[n_samples:, 0], projected[n_samples:, 1],
                    c='red', s=15, alpha=0.6, label='Inner')
    axes[1].set_title(f"Kernel PCA (RBF, σ=0.5)\n"
                      f"λ₁={lambdas[0]:.1f}, λ₂={lambdas[1]:.1f}")
    axes[1].set_xlabel("PC1"); axes[1].set_ylabel("PC2")
    axes[1].legend()

    plt.tight_layout()
    plt.show()
```

---

## 七、Kernel PCA 在点云处理中的应用

### 7.1 非线性点云去噪

对于分布在弯曲曲面上的点云，Kernel PCA 可以学习到"沿曲面展开"的低维流形表示。将高维坐标投影到该流形上再重构，可以在保留曲面结构的同时去除噪声。

```
  弯曲曲面上的噪声点云          Kernel PCA 去噪后

    *   *  *                     ●──●──●──●
  *    ●──●──●──*      ──►     ╱          ╲
   *  ╱          ╲  *         ●            ●
     ●            ●           ╲           ╱
      ╲   噪声    ╱             ●──●──●──●
       ●──●──●──●
```

### 7.2 非线性特征提取

对于人物步态、手势轨迹等具有非线性运动模式的三维骨架点云，Kernel PCA 能比线性 PCA 更紧凑地表达运动的内在自由度。

### 7.3 与深度自编码器的比较

| 方法 | 优点 | 缺点 |
|------|------|------|
| **Kernel PCA** | 有闭式解、数学可证、不需训练 | 核矩阵 $O(N^2)$ 内存、σ 需人工选择 |
| **深度自编码器** | 可处理极大样本、自动学习特征 | 需 GPU 训练、超参数多、解释性差 |

---

## 八、总结

| 概念 | 标准 PCA | Kernel PCA |
|------|----------|------------|
| 核心思想 | 寻找方差最大的线性方向 | 在高维特征空间中寻找线性方向 |
| 输入 | $X \in \mathbb{R}^{N \times d}$ | 核矩阵 $K \in \mathbb{R}^{N \times N}$ |
| 计算复杂度 | $O(d^2 N + d^3)$ | $O(N^2 d + N^3)$ |
| 适用数据 | 线性分布 | 非线性流形分布 |
| 核函数 | 不需要 | RBF / 多项式 / 自定义正定核 |
| 新点投影 | $V^T (x_{\text{new}} - \bar{x})$ | $\sum_i \alpha_{k,i} \, k(x_i, x_{\text{new}})$ |

> **实践建议**：对于三维点云处理，如果数据规模较小（$N < 10^4$）且呈现非线性分布特征（如弯曲管道、螺旋结构），Kernel PCA 是一个数学优美且实用的工具。对于大规模点云，可以考虑使用随机 Fourier 特征近似（Random Kitchen Sinks）来加速核计算。

下一章我们将转向 PCA 在点云处理中的另一个重要应用：**基于 PCA 的点云噪声滤波**。
