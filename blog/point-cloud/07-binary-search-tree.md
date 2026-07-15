---
title: 三维点云处理：二叉搜索树（BST）——原理、实现与复杂度分析
description: 从基础数据结构出发，深入讲解二叉搜索树（BST）的定义、插入/搜索/删除操作、时间复杂度分析，并通过 Python 实现为后续 KD-Tree 和 Octree 奠定基础。
---

# 三维点云处理：二叉搜索树（BST）——原理、实现与复杂度分析

在三维点云处理中，**邻域搜索（Neighborhood Search）** 是最频繁的操作之一。无论是法向量估计、聚类还是配准，都依赖于"找到某个点周围最近的点"。对于一个含有 $N$ 个点的点云，暴力搜索的复杂度为 $O(N)$，当 $N = 10^6$ 时这将是灾难性的。

二叉搜索树（Binary Search Tree, BST）是空间索引结构的起点。理解 BST 的运作机制是掌握 KD-Tree 和 Octree 等三维空间索引的前提。

---

## 一、二叉搜索树的定义

### 1.1 基本结构与性质

BST 是一棵二叉树，满足以下**BST 性质**：

> 对于任意节点 $x$，其左子树中所有节点的键值**小于** $x$ 的键值，右子树中所有节点的键值**大于** $x$ 的键值。

```
           ┌───┐
           │ 8 │  ← 根节点 (root)
           └─┬─┘
       ┌─────┴─────┐
     ┌─┴─┐       ┌─┴─┐
     │ 3 │       │ 10│
     └─┬─┘       └─┬─┘
   ┌───┴───┐       └───┐
 ┌─┴─┐   ┌─┴─┐       ┌─┴──┐
 │ 1 │   │ 6 │       │ 14 │
 └───┘   └─┬─┘       └────┘
       ┌───┴───┐
     ┌─┴─┐   ┌─┴─┐
     │ 4 │   │ 7 │
     └───┘   └───┘

  性质验证:
  - 节点 3: 左子树 {1} 均 < 3, 右子树 {6,4,7} 均 > 3 ✓
  - 节点 6: 左子树 {4} < 6, 右子树 {7} > 6 ✓
  - 节点 10: 左子树 ∅, 右子树 {14} > 10 ✓
```

### 1.2 节点定义

```python
class BSTNode:
    """二叉搜索树节点"""
    __slots__ = ('key', 'value', 'left', 'right')

    def __init__(self, key, value=None):
        self.key = key        # 排序依据的键值
        self.value = value    # 存储的数据（可选）
        self.left = None      # 左子节点
        self.right = None     # 右子节点

    def __repr__(self):
        return f"Node(key={self.key}, val={self.value})"
```

---

## 二、核心操作与算法流程

### 2.1 搜索（Search）—— $O(h)$，$h$ 为树高

从根节点开始，比较目标键值 $k$ 与当前节点键值：

```
  Search(6) 的路径:

           ┌───┐
      ┌───►│ 8 │  6 < 8 → 向左
      │    └─┬─┘
      │  ┌───┴───┐
      │┌─┴─┐   ┌─┴─┐
      └┤ 3 │   │ 10│  6 > 3 → 向右
       └─┬─┘   └───┘
     ┌───┴───┐
     │       └──┐
     │        ┌─┴─┐
     └───────►│ 6 │  6 == 6 → 找到！✓
              └───┘

  访问路径长度: 3 (树高 h=3)
```

```python
def search(root, key):
    """
    在 BST 中搜索指定键值。

    :param root: BSTNode | None
    :param key: 搜索目标键值
    :return: 找到的节点或 None
    """
    current = root
    compare_count = 0
    while current is not None:
        compare_count += 1
        if key == current.key:
            print(f"[Search] 找到 {key}, 比较次数: {compare_count}")
            return current
        elif key < current.key:
            current = current.left
        else:
            current = current.right
    print(f"[Search] {key} 不存在, 比较次数: {compare_count}")
    return None
```

### 2.2 插入（Insert）—— $O(h)$

与搜索操作类似，沿着树向下移动，直到找到合适的空位插入新节点。

```
  Insert(5):

           ┌───┐
           │ 8 │  5 < 8 → 左
           └─┬─┘
       ┌─────┴─────┐
     ┌─┴─┐
     │ 3 │  5 > 3 → 右
     └─┬─┘
       └───┐
         ┌─┴─┐
         │ 6 │  5 < 6 → 左
         └─┬─┘
           │
         ┌─┴─┐  ← 空位! 插入 5
         │ 5 │
         └───┘
```

