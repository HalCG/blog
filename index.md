---
layout: home

hero:
  name: "图形学与软件开发"
  text: "技术探索与实践"
  tagline: "深耕 C++ · OpenGL · VTK · 计算几何 · 软件架构设计"
  actions:
    - theme: brand
      text: 开始阅读 OpenGL 专栏
      link: /OpenGL应用/OpenGL 深度测试及Early-Z详解
    - theme: alt
      text: GitHub 仓库
      link: https://github.com/HalCG/blog

features:
  - icon: 📐
    title: 计算机图形学
    details: 深入探讨渲染管线、着色器开发、离屏多重采样抗锯齿（MSAA）及裁剪几何算法，提供完备的代码与数学推导。
  - icon: 🚀
    title: VTK 科学可视化
    details: 包含三维体绘制、三维网格处理、Canny & Sobel 边缘检测，以及交互视景系统流程的底部分析。
  - icon: 🛠️
    title: Qt 界面集成与开发
    details: 集成 OpenGL 视口、自定义三维三维控件，深度剖析 Qt 的信号槽（Observer 模式）与 QObject 树形架构。
  - icon: 📖
    title: GoF 23种设计模式
    details: 逐个剖析李建忠老师设计模式课程，用 C++ 代码全面还原并对比设计原则、重构思想。
  - icon: 📚
    title: 程序员修炼笔记
    details: 《程序员修炼之道》与《软件设计哲学》的精读整理，归纳应对软件复杂度的实用工程理念。
  - icon: ⚡
    title: LaTeX 公式与极速体验
    details: 基于 Vite 极速打包，无缝支持数学公式的离线 SVG 渲染，带给您极佳的秒开级阅读体验。
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: linear-gradient(135deg, #646cff 0%, #42b883 100%);
  --vp-c-brand-1: #646cff;
  --vp-c-brand-2: #42b883;
}
.dark {
  --vp-home-hero-name-background: linear-gradient(135deg, #747bff 0%, #52c893 100%);
}
</style>
