// Filename: scripts/content_chatgpt.js

// 1. 定义选择器 (未来失效时，主要修改这里)
const SELECTORS = {
  textArea: 'textarea#prompt-textarea',
  sendButton: 'button[data-testid="send-button"]',
  responseContainer: 'div.markdown',
  regenerateButton: 'button[data-testid*="regenerate"]', // 用于判断回答是否结束
  stopGeneratingButton: 'button[data-testid*="stop-generating"]'
};

// 2. 监听后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startQuery') {
    // 确认收到消息，以便异步发送最终结果
    sendResponse({ status: "ChatGPT query received" });
    submitPrompt(message.prompt);
  }
  return true; // 保持消息通道开放
});

// 3. 提交问题
async function submitPrompt(prompt) {
  const textArea = document.querySelector(SELECTORS.textArea);
  const sendButton = document.querySelector(SELECTORS.sendButton);

  if (!textArea || !sendButton) {
    sendResult("错误：无法在 ChatGPT 页面找到输入框或发送按钮。");
    return;
  }

  // 填入问题并模拟真实输入事件
  textArea.value = prompt;
  textArea.dispatchEvent(new Event('input', { bubbles: true }));

  // 等待一小会儿，确保按钮可用
  await new Promise(resolve => setTimeout(resolve, 200));

  if (!sendButton.disabled) {
    sendButton.click();
    observeResponse(); // 开始监听回答
  } else {
    sendResult("错误：ChatGPT 发送按钮不可用。");
  }
}

// 4. 监听并抓取回答
function observeResponse() {
  const observer = new MutationObserver((mutations, obs) => {
    // 判断AI是否已停止生成：寻找“停止生成”按钮是否消失
    const stopButton = document.querySelector(SELECTORS.stopGeneratingButton);

    if (!stopButton) {
      // 停止按钮已消失，说明回答已完成
      const responseElements = document.querySelectorAll(SELECTORS.responseContainer);
      if (responseElements.length > 0) {
        const lastResponse = responseElements[responseElements.length - 1];
        sendResult(lastResponse.innerText.trim());
        obs.disconnect(); // 成功获取结果，停止监听
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 设置一个超时，以防万一
  setTimeout(() => {
    observer.disconnect();
    const responseElements = document.querySelectorAll(SELECTORS.responseContainer);
    if (responseElements.length > 0) {
      const lastResponse = responseElements[responseElements.length - 1];
      if (lastResponse.innerText.trim() !== "") {
        sendResult(lastResponse.innerText.trim());
      } else {
        sendResult("错误：ChatGPT 回答超时或未能抓取到内容。");
      }
    }
  }, 30000); // 30秒超时
}

// 5. 发送结果回后台
function sendResult(text) {
  chrome.runtime.sendMessage({
    type: 'aiResponse',
    source: 'chatgpt',
    answer: text
  });
}