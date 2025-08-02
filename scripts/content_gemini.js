// Filename: scripts/content_gemini.js

// 防止脚本重复注入
if (window.geminiContentScriptLoaded) {
  console.log('Gemini content script 已经加载，跳过重复执行');
} else {
  window.geminiContentScriptLoaded = true;
  console.log('Gemini content script 开始加载');

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
      // 更新的Gemini回答选择器 - 基于最新的页面结构
      const selectors = [
        // 最新的Gemini回答选择器
        'message-content .markdown',
        'message-content',
        '.model-response-text',
        'div[data-testid*="conversation-turn"] .markdown',
        'div[data-testid*="conversation-turn"]',
        '[class*="model-response"]',
        '[class*="response-content"]',
        // 兜底选择器
        '.markdown:last-of-type',
        'div[class*="conversation"]:last-child div:not([class*="input"])',
      ];

      let responseElement = null;
      let foundSelector = '';

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // 取最后一个元素，通常是最新的回答
          responseElement = elements[elements.length - 1];
          const content = responseElement.innerText.trim();

          console.log(`Gemini: 尝试选择器 ${selector}, 找到 ${elements.length} 个元素, 内容长度: ${content.length}`);
          console.log(`Gemini: 内容预览: "${content.substring(0, 100)}..."`);

          if (content.length > 5) { // 降低长度要求
            foundSelector = selector;
            break;
          }
        }
      }

      if (responseElement && foundSelector) {
        const currentContent = responseElement.innerText.trim();

        console.log(`Gemini: 使用选择器找到回答: ${foundSelector}`);
        console.log(`Gemini: 当前内容长度: ${currentContent.length}`);
        console.log(`Gemini: 内容: "${currentContent.substring(0, 200)}..."`);

        // 检查内容是否有实质性变化
        if (currentContent && currentContent !== lastContent && currentContent.length > 5) {
          lastContent = currentContent;

          // 检查是否还在生成中
          const isGenerating = document.querySelector('.loading, .spinner, div[class*="thinking"], div[class*="generating"]') ||
            currentContent.endsWith('...') ||
            currentContent.endsWith('▋') ||
            currentContent.endsWith('|') ||
            currentContent.includes('正在思考') ||
            currentContent.includes('生成中');

          console.log(`Gemini: 是否还在生成: ${isGenerating}`);

          if (!isGenerating && !hasResponse) {
            hasResponse = true;
            console.log('Gemini: 检测到回答完成，发送结果');
            sendResult(currentContent);
            obs.disconnect();
          } else if (!hasResponse) {
            // 如果还在生成，等待一下再检查
            console.log('Gemini: 回答还在生成中，继续等待...');
          }
        }
      } else {
        console.log('Gemini: 未找到回答元素');
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // 增加超时时间，并提供更好的错误处理
    setTimeout(() => {
      observer.disconnect();

      if (!hasResponse) {
        console.log('Gemini: 超时，尝试最后一次获取回答');

        // 最后尝试获取任何看起来像回答的内容
        const allSelectors = [
          'message-content',
          '.markdown',
          'div[class*="conversation"]',
          'div[class*="message"]',
          'div[class*="response"]',
          'div[data-testid*="turn"]'
        ];

        let finalResponse = '';
        let finalSelector = '';

        for (const selector of allSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.innerText.trim();
            if (text && text.length > finalResponse.length && text.length > 5) {
              finalResponse = text;
              finalSelector = selector;
            }
          }
        }

        console.log(`Gemini: 最终尝试找到内容，选择器: ${finalSelector}, 长度: ${finalResponse.length}`);

        if (finalResponse && finalResponse.length > 5) {
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

} // 结束防重复注入的检查
