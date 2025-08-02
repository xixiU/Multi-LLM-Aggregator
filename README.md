# Multi LLM Comparator Chrome Extension

这是一个 Chrome 浏览器扩展，可在你已打开并登录的 ChatGPT、Gemini、Kimi 页面上发送同一问题，实时返回并对比多个模型的答案。

## 使用方法

1. 克隆或解压此项目。
2. 打开 Chrome，进入 `chrome://extensions`。
3. 开启「开发者模式」。
4. 点击「加载已解压的扩展程序」，选择本目录。
5. 保持以下页面已登录并打开：
   - [ChatGPT](https://chat.openai.com)
   - [Gemini](https://gemini.google.com)
   - [Kimi](https://kimi.moonshot.cn)
   - [Grok](https://x.com/i/grok)
6. 点击浏览器扩展图标，将自动在新标签页中打开主界面。
7. 在主界面中输入问题，点击「发送给所有AI」即可获取多模型回答。

## 新功能

- **大界面**：在新标签页中打开，提供更大的操作空间
- **实时状态**：显示各个AI平台的连接状态
- **一键复制**：点击复制按钮可快速复制AI回答
- **快捷键**：Ctrl+Enter 快速发送问题
- **清空功能**：一键清空所有结果

## 注意事项

- 确保所有AI页面已登录并允许扩展注入内容脚本。
- 可自行修改监听逻辑提升准确性或适配后续模型更新。

## 调试方法

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

## 支持开发者

如果这个扩展对您有帮助，欢迎通过PayPal支持我的开发工作：

[![PayPal](https://img.shields.io/badge/PayPal-支持开发-blue?style=for-the-badge&logo=paypal)](https://paypal.me/JackYuan674)

**[点击这里通过PayPal捐赠](https://paypal.me/JackYuan674)**

您的支持将帮助我：

- 持续维护和改进此扩展
- 适配新的AI平台和功能更新
- 开发更多有用的工具

感谢您的支持和使用！🙏
