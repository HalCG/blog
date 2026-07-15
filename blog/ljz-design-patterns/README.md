# 李建忠《C++设计模式》课程笔记

> 按李建忠老师课程目录（26 讲）梳理的 GoF 设计模式自学笔记。  
> 定位：**模式本身 + C++ 极简示例**；不依赖课件原文，不展开 Qt/VTK。  
> 更新日期：2026-07-07 · 共 **26 讲**

---

## 系列导读

李建忠课程的主线是：**从坏味道出发 → 隔离变化点 → 依赖抽象 → 组合优于继承**。

课程顺序与 GoF 书本分类不同：**先讲模板方法、策略、观察者等行为模式**，再讲装饰、桥接等结构模式，最后集中讲创建型——有利于先建立「消除 `if-else`、延迟绑定」的直觉。

每篇结构：

**引子 → 痛点 → 模式结构 → C++ 示例 → 适用/不适用 → 易混对比 → 重点与注意 → 小结**

---

## 完整目录（按课程顺序）

| 讲次 | 主题 | 文章 | GoF |
|------|------|------|-----|
| 01 | 设计模式简介 | [01-intro.md](01-intro.md) | — |
| 02 | 面向对象设计原则 | [02-oop-principles.md](02-oop-principles.md) | — |
| 03 | 模板方法 | [03-template-method.md](03-template-method.md) | 行为 |
| 04 | 策略模式 | [04-strategy.md](04-strategy.md) | 行为 |
| 05 | 观察者模式 | [05-observer.md](05-observer.md) | 行为 |
| 06 | 装饰模式 | [06-decorator.md](06-decorator.md) | 结构 |
| 07 | 桥模式 | [07-bridge.md](07-bridge.md) | 结构 |
| 08 | 工厂方法 | [08-factory-method.md](08-factory-method.md) | 创建 |
| 09 | 抽象工厂 | [09-abstract-factory.md](09-abstract-factory.md) | 创建 |
| 10 | 原型模式 | [10-prototype.md](10-prototype.md) | 创建 |
| 11 | 构建器 | [11-builder.md](11-builder.md) | 创建 |
| 12 | 单件模式 | [12-singleton.md](12-singleton.md) | 创建 |
| 13 | 享元模式 | [13-flyweight.md](13-flyweight.md) | 结构 |
| 14 | 门面模式 | [14-facade.md](14-facade.md) | 结构 |
| 15 | 代理模式 | [15-proxy.md](15-proxy.md) | 结构 |
| 16 | 适配器模式 | [16-adapter.md](16-adapter.md) | 结构 |
| 17 | 中介者模式 | [17-mediator.md](17-mediator.md) | 行为 |
| 18 | 状态模式 | [18-state.md](18-state.md) | 行为 |
| 19 | 备忘录模式 | [19-memento.md](19-memento.md) | 行为 |
| 20 | 组合模式 | [20-composite.md](20-composite.md) | 结构 |
| 21 | 迭代器模式 | [21-iterator.md](21-iterator.md) | 行为 |
| 22 | 职责链模式 | [22-chain-of-responsibility.md](22-chain-of-responsibility.md) | 行为 |
| 23 | 命令模式 | [23-command.md](23-command.md) | 行为 |
| 24 | 访问器模式 | [24-visitor.md](24-visitor.md) | 行为 |
| 25 | 解析器模式 | [25-interpreter.md](25-interpreter.md) | 行为 |
| 26 | 设计模式总结 | [26-summary.md](26-summary.md) | — |

---

## 推荐阅读顺序

### 跟课程（默认）

从 [01 简介](01-intro.md) 顺序读到 [26 总结](26-summary.md)。

### 按 GoF 三类复习

| 创建型 | 结构型 | 行为型 |
|--------|--------|--------|
| [08 工厂方法](08-factory-method.md) | [06 装饰](06-decorator.md) | [03 模板方法](03-template-method.md) |
| [09 抽象工厂](09-abstract-factory.md) | [07 桥接](07-bridge.md) | [04 策略](04-strategy.md) |
| [10 原型](10-prototype.md) | [13 享元](13-flyweight.md) | [05 观察者](05-observer.md) |
| [11 构建器](11-builder.md) | [14 门面](14-facade.md) | [17 中介者](17-mediator.md) |
| [12 单件](12-singleton.md) | [15 代理](15-proxy.md) | [18 状态](18-state.md) |
| | [16 适配器](16-adapter.md) | [19 备忘录](19-memento.md) |
| | [20 组合](20-composite.md) | [21 迭代器](21-iterator.md) |
| | | [22 职责链](22-chain-of-responsibility.md) |
| | | [23 命令](23-command.md) |
| | | [24 访问器](24-visitor.md) |
| | | [25 解析器](25-interpreter.md) |

入门必读：[02 设计原则](02-oop-principles.md) → [04 策略](04-strategy.md) → [05 观察者](05-observer.md)。

---

## 模式易混速查表

| 易混组 | 核心区分 |
|--------|----------|
| **策略 vs 状态 vs 模板方法** | 策略：客户端**显式换**算法；状态：对象**内部状态**驱动换行为；模板方法：基类**固定步骤**、子类填钩子 |
| **装饰 vs 代理 vs 适配器** | 装饰：增强**同接口**职责；代理：控制访问、常延迟创建；适配器：**转换接口**以兼容 |
| **桥接 vs 适配器** | 桥接：**设计期**拆抽象与实现两维度；适配器：**已有类**接口不匹配时的补救 |
| **组合 vs 装饰** | 组合：树形**部分-整体**统一对待；装饰：一层层**包装**同一对象 |
| **观察者 vs 中介者** | 观察者：Subject **广播**；中介者：同事**不直连**，经 Mediator 协调 |
| **工厂方法 vs 抽象工厂 vs 构建器** | 工厂方法：一个产品等级；抽象工厂：一族产品；构建器：**复杂对象分步**组装 |
| **命令 vs 策略** | 命令：封装**请求**、可撤销/排队；策略：封装**算法**、可互换 |

详见各篇「与其他模式对比」及 [26 总结](26-summary.md)。

---

## 代码示例

最小可编译 C++ 示例见 [code/](code/README.md)（高频模式）。

---

## 与 `pattern/` 系列的边界

| | 本系列 `ljz-design-patterns/` | `pattern/`（Qt/VTK） |
|--|-------------------------------|----------------------|
| 目标 | GoF 模式原理与 C++ 经典写法 | 模式在 Qt 6 / VTK 中的 API 落点 |
| 示例 | 独立小例子 | `QIODevice`、`vtkInteractorStyle` 等 |
| 关系 | **独立阅读**，无交叉依赖 | 同上 |

---

## 参考

- GoF：《Design Patterns: Elements of Reusable Object-Oriented Software》
- 李建忠：《C++设计模式》视频课程（Boolan / MSDN 架构课程体系）

---

[返回博客首页](../README.md)
