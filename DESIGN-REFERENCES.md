# 视觉与交互参考

2026-10-16 从用户指定的 https://codepen.io/trending 入口浏览。网站继续保留原有白底、墨绿品牌、函数课程与本机学习记录。这是既有站点的视觉演进，未改路由或题目答案。

## 参考条目

- [CSS Card with moving graphic in border Animation — Jaime](https://codepen.io/editor/jq/pen/01a13640-3268-7bde-94cd-7965c1fd1f83)：浏览了编辑器预览和可见 CSS 片段。参考边缘强调与短促背景扫光的表现；本站按钮扫光、选中节点边框使用独立 CSS 实现，没有复制卡片文案、图片或外部脚本。CodePen 编辑器完整源码在本次浏览器中无法直接读取。
- [Vanilla Sudoku: 6 Themes, No Frameworks — Paul](https://codepen.io/editor/Maseone/pen/01a13c94-f937-71b2-aa2f-f0954d618072)：浏览轻量数独预览的难度切换、状态区和提示入口，参考分段控制与柔和背景层次，没有导入数独代码。
- [CSS Animated SVG Progress Bars — MandyMadeThis](https://codepen.io/MandyMadeThis/pen/gwpLmg)：阅读公开 HTML/CSS 示例，参考 SVG 圆环的笔画进度表达。本站 ProgressRing.jsx 采用两个 circle、pathLength=100、实际答题分数驱动 strokeDashoffset 的独立 React 实现。
- [CSS Animated Checkmark — Dario Corsi](https://codepen.io/dariocorsi/pen/rZLREm)：阅读公开 CSS/JS 示例，参考正确结果的短暂描边反馈。本站继续使用已有 lucide-react Check 图标，以本地 CSS 动画绘制反馈，不导入示例的 DOM 替换脚本。

## 本地实现与约束

- `src/polish.css` 集中维护视觉层，包含导航、卡片、课程、答题、记录、实验室与 dialog 样式。
- `src/components/ProgressRing.jsx` 是真实进度的 SVG 组件，使用原题库和独立作答规则计算；未伪造进度。
- 页面、选项、正确标志的动画只执行一次，按钮扫光只在 hover/focus 触发；没有持续背景动画。
- 系统 prefers-reduced-motion 下关闭动画和过渡；触控不依赖 hover；原有 radio、button、label、focus-visible 与提示语义保留。
- 不嵌入 CodePen iframe，不增加远程字体、远程图片、第三方 JS 或新 npm 依赖。
