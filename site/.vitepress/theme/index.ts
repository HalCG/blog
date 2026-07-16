import { watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

const SIDEBAR_WIDTH_KEY = 'vitepress-sidebar-width'
const SIDEBAR_MIN_WIDTH = 200
const SIDEBAR_MAX_WIDTH = 500

function initSidebarResize() {
  if (typeof document === 'undefined') return

  // 从 localStorage 恢复用户上次拖拽的宽度（优先于 CSS 的 clamp 默认值）
  const savedWidth = localStorage.getItem(SIDEBAR_WIDTH_KEY)
  if (savedWidth) {
    const width = Number(savedWidth)
    if (width >= SIDEBAR_MIN_WIDTH && width <= SIDEBAR_MAX_WIDTH) {
      document.documentElement.style.setProperty('--vp-sidebar-width', `${width}px`)
    }
  }

  // 读取当前 CSS 变量值（px 数值），而非 DOM 渲染宽度
  // 这样可以避免 VitePress 的复杂 calc() 导致 rendered width ≠ --vp-sidebar-width
  const getCurrentVarWidth = (): number => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--vp-sidebar-width').trim()
    const px = parseFloat(raw)
    return Number.isFinite(px) ? px : 272
  }

  // 等待 VPSidebar 渲染后挂载拖拽手柄
  const mountHandle = () => {
    const sidebar = document.querySelector('.VPSidebar') as HTMLElement | null
    if (!sidebar) {
      setTimeout(mountHandle, 100)
      return
    }

    // 避免重复挂载
    if (sidebar.querySelector('.sidebar-resize-handle')) return

    const handle = document.createElement('div')
    handle.className = 'sidebar-resize-handle'
    sidebar.appendChild(handle)

    let startX = 0
    let startWidth = 0       // CSS 变量初始值（px）
    let dragging = false

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      dragging = true
      startX = e.clientX
      // 关键修复：用 CSS 变量值作为基准，而非 getBoundingClientRect
      startWidth = getCurrentVarWidth()
      handle.classList.add('dragging')
      document.body.classList.add('sidebar-resizing')

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return
      const delta = e.clientX - startX
      const newWidth = Math.round(
        Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, startWidth + delta))
      )
      document.documentElement.style.setProperty('--vp-sidebar-width', `${newWidth}px`)
    }

    const onMouseUp = () => {
      if (!dragging) return
      dragging = false
      handle.classList.remove('dragging')
      document.body.classList.remove('sidebar-resizing')

      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)

      // 保存最终宽度（用 CSS 变量值，而非渲染宽度）
      const finalWidth = getCurrentVarWidth()
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(finalWidth)))
    }

    handle.addEventListener('mousedown', onMouseDown)
  }

  setTimeout(mountHandle, 200)
}

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute()

    // 监听路由变化：如果返回首页，立即收起左侧所有文章目录分组
    watch(
      () => route.path,
      async (path) => {
        if (path === '/' || path === '/index.html') {
          await nextTick()
          if (typeof document !== 'undefined') {
            const openSections = document.querySelectorAll(
              '.VPSidebarItem:not(.collapsed) > .item'
            )
            openSections.forEach((section) => {
              const caret = section.querySelector('.caret')
              if (caret) {
                // 模拟点击折叠按钮
                (caret as HTMLElement).click()
              }
            })
          }
        }
      },
      { immediate: true }
    )

    // 初始化侧边栏拖拽调整宽度
    initSidebarResize()
  }
}
