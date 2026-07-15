---
title: 三维点云处理：谱聚类——图 Laplacian 特征分解与非凸数据聚类
description: 从相似度图构建出发，深入推导谱聚类的数学原理（未归一化/归一化 Laplacian、Cheeger 不等式），对比 RatioCut 与 Ncut，给出完整 Python 实现及三维点云非凸分割应用。
---

# 三维点云处理：谱聚类——图 Laplacian 特征分解与非凸数据聚类

K-Means 和 GMM 都依赖于数据分布在欧氏空间中是"凸的"（簇是球形或椭球形）。然而，真实场景中的点云聚类问题常常呈现非凸结构——例如同一物体因遮挡而在空间中断裂为两块，或者需要基于法向量连续性而非空间距离来聚类。

**谱聚类（Spectral Clustering）** 将聚类问题转化为图的划分问题，通过分析数据相似度图的 Laplacian 矩阵的特征向量，能够完美处理非凸、环状和连接性驱动的聚类。

---

## 一、从欧氏空间聚类到图划分

### 1.1 图论视角

将 $N$ 个数据点看作一个加权无向图 $G = (V, E)$ 的顶点：

- **顶点 $V = \{1, 2, \ldots, N\}$**：每个数据点
- **边 $E$**：点 $i$ 和 $j$ 之间的连接
- **权重 $w_{ij}$**：$i$ 和 $j$ 之间的相似度

```
  数据点 → 相似度图

  原始数据                    相似度图 (只连高相似度的边)
                                     ① —— ②
    ○ ○ ○                          /  \
     ○   ●              ──►       ③    ④
  ●        ●                      |    |
   ●   ●                         ⑤ —— ⑥
    ● ●                              ╲  ╱
                                      ⑦

  聚类的目标: 将图切成多个"子图"，使得子图内部的边权重大，子图之间的边权重小。
```

### 1.2 邻接矩阵与度矩阵

**邻接矩阵**（相似度矩阵）$W \in \mathbb{R}^{N \times N}$：
$$W_{ij} = w_{ij} = \text{sim}(p_i, p_j)$$

**度矩阵** $D \in \mathbb{R}^{N \times N}$ 为对角矩阵：
$$D_{ii} = \sum_{j=1}^N W_{ij}$$

在点云处理中，相似度通常由距离定义：

$$w_{ij} = \begin{cases} \exp\left(-\frac{\|p_i - p_j\|^2}{2\sigma^2}\right) & \text{if } j \in \mathcal{N}_K(i) \text{ or } \|p_i - p_j\| < \epsilon \\ 0 & \text{otherwise} \end{cases}$$

> 使用 KNN 图或 $\epsilon$-邻域图不仅减少了边的数量（稀疏矩阵），还避免了远距离点之间的虚假连接。

---

## 二、图 Laplacian 与图割

### 2.1 三种 Laplacian

| 类型 | 定义 | 性质 |
|------|------|------|
| **未归一化 Laplacian** | $L = D - W$ | 半正定、0 是特征值（对应全 1 向量） |
| **对称归一化 Laplacian** | $L_{\text{sym}} = I - D^{-1/2} W D^{-1/2}$ | 半正定、特征值 $\in [0, 2]$ |
| **随机游走归一化 Laplacian** | $L_{\text{rw}} = I - D^{-1} W$ | 与随机游走转移概率相关 |

### 2.2 图割代价函数

将图划分为两个子集 $A$ 和 $\bar{A}$：

**RatioCut**（倾向于平衡划分）：
$$\text{RatioCut}(A, \bar{A}) = \frac{\text{cut}(A, \bar{A})}{|A|} + \frac{\text{cut}(A, \bar{A})}{|\bar{A}|}$$

**Normalized Cut (Ncut)**（更关注连接密度而非单纯大小）：
$$\text{Ncut}(A, \bar{A}) = \frac{\text{cut}(A, \bar{A})}{\text{vol}(A)} + \frac{\text{cut}(A, \bar{A})}{\text{vol}(\bar{A})}$$

