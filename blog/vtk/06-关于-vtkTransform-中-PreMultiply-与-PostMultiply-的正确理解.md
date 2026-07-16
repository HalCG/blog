---
title: 关于 vtkTransform 中 PreMultiply 与 PostMultiply 的正确理解
description: >
  矩阵乘法的变换顺序是从右往左读的（这一个常识很重要，你得明白这一点，有基本概念）  ---  #### 1. **`PreMultiply`（前乘）**  -  **定义**：所有`后续操作`都将在当前变换中已表示的操作`之前`发生。  -  **数学表示**：如果当前变换矩阵是 (M)，新变
---

# 关于 vtkTransform 中 PreMultiply 与 PostMultiply 的正确理解




矩阵乘法的变换顺序是从右往左读的（这一个常识很重要，你得明白这一点，有基本概念）

---

#### 1. **`PreMultiply`（前乘）**

-

**定义**：所有`后续操作`都将在当前变换中已表示的操作`之前`发生。

-

**数学表示**：如果当前变换矩阵是 (M)，新变换矩阵是 (T)，则结果为：

Mnew= M * T

-

**读法**：你可以理解为“先应用新变换 (T)，再应用当前变换 (M)”。

---

#### 2. **`PostMultiply`（后乘）**

-

**定义**：所有`后续操作`都将在当前变换中已表示的操作`之后`发生。

-

**数学表示**：如果当前变换矩阵是 (M)，新变换矩阵是 (T)，则结果为：

Mnew = T * M

-

**读法**：你可以理解为“先应用当前变换 (M)，再应用新变换 (T)”。

---

#### 3. **示例**

假设当前变换矩阵 (M) 是一个平移变换，新变换矩阵 (T) 是一个旋转变换。

-

**`PreMultiply`**：

Mnew = M * T

先旋转，再平移。

-

**`PostMultiply`**：

Mnew = T * M

先平移，再旋转。

---

example1:

```
	double translation[] = { 1.0, 3.2, 5.4 };

	// 创建平移变换
	vtkSmartPointer<vtkTransform> translateTransform = vtkSmartPointer<vtkTransform>::New();
	translateTransform->Translate(translation[0], translation[1], translation[2]);

	double pos[] = {10.0, 30.2, 50.4};
	// 创建旋转变换
	vtkSmartPointer<vtkTransform> rotateTransform = vtkSmartPointer<vtkTransform>::New();
	rotateTransform->Translate(-pos[0], -pos[1], -pos[2]);
	rotateTransform->RotateX(this->xAxisSpinBox->value()); // 绕X轴旋转
	rotateTransform->RotateY(this->yAxisSpinBox->value()); // 绕Y轴旋转
	rotateTransform->RotateZ(this->zAxisSpinBox->value()); // 绕Z轴旋转
	rotateTransform->Translate(pos[0], pos[1], pos[2]);

	// 组合变换：首先平移，然后旋转
	vtkSmartPointer<vtkTransform> combinedTransform = vtkSmartPointer<vtkTransform>::New();
	combinedTransform->PostMultiply();
	combinedTransform->Concatenate(translateTransform);
	combinedTransform->Concatenate(rotateTransform);

```

解释combinedTransform ：

combinedTransform 默认是PreMultiply，此处设置为PostMultiply，可理解为rotateTransform * translateTransform ，后续添加的变换放在线性乘法的左侧。PostMultiply时，作用顺序从右往左读，所以此例子中的变换：先进行平移，再进行旋转

再看另一种写法：

```
	// 组合变换：首先平移，然后旋转
	vtkSmartPointer<vtkTransform> combinedTransform = vtkSmartPointer<vtkTransform>::New();
	combinedTransform->Concatenate(translateTransform);
	combinedTransform->PostMultiply();
	combinedTransform->Concatenate(rotateTransform);

```

这里还是先平移后旋转，为什么？

默认的时PreMultiply，设置了PostMultiply后，rotateTransform还是被放到了translateTransform的左侧，所以还是先平移，后旋转

解释rotateTransform ：

首先，在VTK中，vtkTransform的PostMultiply和PreMultiply方法只会影响该vtkTransform对象本身的变换顺序，而不会影响其他vtkTransform对象的内部变换顺序。

rotateTransform 默认是PreMultiply，不被combinedTransform 影响，所以变换乘法为从左往右平铺的，作用顺序也是从左往右，先把vtkActor移动到世界坐标原点，然后分别进行x y z轴的旋转，再回到原来的位置