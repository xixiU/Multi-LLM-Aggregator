# Multi LLM Comparator Chrome 扩展

一个 Chrome 浏览器扩展，可在你已打开并登录的 ChatGPT、Gemini、Kimi、Grok 页面上发送同一问题，实时返回并对比多个模型的答案。

[🇺🇸 English README](README.md)

![操作演示](https://raw.githubusercontent.com/xixiU/Multi-LLM-Comparator/refs/heads/master/assets/operation.mov)

## 📋 开发计划

| 功能 | 状态 | 优先级 | 备注 |
|------|------|--------|------|
| ✅ 基础AI集成 | 已完成 | 高 | ChatGPT, Gemini, Kimi, Grok |
| ✅ AI开关控制 | 已完成 | 高 | 启用/禁用单个AI |
| ✅ 动态结果显示 | 已完成 | 高 | 根据启用状态显示/隐藏 |
| 🔄 Gemini脚本优化 | 进行中 | 高 | 改进回答抓取 |
| 🔄 国际化支持 | 进行中 | 中 | 中英文语言支持 |
| ⏳ Kimi集成 | 待办 | 中 | 需要完整实现 |
| ⏳ Grok集成 | 待办 | 中 | 需要完整实现 |
| ⏳ 前后端拆分 | 待办 | 中 | 需要完整实现 |
| ⏳ 流式响应 | 待办 | 低 | 实时响应更新 |
| ⏳ 导出功能 | 待办 | 低 | 保存对比结果到文件 |
| ⏳ 自定义AI | 待办 | 低 | 支持更多AI模型 |

**图例：** ✅ 已完成 | 🔄 进行中 | ⏳ 待办

## 🚀 快速开始

1. 克隆或下载此项目
2. 打开 Chrome，进入 `chrome://extensions`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择项目目录
5. 保持以下AI平台已登录并可访问：
   - [ChatGPT](https://chat.openai.com)
   - [Gemini](https://gemini.google.com)
   - [Kimi](https://kimi.moonshot.cn)
   - [Grok](https://x.com/i/grok)
6. 点击扩展图标在新标签页中打开主界面
7. 输入问题并点击「发送给所有AI」获取多模型回答

## ✨ 功能特性

- **大界面**：在新标签页中打开，提供更好的用户体验
- **实时状态**：显示各个AI平台的连接状态
- **AI开关控制**：启用/禁用单个AI模型
- **一键复制**：轻松复制AI回答
- **快捷键**：Ctrl+Enter 快速发送问题
- **清空结果**：一键清空所有回答
- **响应式设计**：适配不同屏幕尺寸

## ⚠️ 注意事项

- 确保所有AI页面已登录并允许扩展注入内容脚本
- 可自行修改监听逻辑提升准确性或适配后续模型更新
- 扩展需要适当的权限才能与AI网站交互

## 🔧 故障排除

如果扩展无法正常工作，可以按以下步骤调试：

1. **检查标签页**：确保已打开并登录以下页面：
   - [ChatGPT](https://chat.openai.com)
   - [Gemini](https://gemini.google.com)
   - [Kimi](https://kimi.moonshot.cn)
   - [Grok](https://x.com/i/grok)

2. **查看控制台日志**：
   - 打开Chrome开发者工具 (F12)
   - 在扩展管理页面 (`chrome://extensions/`) 点击"检查视图"
   - 查看Console标签页的日志信息

3. **测试选择器**：
   - 在任意AI页面打开开发者工具
   - 在Console中运行：`copy(debugSelectors())`
   - 查看选择器是否能找到正确的元素

4. **常见问题**：
   - 如果显示"找不到标签页"，请确保URL完全匹配
   - 如果显示"选择器失效"，请检查页面结构是否发生变化
   - 如果显示"无法注入脚本"，请检查扩展权限设置

## 🏗️ 技术架构

- **后台脚本**：管理标签页通信和脚本注入
- **内容脚本**：与各AI平台界面交互
- **弹窗界面**：新标签页中的主用户界面
- **存储API**：保存用户偏好和AI开关状态

## 支持开发者

如果这个扩展对您有帮助，欢迎通过PayPal支持我的开发工作：

[![PayPal](https://img.shields.io/badge/PayPal-支持开发-blue?style=for-the-badge&logo=paypal)](https://paypal.me/JackYuan674)

**[点击这里通过PayPal捐赠](https://paypal.me/JackYuan674)**

![微信捐赠](assets/wechat-qr.JPG)

您的支持将帮助我：

- 持续维护和改进此扩展
- 适配新的AI平台和功能更新
- 开发更多有用的工具

感谢您的支持和使用！🙏
