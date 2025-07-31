// 点击扩展图标时打开主页面
document.addEventListener('DOMContentLoaded', () => {
  // 打开主页面
  chrome.tabs.create({
    url: chrome.runtime.getURL('main.html')
  });

  // 关闭popup
  window.close();
});

// 监听来自 background.js 的结果
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'aiResponse') {
    const contentDiv = document.querySelector(`#${message.source}-result .content`);
    contentDiv.textContent = message.answer;
  }
});