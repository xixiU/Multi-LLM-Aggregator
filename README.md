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
6. 点击浏览器扩展图标，输入问题，点击「发送」即可获取多模型回答。

## 注意事项

- 确保三个页面已登录并允许扩展注入内容脚本。
- 可自行修改监听逻辑提升准确性或适配后续模型更新。