```python
def insert(root, key, value=None):
    """
    在 BST 中插入新节点（不允许重复键值）。

    :param root: BSTNode | None
    :param key: 新节点的键值
    :param value: 新节点的值
    :return: 新树的根节点
    """
    if root is None:
        return BSTNode(key, value)

    current = root
    while True:
        if key < current.key:
            if current.left is None:
                current.left = BSTNode(key, value)
                break
            current = current.left
        elif key > current.key:
            if current.right is None:
                current.right = BSTNode(key, value)
                break
            current = current.right
        else:
            # 键值已存在 → 更新值
            current.value = value
            break

    return root
```

### 2.3 删除（Delete）—— $O(h)$

删除操作是最复杂的，需要处理三种情况：

```
  情况 1: 叶子节点           情况 2: 单子节点              情况 3: 双子节点
  直接删除                  用子节点替换                  用中序后继替换

      ┌─┐                     ┌─┐                        ┌─┐
      │3│                     │3│                        │8│
      └┬┘                     └┬┘                        └┬┘
    ┌──┴──┐                 ┌──┴──┐                    ┌──┴──┐
  ┌─┴─┐  ┌─┴─┐           ┌─┴─┐  ┌─┴─┐              ┌─┴─┐  ┌─┴─┐
  │ 1 │  │ 6 │  ←删除    │ 1 │  │ 6 │              │ 3 │  │ 10│ ←删除
  └───┘  └───┘           └───┘  └─┬─┘              └───┘  └─┬─┘
                                   │              ┌──┐     ┌──┐
                                 ┌─┴─┐            │5 │     │14│
                                 │ 7 │ 替换 6     └──┘     └──┘
                                 └───┘
                                                     中序后继: 14
                                                     用 14 替换 10
```

```python
def delete(root, key):
    """
    在 BST 中删除指定键值的节点。

    :param root: BSTNode | None
    :param key: 要删除的键值
    :return: 新树的根节点
    """
    if root is None:
        return None

    # 搜索目标节点
    if key < root.key:
        root.left = delete(root.left, key)
    elif key > root.key:
        root.right = delete(root.right, key)
    else:
        # 找到目标节点
        # 情况 1 & 2: 无左子或单子节点
        if root.left is None:
            return root.right
        elif root.right is None:
            return root.left

        # 情况 3: 有两个子节点
        # 找到中序后继（右子树中最小的节点）
        successor = _find_min(root.right)
        root.key = successor.key
        root.value = successor.value
        # 删除后继节点（必然是叶子或只有右子）
        root.right = delete(root.right, successor.key)

    return root


def _find_min(node):
    """找到子树中的最小键值节点"""
    while node.left is not None:
        node = node.left
    return node
```

### 2.4 遍历（Traversal）

```
  中序遍历 (In-order): 从小到大有序输出

           ┌───┐
           │ 8 │ (4)
           └─┬─┘
       ┌─────┴─────┐
     ┌─┴─┐       ┌─┴──┐
     │ 3 │ (2)   │ 10 │ (5)
     └─┬─┘       └─┬──┘
   ┌───┴───┐       └───┐
 ┌─┴─┐   ┌─┴─┐       ┌─┴──┐
 │ 1 │   │ 6 │ (3)   │ 14 │ (6)
 └───┘   └───┘       └────┘
 (1)

  输出顺序: 1 → 3 → 6 → 8 → 10 → 14
```

```python
def inorder_traversal(root, visit=None):
    """中序遍历: 左 → 根 → 右"""
    result = []

    def _inorder(node):
        if node is None:
            return
        _inorder(node.left)
        if visit:
            visit(node)
        result.append((node.key, node.value))
        _inorder(node.right)

    _inorder(root)
    return result
```

---

## 三、时间复杂度分析

| 操作 | 平均情况 | 最坏情况 |
|------|----------|----------|
| **搜索** | $O(\log N)$ | $O(N)$ |
| **插入** | $O(\log N)$ | $O(N)$ |
| **删除** | $O(\log N)$ | $O(N)$ |
| **最小值/最大值** | $O(\log N)$ | $O(N)$ |
| **前驱/后继** | $O(\log N)$ | $O(N)$ |

### 3.1 平衡 vs 退化

```
  平衡 BST (h ≈ log₂N)          退化 BST (h = N, 相当于链表)

        ┌───┐                            ┌─┐
        │ 8 │                            │1│
        └─┬─┘                            └┬┘
    ┌─────┴─────┐                       ┌─┴─┐
  ┌─┴─┐       ┌─┴─┐                       │ 2 │
  │ 3 │       │ 10│                       └─┬─┘
  └─┬─┘       └───┘                       ┌─┴─┐
  ┌─┴─┐                                     │ 3 │
  │ 1 │                                     └─┬─┘
  └───┘                                     ┌─┴─┐
                                              │ 4 │
  h = 3, 搜索最多 3 步                         └───┘
  O(log N)                                  h = 4, 搜索最多 4 步
                                            O(N)
```

