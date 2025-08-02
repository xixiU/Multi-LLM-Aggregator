// Filename: scripts/content_gemini.js

const SELECTORS = {
  // Gemini的输入框选择器 - 基于最新HTML结构
  richTextInput: '.ql-editor.textarea[contenteditable="true"], div.ql-editor[contenteditable="true"], div[role="textbox"]',
  sendButton: 'button.send-button, .send-button-container button, button[aria-label*="发送"], button[aria-label*="Send"]',
  // 回答容器选择器 - Gemini的回答区域
  responseContainer: 'message-content, .response-container, .model-response-text, div[data-testid*="response"], div[class*="conversation-turn"], div[class*="response"]',
  // 加载指示器
  loadingIndicator: '.loading, div[class*="loading"], .spinner, div[class*="thinking"]'
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

  // 查找输入框 - 使用更精确的选择器
  let inputDiv = document.querySelector('.ql-editor.textarea[contenteditable="true"]');
  if (!inputDiv) {
    inputDiv = document.querySelector('div.ql-editor[contenteditable="true"]');
  }
  if (!inputDiv) {
    inputDiv = document.querySelector('div[role="textbox"][contenteditable="true"]');
  }

  if (!inputDiv) {
    console.error('Gemini: 无法找到输入框');
    sendResult("错误：无法在 Gemini 页面找到输入框。请确保页面已完全加载。");
    return;
  }

  console.log('Gemini: 找到输入框，开始输入内容');

  try {
    // 清空输入框并设置新内容 (Gemini使用富文本格式)
    inputDiv.innerHTML = `<p>${prompt}</p>`;

    // 触发输入事件
    inputDiv.dispatchEvent(new Event('input', { bubbles: true }));
    inputDiv.dispatchEvent(new Event('change', { bubbles: true }));
    inputDiv.dispatchEvent(new Event('keyup', { bubbles: true }));

    // 等待发送按钮变为可用
    let sendButton = null;
    let attempts = 0;
    const maxAttempts = 20; // 最多等待4秒

    while (!sendButton && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 200));

      // 查找可用的发送按钮
      sendButton = document.querySelector('button.send-button:not([aria-disabled="true"])');
      if (!sendButton) {
        sendButton = document.querySelector('.send-button-container.visible button');
      }
      if (!sendButton) {
        sendButton = document.querySelector('button[aria-label*="发送"]:not([aria-disabled="true"])');
      }

      attempts++;
      console.log(`Gemini: 等待发送按钮可用... 尝试 ${attempts}/${maxAttempts}`);
    }

    if (!sendButton) {
      console.error('Gemini: 发送按钮未变为可用状态');
      sendResult("错误：Gemini 发送按钮未激活，请检查输入内容。");
      return;
    }

    console.log('Gemini: 发送按钮已就绪，点击发送');
    sendButton.click();
    observeResponse();

  } catch (error) {
    console.error('Gemini: 输入过程出错:', error);
    sendResult(`错误：输入过程出错 - ${error.message}`);
  }
}

function observeResponse() {
  console.log('Gemini: 开始监听回答...');
  let hasResponse = false;
  let lastContent = '';

  const observer = new MutationObserver((mutations, obs) => {
    // 查找回答内容的多种方式
    let responseElement = null;

    // 尝试不同的选择器查找回答
    const selectors = [
      'message-content',
      '.model-response-text',
      '[data-testid*="response"]',
      'div[class*="conversation-turn"]:last-child',
      'div[class*="response"]:last-child',
      '.response-container',
      // 通用选择器作为备选
      'div[data-test-id*="conversation-turn"]:last-child',
      'div:has(> p):last-of-type'
    ];

    for (const selector of selectors) {
      responseElement = document.querySelector(selector);
      if (responseElement && responseElement.innerText.trim().length > 10) {
        console.log(`Gemini: 使用选择器找到回答: ${selector}`);
        break;
      }
    }

    if (responseElement) {
      const currentContent = responseElement.innerText.trim();

      // 检查内容是否有实质性变化且不是空的
      if (currentContent && currentContent !== lastContent && currentContent.length > 10) {
        lastContent = currentContent;

        // 检查是否还在生成中（通常最后会有特殊字符或者停止标记）
        const isGenerating = document.querySelector('.loading, .spinner, div[class*="thinking"]') ||
          currentContent.endsWith('...') ||
          currentContent.endsWith('▋') ||
          currentContent.endsWith('|');

        if (!isGenerating && !hasResponse) {
          hasResponse = true;
          console.log('Gemini: 检测到回答完成');
          sendResult(currentContent);
          obs.disconnect();
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // 增加超时时间，因为Gemini有时响应较慢
  setTimeout(() => {
    observer.disconnect();

    if (!hasResponse) {
      // 最后尝试获取任何看起来像回答的内容
      const possibleResponses = document.querySelectorAll('div[class*="conversation"], div[class*="message"], div[class*="response"]');
      let finalResponse = '';

      for (const element of possibleResponses) {
        const text = element.innerText.trim();
        if (text && text.length > finalResponse.length) {
          finalResponse = text;
        }
      }

      if (finalResponse && finalResponse.length > 10) {
        sendResult(finalResponse);
      } else {
        sendResult("错误：Gemini 回答超时或未能抓取到内容。请检查页面是否正常工作。");
      }
    }
  }, 45000); // 45秒超时
}

function sendResult(text) {
  chrome.runtime.sendMessage({
    type: 'aiResponse',
    source: 'gemini',
    answer: text
  });
}
