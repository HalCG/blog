import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import fs from 'fs'
import path from 'path'
import mathjax3 from 'markdown-it-mathjax3'

// 文章源文件目录（相对于 site/ 目录）
const BLOG_DIR = path.resolve(__dirname, '../../blog')

// 动态获取目录下文章列表的辅助函数
function getArticlesInDir(dirRelativePath: string) {
  const dirPath = path.resolve(BLOG_DIR, dirRelativePath)
  if (!fs.existsSync(dirPath)) {
    return []
  }
  const files = fs.readdirSync(dirPath)
  const mdFiles = files.filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
  
  // 检查是否存在 README.md / index.md 作为导言
  const readme = files.find(f => f.toLowerCase() === 'readme.md')
  
  const items = mdFiles.map(file => {
    const filePath = path.join(dirPath, file)
    let content = fs.readFileSync(filePath, 'utf-8')
    if (content.startsWith('\uFEFF')) {
      content = content.slice(1)
    }
    
    // 尝试从 frontmatter 解析标题
    let title = ''
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (fmMatch) {
      const fmContent = fmMatch[1]
      const titleMatch = fmContent.match(/^title:\s*(.+)$/m)
      if (titleMatch) {
        title = titleMatch[1].trim().replace(/^['"]|['"]$/g, '')
      }
    }
    
    // 尝试从第一个一级标题 (# ) 解析标题
    if (!title) {
      const h1Match = content.match(/^#\s+(.+)$/m)
      if (h1Match) {
        title = h1Match[1].trim()
      }
    }
    
    // 如果都没有，使用文件名作为标题
    if (!title) {
      title = file.replace('.md', '')
    }
    
    // 在 Windows 系统下，path.join 会产生反斜杠，VitePress 需要正斜杠
    const webLink = ('/' + path.join(dirRelativePath, file.replace('.md', '')).replace(/\\/g, '/')).replace(/ /g, '%20')
    
    return {
      text: title,
      link: webLink
    }
  })
  
  // 按文件名数字进行排序（例如 01-..., 02-...）
  items.sort((a, b) => {
    return a.link.localeCompare(b.link, undefined, { numeric: true, sensitivity: 'base' })
  })
  
  // 如果存在 README.md，将其作为目录第一项（起名“导言 / 概览”）
  if (readme) {
    items.unshift({
      text: '导言 / 概览',
      link: ('/' + path.join(dirRelativePath, 'README').replace(/\\/g, '/')).replace(/ /g, '%20')
    })
  }
  
  return items
}

// 扫描“每篇文章一个子目录”结构（如 vtk-python），子目录名即文章标题，
// 目录内优先取 *_blog.md 作为正文（忽略草稿等其他 md 文件）
function getArticlesInSubdirs(dirRelativePath: string) {
  const dirPath = path.resolve(BLOG_DIR, dirRelativePath)
  if (!fs.existsSync(dirPath)) {
    return []
  }
  const subdirs = fs.readdirSync(dirPath).filter(name =>
    fs.statSync(path.join(dirPath, name)).isDirectory()
  )

  const items = subdirs.flatMap(sub => {
    const files = fs.readdirSync(path.join(dirPath, sub))
    const mdFiles = files.filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    // 优先取 *_blog.md，否则取第一个 md 文件
    const main = mdFiles.find(f => /_blog\.md$/i.test(f)) || mdFiles[0]
    if (!main) return []
    const webLink = ('/' + path.join(dirRelativePath, sub, main.replace('.md', '')).replace(/\\/g, '/')).replace(/ /g, '%20')
    return [{ text: sub, link: webLink }]
  })

  items.sort((a, b) => a.text.localeCompare(b.text, undefined, { numeric: true, sensitivity: 'base' }))
  return items
}

export default withMermaid(defineConfig({
  title: 'Leo的个人空间',
  description: 'C++ / OpenGL / VTK / 设计模式 / 读书笔记 / 生活与健康',
  
  // 指向同级的 blog 目录作为 Markdown 源文件目录
  srcDir: '../blog',
  
  // 解决 markdown 文件编译为 vue 组件时无法解析 vue 依赖的问题
  vite: {
    cacheDir: path.resolve(__dirname, '../node_modules/.vite'),
    resolve: {
      alias: {
        'vue': path.resolve(__dirname, '../node_modules/vue'),
        // 本项目 srcDir 指向 ../blog（无 node_modules），vite 依赖预构建失效，
        // mermaid 默认入口（core）引用的 CJS 子依赖无法在浏览器直接加载，
        // 因此指向自包含的浏览器 ESM 版本
        'mermaid': path.resolve(__dirname, '../node_modules/mermaid/dist/mermaid.esm.min.mjs')
      }
    }
  },
  
  // 忽略不需要打包的目录或文件
  srcExclude: [
    '**/node_modules/**',
    '**/dist/**',
    'README.md', // 仅忽略根目录的 README.md，防止与 index.md 冲突
    '需求.md',
    'implementation_plan.md',
    'task.md',
    'walkthrough.md',
    // 公司项目细节与面试准备，不公开发布
    'JMColor_ProjectDetails/**',
    'JMScan-face_ProjectDetails/**',
    // 三维点云理论原文件，暂时不发布
    'point-cloud/**',
    // 李建忠设计模式课程笔记，不公开发布
    'pattern/ljz-design-patterns/**',
    // vtk-python 目录下的草稿文件
    'vtk-python/**/新建*.md'
  ],

  // 忽略死链接检查（由于本地 Markdown 中包含大量跳转至 C++ 源码、Obsidian 本地配置或外部非 markdown 页面的链接，开启此项防止编译中断）
  ignoreDeadLinks: true,

  // Markdown 渲染配置（LaTeX 公式解析）
  markdown: {
    config: (md) => {
      md.use(mathjax3)
    }
  },

  themeConfig: {
    siteTitle: 'Leo的个人空间',

    // 头部导航栏
    nav: [
      { text: '首页', link: '/' }
    ],

    // 侧边栏配置（左侧文章分类菜单）
    sidebar: {
      '/': [
        {
          text: 'C++ 核心与网络开发',
          collapsed: true,
          items: getArticlesInDir('cpp')
        },
        {
          text: 'Qt 开发与工程实战',
          collapsed: true,
          items: getArticlesInDir('qt')
        },
        {
          text: 'OpenGL 应用与原理',
          collapsed: true,
          items: getArticlesInDir('OpenGL应用')
        },
        {
          text: 'OpenGL 渲染实例',
          collapsed: true,
          items: getArticlesInDir('OpenGlInstance')
        },
        {
          text: 'VTK 开发与图像处理',
          collapsed: true,
          items: getArticlesInDir('vtk-examples')
        },
        {
          text: 'VTK 源码剖析与机制',
          collapsed: true,
          items: getArticlesInDir('vtk-source')
        },
        {
          text: 'VTK Python 图像处理专题',
          collapsed: true,
          items: getArticlesInSubdirs('vtk-python')
        },
        /*
        {
          text: '三维点云 (理论与算法)',
          collapsed: true,
          items: getArticlesInDir('point-cloud')
        },
        */
        {
          text: '三维点云 (应用与实战)',
          collapsed: true,
          items: getArticlesInDir('point-cloud-applied')
        },
        {
          text: 'Qt 与设计模式开发',
          collapsed: true,
          items: getArticlesInDir('pattern/qt')
        },
        {
          text: 'VTK 设计模式',
          collapsed: true,
          items: getArticlesInDir('pattern/vtk')
        },
        /*
        {
          text: 'GoF 23种设计模式 (李建忠)',
          collapsed: true,
          items: getArticlesInDir('pattern/ljz-design-patterns')
        },
        */
        {
          text: '软件设计原则与综合模式',
          collapsed: true,
          items: [
            { text: '软件设计原则与模式', link: '/pattern/software-design-principles-and-patterns' }
          ]
        },
        {
          text: '程序员修炼之书与哲学',
          collapsed: true,
          items: [
            { text: '读书笔记导言', link: '/books/README' },
            {
              text: '程序员修炼之道',
              items: getArticlesInDir('books/pragmatic-programmer')
            },
            {
              text: '软件设计哲学',
              items: getArticlesInDir('books/software-design-philosophy')
            }
          ]
        },
        {
          text: '网站发布与云端托管',
          collapsed: true,
          items: [
            { text: 'Vercel 云端部署与本地运行', link: '/vercel-deployment' }
          ]
        }
      ]
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/HalCG/blog' }
    ],

    // 搜索配置：内置本地搜索，速度极快
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档'
          },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭'
            }
          }
        }
      }
    },

    // 底部页脚
    footer: {
      message: '基于 VitePress 强力驱动 | 记录技术与生活',
      copyright: `Copyright © 2024-${new Date().getFullYear()} Leo的个人空间`
    },

    // 大纲显示配置 (右侧目录)
    outline: {
      level: [2, 3],
      label: '本文大纲'
    },

    // 页面控制
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    darkModeSwitchLabel: '深色模式切换',
    lightModeSwitchTitle: '切换至亮色模式',
    darkModeSwitchTitle: '切换至深色模式',
    sidebarMenuLabel: '文章列表'
  }
}))
