// Filename: scripts/content_kimi.js

const SELECTORS = {
  textArea: 'textarea[placeholder*="跟 Kimi 说点什么"], textarea[placeholder*="说点什么"], textarea',
  sendButton: 'button[type="submit"], button:has(svg), button', // 更精确的按钮选择器
  // Kimi的回答容器
  responseContainer: 'div[class*="bubble-content-wrapper"], div[class*="message-content"]',
  stopGeneratingButton: 'button[class*="stop-button"], button[aria-label*="停止"]'
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startQuery') {
    sendResponse({ status: "Kimi query received" });
    submitPrompt(message.prompt);
  }
  return true;
});

async function submitPrompt(prompt) {
  const textArea = document.querySelector(SELECTORS.textArea);
  // Kimi的发送按钮可能没有唯一ID，我们找到输入框旁边的按钮
  const sendButton = textArea?.nextElementSibling;

  if (!textArea || !sendButton || sendButton.tagName !== 'BUTTON') {
    sendResult("错误：无法在 Kimi 页面找到输入框或发送按钮。");
    return;
  }

  textArea.value = prompt;
  textArea.dispatchEvent(new Event('input', { bubbles: true }));

  await new Promise(resolve => setTimeout(resolve, 200));

  if (!sendButton.disabled) {
    sendButton.click();
    observeResponse();
  } else {
    sendResult("错误：Kimi 发送按钮不可用。");
  }
}

function observeResponse() {
  const observer = new MutationObserver((mutations, obs) => {
    const stopButton = document.querySelector(SELECTORS.stopGeneratingButton);

    if (!stopButton) { // 回答完成
      const responseElements = document.querySelectorAll(SELECTORS.responseContainer);
      if (responseElements.length > 0) {
        const lastResponse = responseElements[responseElements.length - 1];
        sendResult(lastResponse.innerText.trim());
        obs.disconnect();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    observer.disconnect();
    const responseElements = document.querySelectorAll(SELECTORS.responseContainer);
    if (responseElements.length > 0) {
      const lastResponse = responseElements[responseElements.length - 1];
      if (lastResponse.innerText.trim() !== "") {
        sendResult(lastResponse.innerText.trim());
      } else {
        sendResult("错误：Kimi 回答超时或未能抓取到内容。");
      }
    }
  }, 30000);
}

function sendResult(text) {
  chrome.runtime.sendMessage({
    type: 'aiResponse',
    source: 'kimi',
    answer: text
  });
}