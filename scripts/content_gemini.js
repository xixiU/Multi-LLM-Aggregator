// Filename: scripts/content_gemini.js

const SELECTORS = {
  // Gemini的输入框选择器 - 更新为最新的选择器
  richTextInput: 'div[contenteditable="true"], div.ql-editor, textarea, div[role="textbox"]',
  sendButton: 'button[aria-label*="Send"], button[data-testid="send-button"], button:has(svg), button[type="submit"]',
  // 回答容器选择器
  responseContainer: 'div[data-testid="response-content"], .response-content, .model-response-text, .markdown, div[class*="response"]',
  // 加载指示器
  loadingIndicator: '[data-testid="loading-indicator"], .loading-animation-container, .loading, div[class*="loading"]'
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'startQuery') {
    sendResponse({ status: "Gemini query received" });
    submitPrompt(message.prompt);
  }
  return true;
});

async function submitPrompt(prompt) {
  console.log('Gemini: 开始查找页面元素...');

  // 更详细的元素查找
  const allInputs = document.querySelectorAll('div[contenteditable="true"], textarea, div[role="textbox"]');
  const allButtons = document.querySelectorAll('button');

  console.log(`Gemini: 找到 ${allInputs.length} 个可能的输入框`);
  console.log(`Gemini: 找到 ${allButtons.length} 个按钮`);

  // 尝试不同的输入框选择器
  let inputDiv = null;
  for (const selector of SELECTORS.richTextInput.split(', ')) {
    inputDiv = document.querySelector(selector.trim());
    if (inputDiv) {
      console.log(`Gemini: 使用选择器找到输入框: ${selector}`);
      break;
    }
  }

  // 尝试不同的按钮选择器
  let sendButton = null;
  for (const selector of SELECTORS.sendButton.split(', ')) {
    sendButton = document.querySelector(selector.trim());
    if (sendButton) {
      console.log(`Gemini: 使用选择器找到按钮: ${selector}`);
      break;
    }
  }

  if (!inputDiv) {
    console.error('Gemini: 无法找到输入框，尝试查找最后一个可编辑元素');
    inputDiv = allInputs[allInputs.length - 1];
  }

  if (!sendButton) {
    console.error('Gemini: 无法找到发送按钮，尝试查找包含发送图标的按钮');
    sendButton = Array.from(allButtons).find(btn =>
      btn.getAttribute('aria-label')?.toLowerCase().includes('send') ||
      btn.textContent?.toLowerCase().includes('send') ||
      btn.querySelector('svg')
    );
  }

  if (!inputDiv || !sendButton) {
    const errorMsg = `错误：无法在 Gemini 页面找到${!inputDiv ? '输入框' : ''}${!inputDiv && !sendButton ? '和' : ''}${!sendButton ? '发送按钮' : ''}。`;
    console.error('Gemini:', errorMsg);
    sendResult(errorMsg);
    return;
  }

  console.log('Gemini: 找到输入框和发送按钮，开始输入内容');

  // 尝试多种输入方式
  try {
    // 方法1: 设置innerHTML
    if (inputDiv.innerHTML !== undefined) {
      inputDiv.innerHTML = `<p>${prompt}</p>`;
    }

    // 方法2: 设置textContent
    if (inputDiv.textContent !== undefined) {
      inputDiv.textContent = prompt;
    }

    // 方法3: 设置value (如果是textarea)
    if (inputDiv.value !== undefined) {
      inputDiv.value = prompt;
    }

    // 触发多种事件
    inputDiv.dispatchEvent(new Event('input', { bubbles: true }));
    inputDiv.dispatchEvent(new Event('change', { bubbles: true }));
    inputDiv.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('Gemini: 点击发送按钮');
    sendButton.click();
    observeResponse();
  } catch (error) {
    console.error('Gemini: 输入过程出错:', error);
    sendResult(`错误：输入过程出错 - ${error.message}`);
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