其中 $\text{cut}(A, \bar{A}) = \sum_{i \in A, j \in \bar{A}} W_{ij}$，$\text{vol}(A) = \sum_{i \in A} D_{ii}$。

### 2.3 Laplacian 特征向量的物理直觉

```
  Laplacian 特征向量的几何意义

  特征向量 f₂ (Fiedler 向量) 的值沿图的主要"切开"方向变化:

    f₂ 值:
    ┌─────────────────────┐
    │ -0.3  -0.2   0.1  0.3│   ← f₂ 的正负值天然分割了两个簇
    │ -0.3  -0.1   0.1  0.3│
    │ -0.2   0.0   0.2  0.3│
    │          ────cut────  │
    │ -0.4  -0.3  -0.1  0.0│
    └─────────────────────┘

  通过 f₂ 的符号即可找到一个"近最优"的图割。
```

---

## 三、谱聚类算法流程

### 3.1 完整算法

```
  ┌───────────────────────────────────────────────────┐
  │            谱聚类算法 (Spectral Clustering)         │
  ├───────────────────────────────────────────────────┤
  │                                                    │
  │  输入: N 个数据点, 簇数 K                           │
  │                                                    │
  │  1. 构建相似度图 (KNN 或 ε-邻域)                     │
  │     ┌──── W_ij = exp(-||p_i-p_j||²/(2σ²))          │
  │     └──── 仅 K 近邻或距离 < ε 的边非零               │
  │                                                    │
  │  2. 计算度矩阵 D 和 Laplacian L = D - W              │
  │                                                    │
  │  3. 计算 L 的前 K 个最小的特征值对应的特征向量         │
  │     f₁, f₂, ..., f_K  (每个是 N × 1)               │
  │                                                    │
  │  4. 用 K 个特征向量构造 N × K 矩阵:                   │
  │     U = [f₁, f₂, ..., f_K]                         │
  │                                                    │
  │  5. 对 U 的每一行做 L₂ 归一化:                        │
  │     u_i ← u_i / ||u_i||₂                            │
  │                                                    │
  │  6. 在归一化后的 U 矩阵上执行 K-Means                  │
  │                                                    │
  │  输出: 每个点的聚类标签                               │
  └───────────────────────────────────────────────────┘
```

### 3.2 Python 实现

