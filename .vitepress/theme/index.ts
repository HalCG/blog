import { watch, nextTick } from 'vue'
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  setup() {
    const route = useRoute()
    
    // 监听路由变化：如果返回首页，自动收起左侧所有文章目录分组
    watch(
      () => route.path,
      async (path) => {
        if (path === '/' || path === '/index.html') {
          await nextTick()
          setTimeout(() => {
            if (typeof document !== 'undefined') {
              const openSections = document.querySelectorAll(
                '.VPSidebarItem:not(.collapsed) > .item'
              )
              openSections.forEach((section) => {
                const caret = section.querySelector('.caret')
                if (caret) {
                  (caret as HTMLElement).click()
                }
              })
            }
          }, 100)
        }
      },
      { immediate: true }
    )
  }
}
