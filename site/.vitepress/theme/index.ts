import { watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

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
  }
}
