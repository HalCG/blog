# CSDN 专栏文章批量爬取工具

将 CSDN 专栏下的所有文章批量下载并转换为 Markdown 文件。

## 整体流程

```
┌─────────────────────────────────────────────────────────┐
│  Step 1: 提取文章列表                                     │
│  使用 WebFetch 工具访问专栏页面，获取所有文章标题和 URL      │
│  https://blog.csdn.net/<作者>/category_<id>.html          │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Step 2: 保存文章列表                                     │
│  将结果保存为 article_list.json，格式：                    │
│  [{"title": "文章标题", "url": "https://..."}, ...]       │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Step 3: 批量爬取正文                                     │
│  node fetch_articles.cjs <list.json> <output_dir> <专栏名> │
│  每篇间隔 2.5 秒，避免触发 CSDN 反爬机制                    │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Step 4 (可选): 质量检查                                   │
│  用 WebFetch 单独重抓内容较短或有问题的文章                  │
│  获得更完整、格式更好的 Markdown                           │
└─────────────────────────────────────────────────────────┘
```

## 使用方法

### Step 1 & 2: 获取文章列表

通过 Claude Code 的 WebFetch 工具提取专栏文章列表。例如：

> 访问 https://blog.csdn.net/chengfenglee/category_10707387.html，
> 提取所有文章标题和 URL，保存为 JSON 数组

将结果保存为 `article_list.json`，格式如下：

```json
[
  {"title": "文章标题一", "url": "https://blog.csdn.net/xxx/article/details/123"},
  {"title": "文章标题二", "url": "https://blog.csdn.net/xxx/article/details/456"}
]
```

### Step 3: 运行爬取脚本

```bash
cd site/tools/csdn-scraper
node fetch_articles.cjs <列表文件> <输出目录> <专栏名称> [已完成数]
```

**参数说明：**

| 参数 | 必填 | 说明 |
|------|------|------|
| `<列表文件>` | 是 | 文章列表 JSON 文件路径 |
| `<输出目录>` | 是 | 输出的 Markdown 文件存放目录 |
| `<专栏名称>` | 是 | 专栏名称，会写入每篇文章的 frontmatter |
| `[已完成数]` | 否 | 跳过前 N 篇，用于断点续传（默认 0） |

**示例：**

```bash
# 路径相对于 repo 根目录，可以在任意位置运行
cd site/tools/csdn-scraper

# 全部爬取
node fetch_articles.cjs \
  site/scratch/column_list.json \
  blog/新专栏名 \
  "专栏名称"

# 断点续传：前 5 篇已手动处理，从第 6 篇开始
node fetch_articles.cjs \
  site/scratch/column_list.json \
  blog/新专栏名 \
  "专栏名称" \
  5
```

### Step 4 (可选): 精选文章增强

部分文章内容较短或格式不够理想，可以使用 WebFetch 工具单独重抓：

> 访问 https://blog.csdn.net/xxx/article/details/123，
> 提取完整内容为 Markdown 格式

手动替换对应的 `.md` 文件，补充 frontmatter 和原文链接。

## 输出格式

每篇文章会保存为一个 Markdown 文件，包含：

```markdown
---
title: 文章标题
description: 文章摘要（前 150 字）
---

# 文章标题

> **原创** | 专栏「专栏名」| [原文链接](https://...)

正文内容...
```

文件命名规则：`编号-文章标题.md`（如 `01-引言.md`，`15-RTTI机制详解.md`）

## 技术细节

- **反爬策略**: 使用 Chrome User-Agent + 每次请求间隔 2.5 秒
- **内容提取**: 从 `<div id="content_views">` 中通过嵌套 div 计数精确提取正文
- **HTML→Markdown**: 正则表达式转换，保留标题层级、代码块、表格、链接等结构
- **断点续传**: 通过 `[已完成数]` 参数跳过已处理的文章

## 文件说明

```
csdn-scraper/
├── README.md              # 本文档
└── fetch_articles.cjs     # 批量爬取脚本 (CommonJS)
```

## 已知限制

1. CSDN 页面内容经过 JavaScript 动态渲染的部分（如公式、特殊图表）可能无法完整提取
2. 文章中的图片链接会保留原始 URL，但不会下载图片到本地
3. 部分文章如有大量嵌套 HTML 结构，Markdown 转换可能不够完美
4. 建议重要/长文使用 WebFetch 工具单独重抓以获得最佳质量
