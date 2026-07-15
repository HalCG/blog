import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import mathjax3 from 'markdown-it-mathjax3'

// 动态获取目录下文章列表的辅助函数
function getArticlesInDir(dirRelativePath: string) {
  const dirPath = path.resolve(process.cwd(), dirRelativePath)
  if (!fs.existsSync(dirPath)) {
    return []
  }
  const files = fs.readdirSync(dirPath)
  const mdFiles = files.filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
  
  // 检查是否存在 README.md / index.md 作为导言
  const readme = files.find(f => f.toLowerCase() === 'readme.md')
  
  const items = mdFiles.map(file => {
    const filePath = path.join(dirPath, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    
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
    const webLink = '/' + path.join(dirRelativePath, file.replace('.md', '')).replace(/\\/g, '/')
    
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
      link: '/' + path.join(dirRelativePath, 'README').replace(/\\/g, '/')
    })
  }
  
  return items
}

export default defineConfig({
  title: '图形学与软件开发笔记',
  description: 'C++ / OpenGL / VTK / 计算几何 / Qt / 设计模式',
  
  // 使用当前文件夹（blog 根目录）作为源文件目录
  srcDir: '.',
  
  // 忽略不需要打包的目录或文件
  srcExclude: [
    '**/node_modules/**',
    '**/dist/**',
    'README.md', // 仅忽略根目录的 README.md，防止与 index.md 冲突
    '需求.md',
    'implementation_plan.md',
    'task.md',
    'walkthrough.md'
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
    logo: { text: '💡', link: '/' },
    siteTitle: '图形学 & 软件开发',

    // 头部导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: 'OpenGL 应用', link: '/OpenGL应用/OpenGL 深度测试及Early-Z详解' },
      { text: 'VTK 开发', link: '/pattern/vtk-observer-and-command-pattern' },
      { text: 'Qt 与设计模式', link: '/pattern/qt/01-observer-signals-slots' },
      { text: '设计模式基础', link: '/ljz-design-patterns/README' }
    ],

    // 侧边栏配置（左侧文章分类菜单）
    sidebar: {
      '/': [
        {
          text: 'OpenGL 应用与原理',
          collapsed: false,
          items: getArticlesInDir('OpenGL应用')
        },
        {
          text: 'VTK 开发与图像处理',
          collapsed: true,
          items: [
            ...getArticlesInDir('VTK 交互系统详解：vtkRenderWindowInteractor 内部流程'),
            ...getArticlesInDir('Python VTK Canny 边缘检测：从数学原理到代码实现'),
            ...getArticlesInDir('Python VTK Sobel 边缘检测：从数学原理到代码实现'),
            { text: 'VTK 观察者与命令模式', link: '/pattern/vtk-observer-and-command-pattern' },
            ...getArticlesInDir('pattern/vtk')
          ]
        },
        {
          text: 'Qt 与设计模式开发',
          collapsed: true,
          items: getArticlesInDir('pattern/qt')
        },
        {
          text: 'GoF 23种设计模式 (李建忠)',
          collapsed: true,
          items: getArticlesInDir('ljz-design-patterns')
        },
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
      message: '基于 VitePress 强力驱动 | 零部署维护成本',
      copyright: `Copyright © 2024-${new Date().getFullYear()} 个人技术博客`
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
})
