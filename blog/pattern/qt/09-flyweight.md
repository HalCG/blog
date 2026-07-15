# Qt 设计模式：享元模式

> 系列：[Qt / VTK 设计模式](../README.md) · Qt 09/11  
> 参考：Qt 6 [Implicit Sharing](https://doc.qt.io/qt-6/implicit-sharing.html)、[QImage](https://doc.qt.io/qt-6/qimage.html)

---

## 引子

一万个 `QString` 拷贝，若每个都深拷贝字符数组，内存立刻爆炸。Qt 长期用 **隐式共享（COW）** 让拷贝几乎零成本，直到有人写入——这是享元思想在值类型上的工程化实现。

---

## 要解决什么问题

大量细粒度对象重复存储相同数据：

```cpp
QList<QString> tags;  // 很多相同 tag 字符串
```

痛点：内存浪费、拷贝昂贵。

---

## GoF 享元结构

| 角色 | Qt 对应 |
|------|---------|
| Flyweight | 共享的内部数据块（`QArrayData` 等） |
| Extrinsic state | 每个对象独有的 size、offset 等 |
| Factory | `QString` 内部分配器 / 字符串池 |

---

## Qt 中的落点

### 隐式共享类型（Qt 文档列出的）

- `QImage`、`QPixmap`
- `QByteArray`、`QList`（部分模板）
- `QMap`、`QHash` 等

**注意**：Qt 6 起 **`QString` 默认不再使用 COW**（小字符串优化 SSO 为主），但 `QByteArray`、`QImage` 等仍大量隐式共享。

### 图标与主题

`QIcon` 可按尺寸缓存同一路径的 pixmap，避免重复解码 PNG。

### `QStringLiteral` / 编译期字符串

减少运行时重复分配，与享元「复用不变数据」目标一致。

---

## 底层逻辑（隐式共享）

拷贝构造：

```cpp
QImage b = a;  // 原子增加 refCount，共享同一块像素缓冲
```

写时复制（COW）：

```cpp
b.bits();  // 若 refCount > 1，先 detach 再返回可写指针
```

**本质**：多个外观对象共享内部重数据，写入时才分裂。

---

## 代码示例

```cpp
QImage a(1000, 1000, QImage::Format_RGB32);
QImage b = a;           // 共享数据
QImage c = a.copy();    // 显式深拷贝，独立缓冲

QByteArray x = "hello";
QByteArray y = x;       // 共享
y.append('!');          // detach，x 仍为 "hello"
```

### 应用层享元池（概念）

```cpp
class IconCache {
  QHash<QString, QIcon> cache;
public:
  const QIcon& icon(const QString& path) {
    if (!cache.contains(path))
      cache.insert(path, QIcon(path));
    return cache[path];
  }
};
```

---

## 易混淆点

| 对比 | 区别 |
|------|------|
| 享元 vs 单例 | 享元多实例共享数据；单例全局唯一对象 |
| `QString` Qt5 vs Qt6 | Qt6 字符串 COW 策略变化，读文档再优化 |
| 深拷贝 `copy()` | 主动断开共享 |

---

## 最佳实践与陷阱

1. **多线程只读共享隐式共享对象** 通常安全；**写入前** 确保 detach 或独占
2. **大 `QImage` 传参** 用 `const QImage&` 避免误触发 detach
3. **Qt6 `QString`** 不要假设 COW，关注 SSO 与 `QStringView`
4. **跨线程传递** 优先 `QPixmap`/`QImage` 深拷贝或只读共享规则
5. **业务层大对象** 可自建缓存池，不要依赖隐式共享解决所有重复

---

## 重点与注意

> **重点**：享元 = **共享内部重数据、外观对象轻量**；Qt 隐式共享在拷贝时只增引用计数，写入时才 `detach`（写时复制）。  
> **重点**：`QByteArray`、`QImage` 等仍广泛隐式共享；**Qt 6 的 `QString` 默认不再 COW**，排错时不要照搬 Qt5 结论。  
> **注意**：多线程下对**同一隐式共享对象并发写**必须保证独占（detach 后写），只读共享通常安全。  
> **注意**：享元（共享数据）与单例（共享对象）解决的问题不同。

---

## 小结

Qt 享元模式主要体现在 **隐式共享值类型** 与 **图标/资源缓存**，核心是共享不变数据、延迟复制。

**延伸阅读**

- [Implicitly Shared Classes](https://doc.qt.io/qt-6/implicit-sharing.html)
- 上一篇：[08 代理](08-proxy.md) · 下一篇：[10 中介者](10-mediator.md)
- 系列索引：[README](../README.md)
