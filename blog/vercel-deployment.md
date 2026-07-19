# Vercel 云端部署与本地运行指南

本站基于 **VitePress** 静态网站生成器构建。借助现代化的前端 DevOps 工具链，我们可以轻松实现**本地实时热预览**以及**云端（Vercel）一键同步自动部署**。

本指南将为您详细梳理本地运行与云端发布的具体命令和配置步骤。

---

## 1. 本地运行与开发预览

在本地撰写或修改文章后，建议先在本地运行开发服务器进行热预览，确保排版和公式显示正确。

### 1.1 依赖安装
如果您是第一次运行本站，请在 `site/` 目录下执行依赖安装命令（系统需安装有 [Node.js](https://nodejs.org/)）：
```bash
# 进入站点工作目录
cd site

# 安装本站所需的开发依赖（VitePress, Vue, MathJax等）
npm install
```

### 1.2 启动本地热更新服务器
运行以下命令开启本地实时开发环境：
```bash
npm run docs:dev
```
* **运行地址**：启动后，终端将输出一个本地环回地址（通常为 `http://localhost:5173/`）。
* **实时热更新**：您在 Obsidian 或 VSCode 中对 `blog/` 目录下的文章进行的任何修改和保存，浏览器均能**毫秒级自动刷新**呈现，无需手动刷新页面。

---

## 2. 云端 Vercel 自动部署配置

[Vercel](https://vercel.com/) 是最先进的静态网站托管平台之一，支持与 GitHub 深度绑定，实现“代码推送即部署”。

### 2.1 云端项目导入步骤
1. 登录 [Vercel 官网](https://vercel.com/)（推荐直接使用 GitHub 账号登录）。
2. 在控制面板点击 **Add New** -> **Project**。
3. 导入（Import）本站对应的 GitHub 仓库（如 `HalCG/blog`）。

### 2.2 构建选项配置（极关键）
在导入项目后的配置面板中，展开 **Build and Development Settings**，进行如下配置：

* **Framework Preset**: 选择 `Other`（或 `VitePress`，如果识别出来）。
* **Root Directory**: 保持为空（即项目根目录），或者如果您的 VitePress 位于子目录，选择 `site`。由于我们的 `package.json` 和编译命令存放在 `site/` 中，**建议将 Root Directory 设置为 `site`**。
* **Build Command**: 填写 `npm run docs:build`（或在 `site` 根目录下执行的构建命令）。
* **Output Directory**: 填写 `.vitepress/dist`。

```
 ┌────────────────────────────────────────────────────────┐
 │                   Vercel Build Settings                │
 ├────────────────────────────────────────────────────────┤
 │  ● Root Directory:   [ site                   ] [Browse]│
 │  ● Build Command:    [ npm run docs:build     ]        │
 │  ● Output Directory: [ .vitepress/dist        ]        │
 └────────────────────────────────────────────────────────┘
```

点击 **Deploy** 按钮，Vercel 将自动拉取源码、安装依赖并编译生成静态文件。在 30 秒内，您的博客就会拥有一个全球加速的独立域名（如 `https://your-blog.vercel.app`）。

---

## 3. 日常写书与一键同步发布工作流

配置完成后，您的日常写作发布工作流将变得极其顺畅：

```mermaid
flowchart LR
    A["Obsidian / VSCode 编辑文章"] --> B["本地预览确认"] --> C["Git Push"] --> D["Vercel 自动重新构建部署"]
```

1. **编辑文章**：在 Obsidian 中创建或编辑 `blog/` 目录下的 Markdown 笔记。
2. **本地确认**：通过 `npm run docs:dev` 检查排版。
3. **一键推送**：在终端执行 Git 提交命令推送到 GitHub：
   ```bash
   git add .
   git commit -m "docs: 新增一篇图形学/Qt文章"
   git push origin main
   ```
4. **自动上线**：Vercel 会自动监听到 GitHub 的 `push` 提交，并在后台启动构建任务。30 秒后，新文章就会自动在全球网络上线，无需任何手动服务器运维！
