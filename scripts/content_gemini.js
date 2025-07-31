// Filename: scripts/content_gemini.js

const SELECTORS = {
  // Gemini的输入框选择器
  richTextInput: 'div[contenteditable="true"]',
  sendButton: 'button[aria-label="Send message"], button[data-testid="send-button"]',
  // 回答容器选择器
  responseContainer: 'div[data-testid="response-content"], .response-content',
  // 加载指示器
  loadingIndicator: '[data-testid="loading-indicator"], .loading-animation-container'
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startQuery') {
    sendResponse({ status: "Gemini query received" });
    submitPrompt(message.prompt);
  }
  return true;
});

async function submitPrompt(prompt) {
  const inputDiv = document.querySelector(SELECTORS.richTextInput);
  const sendButton = document.querySelector(SELECTORS.sendButton);

  if (!inputDiv || !sendButton) {
    sendResult("错误：无法在 Gemini 页面找到输入框或发送按钮。");
    return;
  }

  // 对富文本编辑器，需要这样设置内容
  inputDiv.innerHTML = `<p>${prompt}</p>`;
  inputDiv.dispatchEvent(new Event('input', { bubbles: true }));

  await new Promise(resolve => setTimeout(resolve, 200));

  if (sendButton && !sendButton.disabled) {
    sendButton.click();
    observeResponse();
  } else {
    sendResult("错误：Gemini 发送按钮不可用或被禁用。");
  }
}

function observeResponse() {
  let lastResponseCount = document.querySelectorAll(SELECTORS.responseContainer).length;

  const observer = new MutationObserver((mutations, obs) => {
    const currentResponseCount = document.querySelectorAll(SELECTORS.responseContainer).length;
    const isLoading = document.querySelector(SELECTORS.loadingIndicator);

    // 当出现新的回答，并且加载动画消失时，我们认为回答完成
    if (currentResponseCount > lastResponseCount && !isLoading) {
      const allResponses = document.querySelectorAll(SELECTORS.responseContainer);
      const lastResponse = allResponses[allResponses.length - 1];
      sendResult(lastResponse.innerText.trim());
      obs.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    observer.disconnect();
    const allResponses = document.querySelectorAll(SELECTORS.responseContainer);
    if (allResponses.length > lastResponseCount) {
      const lastResponse = allResponses[allResponses.length - 1];
      sendResult(lastResponse.innerText.trim());
    } else {
      sendResult("错误：Gemini 回答超时或未能抓取到内容。");
    }
  }, 30000); // 30秒超时
}

function sendResult(text) {
  chrome.runtime.sendMessage({
    type: 'aiResponse',
    source: 'gemini',
    answer: text
  });
}
