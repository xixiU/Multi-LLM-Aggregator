// Filename: scripts/content_chatgpt.js

// 1. 定义选择器 (未来失效时，主要修改这里)
const SELECTORS = {
  textArea: 'div#prompt-textarea[contenteditable="true"]',
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

  if (!textArea) {
    sendResult("错误：无法在 ChatGPT 页面找到输入框。");
    return;
  }

  // 填入问题并模拟真实输入事件
  textArea.textContent = prompt;
  textArea.dispatchEvent(new Event('input', { bubbles: true }));

  // 触发更多事件确保界面更新
  textArea.dispatchEvent(new Event('keyup', { bubbles: true }));
  textArea.dispatchEvent(new Event('change', { bubbles: true }));

  // 等待发送按钮出现
  let sendButton = null;
  let attempts = 0;
  const maxAttempts = 10; // 最多等待2秒

  while (!sendButton && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 200));
    sendButton = document.querySelector(SELECTORS.sendButton);
    attempts++;
  }

  if (!sendButton) {
    sendResult("错误：发送按钮未出现，请检查输入框是否正确填入内容。");
    return;
  }

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