**退化的根本原因**：插入有序序列（如 `[1, 2, 3, 4, 5, ...]`）会导致 BST 退化为链表。

**解决方案**：
- **AVL 树**：维护每个节点的平衡因子，旋转保持 $|h_L - h_R| \leq 1$
- **红黑树**：节点着色 + 旋转，保证 $\log N$ 高度
- **B-Tree**：每个节点包含多个键，用于数据库/文件系统

---

## 四、BST 与点云处理的关联

### 4.1 一维空间索引

对于一维数据（如按深度排序的 LiDAR 点、按角度投影的环扫数据），BST 可以直接作为空间索引：

```python
# 按 x 坐标建立 BST
class PointBST:
    """用 BST 索引点云，按键为 x 坐标"""

    def __init__(self, points):
        self.root = None
        for i, pt in enumerate(points):
            self.root = insert(self.root, pt[0], i)  # key=x, value=点索引

    def range_search(self, x_min, x_max):
        """范围搜索: 找到 x ∈ [x_min, x_max] 的所有点"""
        result = []

        def _range(node):
            if node is None:
                return
            if node.key > x_min:
                _range(node.left)
            if x_min <= node.key <= x_max:
                result.append(node.value)
            if node.key < x_max:
                _range(node.right)

        _range(self.root)
        return result
```

### 4.2 从 BST 到 KD-Tree 的思维跃迁

```
  维度扩展: 1D → 3D

  BST (1D):                       KD-Tree (3D):
  每个节点比较一个键值            每个节点在交替维度上划分空间

  ┌───┐                          ┌────────────────────┐
  │ 8 │  ← 比较 x                │  按 x 划分 (第 1 层)  │
  └─┬─┘                          │  按 y 划分 (第 2 层)  │
  ┌─┴─┐                          │  按 z 划分 (第 3 层)  │
  │ 3 │  ← 比较 x                │  按 x 划分 (第 4 层)  │
  └───┘                          │  ... 循环交替         │
                                  └────────────────────┘
  只有一个维度                    每层切换一个维度
```

BST 的核心操作——递归地比较键值、进入左子树或右子树——在 KD-Tree 中被扩展为：在每层按不同的坐标轴进行比较和划分。这正是下一章和再下一章的核心内容。

---

## 五、Python 完整实现与可视化

```python
class BinarySearchTree:
    """完整的 BST 数据结构"""

    def __init__(self):
        self.root = None
        self._size = 0

    def insert(self, key, value=None):
        self.root = self._insert(self.root, key, value)
        self._size += 1

    def _insert(self, node, key, value):
        if node is None:
            return BSTNode(key, value)
        if key < node.key:
            node.left = self._insert(node.left, key, value)
        elif key > node.key:
            node.right = self._insert(node.right, key, value)
        else:
            node.value = value
            self._size -= 1  # 更新不增加 size
        return node

    def search(self, key):
        return search(self.root, key)

    def delete(self, key):
        self.root = delete(self.root, key)
        self._size -= 1

    def inorder(self):
        return inorder_traversal(self.root)

    def height(self):
        """计算树的高度"""
        def _h(node):
            if node is None:
                return 0
            return 1 + max(_h(node.left), _h(node.right))
        return _h(self.root)

    def __len__(self):
        return self._size

    def __contains__(self, key):
        return self.search(key) is not None


# ────── 使用示例 ──────
if __name__ == "__main__":
    bst = BinarySearchTree()
    for key in [8, 3, 10, 1, 6, 14, 4, 7]:
        bst.insert(key, f"val-{key}")

    print(f"中序遍历: {bst.inorder()}")
    print(f"树高: {bst.height()} (理想 log₂(8)=3)")
    print(f"搜索 6: {bst.search(6)}")
    print(f"搜索 99: {bst.search(99)}")

    bst.delete(6)
    print(f"删除 6 后的中序遍历: {bst.inorder()}")
```

---

## 总结

| 概念 | 要点 |
|------|------|
| **BST 性质** | 左子树 < 根 < 右子树（严格偏序） |
| **高度与性能** | 平衡时 $h \approx \log_2 N$，所有操作 $O(\log N)$；退化时 $h = N$，操作 $O(N)$ |
| **应用场景** | 一维排序数据的高效查找、插入、删除 |
| **与点云的关联** | BST 是 KD-Tree（多维 BST）和 Octree（自适应 3D 网格）的理论基础 |

> **学习建议**：在进入 KD-Tree 之前，确保手工写出 BST 的 search/insert/delete 三个方法并理解其递归或迭代逻辑。KD-Tree 的搜索算法是 BST 搜索在三维空间中的自然推广。

下一章将学习 **KD-Tree**——将 BST 从一维推向多维，实现三维点云的高效空间搜索。
