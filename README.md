# Multi LLM Comparator Chrome Extension

A Chrome browser extension that allows you to send the same question to multiple AI models (ChatGPT, Gemini, Kimi, Grok) simultaneously and compare their responses in real-time.

[🇨🇳 中文版本 README](README_CN.md)

<https://github.com/user-attachments/assets/d80fc4a4-6594-4716-abca-38919dda00eb>

## 📋 Development Roadmap

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| ✅ Basic AI Integration | Completed | High | ChatGPT, Gemini, Kimi, Grok |
| ✅ AI Toggle Controls | Completed | High | Enable/disable individual AIs |
| ✅ Dynamic Result Display | Completed | High | Show/hide based on enabled AIs |
| 🔄 Gemini Script Optimization | In Progress | High | Improving response capture |
| 🔄 Internationalization | In Progress | Medium | English/Chinese language support |
| ⏳ Kimi Integration | Pending | Medium | Full implementation needed |
| ⏳ Grok Integration | Pending | Medium | Full implementation needed |
| ⏳ Front-end and back-end split| Pending | Medium | Full implementation needed |
| ⏳ Response Streaming | Pending | Low | Real-time response updates |
| ⏳ Export Functionality | Pending | Low | Save comparisons to file |
| ⏳ Custom AI Addition | Pending | Low | Support for more AI models |

**Legend:** ✅ Completed | 🔄 In Progress | ⏳ Pending

## 🚀 Quick Start

1. Clone or download this project
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project directory
5. Make sure the following AI platforms are logged in and accessible:
   - [ChatGPT](https://chat.openai.com)
   - [Gemini](https://gemini.google.com)
   - [Kimi](https://kimi.moonshot.cn)
   - [Grok](https://x.com/i/grok)
6. Click the extension icon to open the main interface in a new tab
7. Enter your question and click "Send to All AI" to get responses from multiple models

## ✨ Features

- **Large Interface**: Opens in a new tab for better user experience
- **Real-time Status**: Shows connection status for each AI platform
- **AI Toggle Controls**: Enable/disable individual AI models
- **One-click Copy**: Easily copy AI responses
- **Keyboard Shortcuts**: Ctrl+Enter to send questions quickly
- **Clear Results**: One-click to clear all responses
- **Responsive Design**: Works on different screen sizes

## ⚠️ Important Notes

- Ensure all AI pages are logged in and allow extension content script injection
- You can modify the monitoring logic to improve accuracy or adapt to future model updates
- The extension requires proper permissions to interact with AI websites

## 🔧 Troubleshooting

If the extension doesn't work properly, follow these debugging steps:

1. **Check Tabs**: Make sure the following pages are open and logged in:
   - [ChatGPT](https://chat.openai.com)
   - [Gemini](https://gemini.google.com)
   - [Kimi](https://kimi.moonshot.cn)
   - [Grok](https://x.com/i/grok)

2. **Check Console Logs**:
   - Open Chrome Developer Tools (F12)
   - Go to Extensions page (`chrome://extensions/`) and click "Inspect views"
   - Check the Console tab for log information

3. **Test Selectors**:
   - Open Developer Tools on any AI page
   - Run in Console: `copy(debugSelectors())`
   - Check if selectors can find the correct elements

4. **Common Issues**:
   - If "Tab not found" appears, ensure URLs match exactly
   - If "Selector failed" appears, check if page structure has changed
   - If "Cannot inject script" appears, check extension permissions

## 🏗️ Technical Architecture

- **Background Script**: Manages tab communication and script injection
- **Content Scripts**: Interact with each AI platform's interface
- **Popup Interface**: Main user interface in a new tab
- **Storage API**: Saves user preferences and AI toggle states

## Support the Developer

If this extension is helpful to you, please consider supporting my development work through PayPal:

[![PayPal](https://img.shields.io/badge/PayPal-Support%20Development-blue?style=for-the-badge&logo=paypal)](https://paypal.me/JackYuan674)

**[Click here to donate via PayPal](https://paypal.me/JackYuan674)**

Your support will help me:

- Continuously maintain and improve this extension
- Adapt to new AI platforms and feature updates
- Develop more useful tools

Thank you for your support and usage! 🙏
