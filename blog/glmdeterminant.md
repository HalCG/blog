`glm::determinant` 是 **GLM** (OpenGL Mathematics) 库中的一个函数，用于**计算方阵的行列式**。

## 主要用途

行列式是一个标量值，它从矩阵中提取出许多重要的数学特性。具体用途包括：

### 1. **判断矩阵是否可逆**

- 如果 `determinant(matrix) != 0`，矩阵是**可逆的**（非奇异矩阵）
- 如果 `determinant(matrix) == 0`，矩阵是**不可逆的**（奇异矩阵）

### 2. **计算几何变换的缩放因子**

对于 3D 变换矩阵，行列式的绝对值表示变换后的**体积缩放倍数**：

```cpp
#include <glm/glm.hpp>
#include <glm/gtx/matrix_decompose.hpp>

glm::mat4 transform = /* 某个变换矩阵 */;
float det = glm::determinant(transform);

// 如果 det == 1，变换保持体积（旋转/平移）
// 如果 det == 0，变换将空间压缩到更低维度
// 如果 det < 0，变换包含镜像（翻转了手性）
```

### 3. **辅助计算逆矩阵**

`glm::inverse()` 内部就使用了伴随矩阵除以行列式的方法：

$$ A^{-1} = \frac{\text{adj}(A)}{\det(A)} $$

## 返回值类型

| 矩阵类型     | 返回值        |
| ------------ | ------------- |
| `glm::mat2`  | `float` (2x2) |
| `glm::mat3`  | `float` (3x3) |
| `glm::mat4`  | `float` (4x4) |
| `glm::dmat4` | `double`      |

## 示例

```cpp
glm::mat4 model = glm::scale(glm::mat4(1.0f), glm::vec3(2.0f, 3.0f, 4.0f));
float det = glm::determinant(model);
// det = 2 * 3 * 4 = 24（体积放大了24倍）

// 判断是否可逆
if (glm::determinant(myMatrix) != 0.0f) {
    glm::mat4 inv = glm::inverse(myMatrix);
}
```

**简单总结：** 判断矩阵是否可逆、计算变换的体积缩放、检测是否包含镜像变换。