```python
import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import eigsh
from scipy.spatial import KDTree


def spectral_clustering(points, k, sigma=1.0, knn=10, normalized=True):
    """
    谱聚类在三维点云上的实现。

    :param points: N x 3 点云坐标
    :param k: 聚类数量
    :param sigma: 高斯核带宽
    :param knn: KNN 图的 K 值
    :param normalized: 是否使用归一化 Laplacian (Ncut)
    :return: labels (N,)
    """
    N = points.shape[0]

    # ── 1. 构建 KNN 相似度图 ──
    tree = KDTree(points)
    distances, indices = tree.query(points, k=knn + 1)  # +1 因为包含自身

    # 构建稀疏邻接矩阵
    row_indices = np.repeat(np.arange(N), knn)
    col_indices = indices[:, 1:].ravel()  # 跳过自身 (距离 0)
    sq_distances = (distances[:, 1:].ravel()) ** 2

    # 高斯核相似度
    weights = np.exp(-sq_distances / (2 * sigma ** 2))

    # 对称化（KNN 图不一定对称）
    data = np.concatenate([weights, weights])
    rows = np.concatenate([row_indices, col_indices])
    cols = np.concatenate([col_indices, row_indices])

    W = csr_matrix((data, (rows, cols)), shape=(N, N))

    # ── 2. 构建 Laplacian ──
    D_diag = np.array(W.sum(axis=1)).flatten()
    D = csr_matrix((D_diag, (np.arange(N), np.arange(N))), shape=(N, N))

    if normalized:
        # L_sym = I - D^{-1/2} W D^{-1/2}
        D_inv_sqrt = csr_matrix(
            (1.0 / np.sqrt(D_diag + 1e-10), (np.arange(N), np.arange(N))),
            shape=(N, N)
        )
        L = csr_matrix(np.eye(N)) - D_inv_sqrt @ W @ D_inv_sqrt
    else:
        L = D - W

    # ── 3. 特征分解（取最小的 K 个特征对）─
    eigenvalues, eigenvectors = eigsh(L, k=k, which='SM')

    U = eigenvectors[:, :k]  # N x K

    # ── 4. 行归一化 ──
    row_norms = np.linalg.norm(U, axis=1, keepdims=True)
    row_norms[row_norms < 1e-10] = 1.0
    U_normalized = U / row_norms

    # ── 5. K-Means 在特征空间聚类 ──
    labels, _, _ = kmeans_plusplus(U_normalized, k=k, seed=42)

    return labels


def kmeans_plusplus(X, k, max_iters=100, tol=1e-4, seed=None):
    """简单的 K-Means++ 实现（用于谱聚类的最后一步）"""
    if seed is not None:
        np.random.seed(seed)
    N, d = X.shape

    # K-Means++ 初始化
    centroids = np.zeros((k, d))
    centroids[0] = X[np.random.randint(N)]
    for j in range(1, k):
        dists = np.min(np.sum((X[:, None, :] - centroids[None, :j, :]) ** 2, axis=2), axis=1)
        probs = dists / dists.sum()
        centroids[j] = X[np.searchsorted(np.cumsum(probs), np.random.random())]

    # Lloyd 迭代
    for _ in range(max_iters):
        dists = np.sum(X[:, None, :] ** 2, axis=2) + \
                np.sum(centroids[None, :, :] ** 2, axis=2) - \
                2 * X @ centroids.T
        labels = np.argmin(dists, axis=1)
        new_centroids = np.array([X[labels == j].mean(axis=0) if (labels == j).sum() > 0
                                  else centroids[j] for j in range(k)])
        if np.max(np.abs(new_centroids - centroids)) < tol:
            break
        centroids = new_centroids

    return labels, centroids, 0
```

---

## 四、谱聚类在点云中的独特优势

### 4.1 经典案例：同心环数据

```
  同心环: K-Means vs GMM vs 谱聚类

  原始数据                K-Means                GMM                  谱聚类

    ╭─────────╮         ╭────┬────╮         ╭─────────╮         ╭─────────╮
   ╱           ╲       ╱   ●  │  ●  ╲       ╱    ⬭     ╲       ╱ ●●●●●●●●● ╲
  │  ╭─────╮    │     │  ●   │   ●  │     │  ╭──⬭──╮   │     │  ╭─────╮    │
  │ ╱       ╲   │     │      │      │     │ ╱  ⬭    ╲  │     │ ╱ ▓▓▓▓▓▓▓ ╲ │
  │ │   ·   │  │     ├─●────┼────●─┤     │ │   ⬭    │ │     │ │ ▓▓▓▓▓▓▓▓▓ ││
  │ ╲       ╱   │     │  ●   │   ●  │     │ ╲  ⬭    ╱  │     │ ╲ ▓▓▓▓▓▓▓ ╱ │
  │  ╰─────╯    │     │    ● │ ●    │     │  ╰──⬭──╯   │     │  ╰─────╯    │
   ╲           ╱       ╲      │      ╱       ╲         ╱       ╲           ╱
    ╰─────────╯         ╰────┴────╯         ╰─────────╯         ╰─────────╯

  内圈+外圈=2簇             错误！             错误！                正确！
```

### 4.2 基于法向量的非凸分割

