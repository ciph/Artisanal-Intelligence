# Human-AI Hybrid Agent

霄 · 真人 AI 智能体。面向音乐制作、游戏音频与 AI 应用的真人协作服务介绍页。

Human-led, AI-assisted collaboration for music production, game audio, and AI applications.

## 本地查看

下载或克隆仓库后，在浏览器中打开 `human-agent.html`。请保留 `assets/` 目录与 HTML 的相对位置，无需安装依赖或构建。

## 页面内容

- 工作方式与可讨论的协作场景。
- 三档协作时间包的参考报价与开始前需要确认的事项。
- 需求消息实时预览、复制与本地 TXT 保存。
- 响应式布局、键盘焦点、减少动效和无脚本时的禁用保护。

当前为服务方案预览，联系方式暂未公开，不提供付款、消息发送或自动预约。填写内容只在当前页面处理，不会自动保存或上传。

## 文件结构

```text
human-agent.html              页面内容与报价数据
assets/human-agent.css        页面样式与响应式布局
assets/human-agent.js         需求整理与页面交互
assets/creative-tim-ui.css    本地 UI 组件样式
assets/fonts/                Geist 字体及许可证
assets/licenses/             第三方组件许可证
DESIGN.md                    设计约定与验证说明
THIRD_PARTY_NOTICES.md        第三方资源来源与声明
```

历史页面草稿和未使用的旧字体不包含在仓库中。

## 检查

JavaScript 语法可用 Node.js 检查：

```sh
node --check assets/human-agent.js
```

已完成静态资源、页面结构和脚本逻辑检查；真实浏览器视觉与交互验证的范围见 `DESIGN.md`。

## 第三方资源

页面使用 Creative Tim UI 的静态样式适配和 Geist 字体。相关来源与许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
