document.getElementById('submit-button').addEventListener('click', () => {
  const prompt = document.getElementById('prompt-input').value;
  if (!prompt) return;

  const ais = ['chatgpt', 'gemini', 'kimi', 'grok'];

  ais.forEach(ai => {
    // 清空旧结果并显示加载状态
    const contentDiv = document.querySelector(`#${ai}-result .content`);
    contentDiv.textContent = '正在等待 ' + ai + ' 的回答...';

    // 发送消息到 background.js
    chrome.runtime.sendMessage({
      type: 'queryAI',
      target: ai,
      prompt: prompt
    });
  });
});

// 监听来自 background.js 的结果
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'aiResponse') {
    const contentDiv = document.querySelector(`#${message.source}-result .content`);
    contentDiv.textContent = message.answer;
  }
});