```python
def normal_based_spectral_segmentation(pcd, k=5, sigma_angle=0.2, knn=20):
    """
    基于法向量相似度的谱聚类点云分割。

    即使两个区域在空间上相邻，如果法向量方向差异大（如墙面和地面），
    它们在谱特征空间中也是分离的。
    """
    points = np.asarray(pcd.points)
    if not pcd.has_normals():
        pcd.estimate_normals(search_param=o3d.geometry.KDTreeSearchParamKNN(knn))
    normals = np.asarray(pcd.normals)
    N = len(points)

    # 相似度 = 空间邻近性 × 法向量一致性
    tree = KDTree(points)
    _, indices = tree.query(points, k=knn + 1)

    rows, cols, data = [], [], []
    for i in range(N):
        for j in indices[i, 1:]:
            spatial_sim = np.exp(-np.sum((points[i] - points[j]) ** 2) / (2 * sigma_angle ** 2))
            normal_sim = max(0, np.dot(normals[i], normals[j]))  # 法向量夹角的余弦
            combined_sim = spatial_sim * normal_sim
            rows.append(i); cols.append(j); data.append(combined_sim)
            rows.append(j); cols.append(i); data.append(combined_sim)

    W = csr_matrix((data, (rows, cols)), shape=(N, N))
    D_diag = np.array(W.sum(axis=1)).flatten()
    D_inv_sqrt = csr_matrix(
        (1.0 / np.sqrt(D_diag + 1e-10), (np.arange(N), np.arange(N))), shape=(N, N)
    )
    L = csr_matrix(np.eye(N)) - D_inv_sqrt @ W @ D_inv_sqrt

    eigenvalues, eigenvectors = eigsh(L, k=k, which='SM')
    U = eigenvectors[:, :k]
    U = U / np.linalg.norm(U, axis=1, keepdims=True)

    labels, _, _ = kmeans_plusplus(U, k=k, seed=42)
    return labels
```

---

## 五、谱聚类族谱总结

| 变体 | Laplacian | 图割目标 | 特点 |
|------|-----------|----------|------|
| **未归一化谱聚类** | $L = D - W$ | RatioCut | 简单，对密度不均敏感 |
| **归一化谱聚类 (Shi-Malik)** | $L_{\text{sym}}$ | Ncut | 对密度不均更鲁棒 |
| **Normalized Cut** | $L_{\text{rw}}$ | Ncut | 与随机游走视角一致 |
| **Self-Tuning** | 自适应 $\sigma_i$ | — | 不需手动调 bandwidth |
| **ZP 聚类** | 跨尺度 Laplacian | — | 自动选 K |

---

## 六、复杂度与实用建议

| 步骤 | 复杂度 | 注释 |
|------|--------|------|
| 构建 KNN 图 | $O(N \log N \cdot d)$ | KD-Tree 加速 |
| 计算 Laplacian | $O(N \cdot \text{knn})$ | 稀疏矩阵 |
| 特征分解 (eigsh) | $O(K \cdot N \cdot \text{knn})$ | Arnoldi/Lanczos 迭代 |
| K-Means | $O(N K^2)$ | 在 $K$ 维特征空间 |

> 对于大规模点云（$N > 10^5$），谱聚类的内存和计算成本较高。此时可先用体素下采样将点数降至数千，进行谱聚类后再上采样传播标签。

---

## 总结

| 概念 | 要点 |
|------|------|
| **核心思想** | 将数据点表示为图，通过分析 Laplacian 的特征向量发现聚簇结构 |
| **关键步骤** | 相似度图构建 → Laplacian → 特征分解 → 在特征空间中 K-Means |
| **优势** | 可处理任意形状的簇、非凸分布、连接性驱动的聚类 |
| **劣势** | 大规模点云计算量大、对相似度参数 $\sigma$ 敏感 |
| **点云应用** | 非凸物体分割、法向量驱动分割、多视角一致性聚类 |

谱聚类的数学优雅性在于：它将一个组合优化问题（图割是 NP-hard）松弛为一个矩阵特征分解问题（多项式时间可解）。Laplacian 的 Fiedler 向量天然包含图的全局分割信息——这或许是最优美的数据科学洞察之一。

下一章将学习两种最重要的密度聚类算法：**MeanShift 与 DBSCAN**。
