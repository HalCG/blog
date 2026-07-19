# 网页发布与隐私隔离规范

为了保护敏感代码信息、防止未完成的草稿影响站点体验，并规范云端打包流程，特制定本站网页发布与过滤规则。

---

## 1. 核心发布隔离原则

本站定位为公开的个人技术分享平台，因此在构建并发布网页时，必须对以下敏感或未整理的内容进行严格的**物理屏蔽（隔离）**：

1. **绝对禁止发布公司内部商业项目细节**：
   * 所有包含公司具体项目设计、保密业务逻辑、敏感通信协议或商业源码解读的内容，严禁发布上线。
   * 本地工作流涉及的相关分析文件（如 `JMColor_ProjectDetails`、`JMScan-face_ProjectDetails` 文件夹）必须被排除。
2. **暂时不公开发布点云理论推导文件**：
   * 鉴于 `point-cloud/`（三维点云 理论与算法）目录下包含大量的纯数学几何公式推导，且尚处于整理阶段，**暂时不予发布**。
   * 仅公开发布 `point-cloud-applied/`（三维点云 应用与实战）目录下的实用工程开发与 Open3D 代码指南。
3. **禁止发布第三方版权课程/个人隐私笔记**：
   * 为了避免侵犯第三方版权，所有关于外部购买课程的详细学习笔记（例如李建忠设计模式课程笔记目录 `pattern/ljz-design-patterns/`）**一律禁止发布到公开网页**。
4. **隔离开发元数据与临时草稿**：
   * 网站构建过程中产生的任务单（`task.md`）、规划案（`implementation_plan.md`）、开发记录（`walkthrough.md`）、本地草稿（如带有“新建”字样的文件）等，必须在构建时予以忽略。

---

## 2. 隔离过滤的技术实现 (VitePress)

上述隔离规则通过本站 VitePress 的配置文件 **`site/.vitepress/config.ts`** 中的 `srcExclude` 数组进行自动化配置与强制拦截。

### 当前生效的拦截配置 (config.ts)：

```typescript
  // 忽略不需要打包的目录或文件（在此列表内的文件绝对不会被打包发布）
  srcExclude: [
    '**/node_modules/**',
    '**/dist/**',
    'README.md', // 仅忽略根目录的 README.md，防止与 index.md 冲突
    '需求.md',
    'implementation_plan.md',
    'task.md',
    'walkthrough.md',
    
    // 1. 公司项目细节与保密文档，绝对不公开发布
    'JMColor_ProjectDetails/**',
    'JMScan-face_ProjectDetails/**',
    
    // 2. 三维点云理论推导原文件，暂时不公开发布
    'point-cloud/**',
    
    // 3. 第三方版权课程笔记，不公开发布
    'pattern/ljz-design-patterns/**',
    
    // 4. 临时新建草稿与副本文件
    'vtk-python/**/新建*.md'
  ],
```

当 `srcExclude` 拦截生效后，上述文件夹中的所有 Markdown 页面都将被 VitePress 打包引擎忽略，从而在根源上避免了敏感文件的泄露或打包中断。

---

## 3. 本地运行与云端构建流程

在将修改推送到公共仓库进行网页部署前，请先在本地进行完整测试。

### 3.1 本地开发联调 (Dev Server)
在 `site/` 目录下运行本地开发服务，可以实时预览最新的排版与渲染效果：
```bash
# 1. 进入 site 目录
cd site

# 2. 启动本地开发热重载服务器
npm run dev
```
启动后在浏览器中打开命令行提示的本地端口（通常为 `http://localhost:5173/`），重点检查数学公式渲染、Mermaid 流程图是否发生文字截断。

### 3.2 云端自动发布与托管 (Vercel)
本站已托管于 **Vercel** 云端发布平台：
1. 本地代码完成修改并通过测试后，使用 `git commit` 进行提交。
2. 将代码推送到 GitHub 的 `main`（或发布分支）上。
3. Vercel 的 Webhook 将会自动捕获推送事件，并在云端容器内执行 `npm run build` 命令。
4. 打包完成后，新版内容会自动、安全地部署到对应的公开域名上。
