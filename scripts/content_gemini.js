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
    let hasCompletedOnce = false; // 防止重复发送完成消息
    let lastSentContent = '';
    let updateTimer = null;

    const observer = new MutationObserver((mutations, obs) => {
      // 更精确的Gemini回答选择器，避免抓取侧边栏
      const selectors = [
        // 优先使用最精确的选择器，避免抓取侧边栏内容
        'model-response[data-model-slug] .model-response-text',
        'message-content[data-testid*="conversation-turn-"] .markdown',
        'message-content:not([class*="sidebar"]) .markdown',
        'div[data-testid*="conversation-turn"]:last-child .markdown',
        'div[data-testid*="conversation-turn"]:last-child message-content',
        // 确保不会选择侧边栏内容
        'main message-content .markdown:not([class*="sidebar"]):not([class*="navigation"])',
        'main div[class*="conversation-turn"]:last-child .response',
        // 兜底选择器，但要排除侧边栏
        '.markdown:not([class*="sidebar"]):not([class*="nav"]):last-of-type'
      ];

      let responseElement = null;
      let foundSelector = '';

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          // 过滤掉可能的侧边栏元素
          const filteredElements = Array.from(elements).filter(el => {
            const rect = el.getBoundingClientRect();
            const parentClasses = el.closest('[class*="sidebar"], [class*="navigation"], [class*="tab"]');
            // 排除明显是侧边栏的元素（位置、父容器等）
            return !parentClasses && rect.width > 200; // 侧边栏通常较窄
          });

          if (filteredElements.length > 0) {
            responseElement = filteredElements[filteredElements.length - 1];
            const content = extractCleanText(responseElement);

            console.log(`Gemini: 尝试选择器 ${selector}, 找到 ${filteredElements.length} 个有效元素, 内容长度: ${content.length}`);
            console.log(`Gemini: 内容预览: "${content.substring(0, 100)}..."`);

            if (content.length > 10) {
              foundSelector = selector;
              break;
            }
          }
        }
      }

      if (responseElement && foundSelector) {
        const currentContent = extractCleanText(responseElement);

        console.log(`Gemini: 使用选择器找到回答: ${foundSelector}`);
        console.log(`Gemini: 当前内容长度: ${currentContent.length}`);

        // 实现流式更新，类似ChatGPT
        if (currentContent &&
          currentContent.trim() !== '' &&
          currentContent !== lastSentContent &&
          currentContent.length > lastSentContent.length) {
          lastSentContent = currentContent;

          // 使用防抖，避免过于频繁的更新
          if (updateTimer) {
            clearTimeout(updateTimer);
          }
          updateTimer = setTimeout(() => {
            console.log('Gemini: 发送流式更新，内容长度:', currentContent.length);
            sendStreamingResult(currentContent, false); // false 表示还在生成中
          }, 300); // 防抖延迟
        }

        // 检查是否还在生成中：检测停止按钮
        const stopButton = document.querySelector('button[aria-label*="Stop"], button[title*="Stop"], mat-icon[fonticon="stop"], mat-icon[data-mat-icon-name="stop"], [class*="stop-generating"]');
        const isGenerating = !!stopButton;

        console.log(`Gemini: 是否还在生成: ${isGenerating}`);

        // 如果停止生成且还没有发送完成消息
        if (!isGenerating && !hasCompletedOnce) {
          hasCompletedOnce = true;
          console.log('Gemini: 检测到回答完成，发送最终结果');

          if (updateTimer) {
            clearTimeout(updateTimer);
          }

          if (currentContent && currentContent.trim() !== '') {
            sendStreamingResult(currentContent, true); // true 表示已完成
          }
          obs.disconnect();
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

    // 设置超时处理
    setTimeout(() => {
      console.log('Gemini: 响应监听超时，尝试获取最终内容');
      observer.disconnect();
      if (updateTimer) {
        clearTimeout(updateTimer);
      }

      if (!hasCompletedOnce) {
        // 最后尝试获取任何看起来像回答的内容
        const allSelectors = [
          'message-content .markdown',
          'message-content',
          '.markdown:not([class*="sidebar"])',
          'div[class*="conversation"]:last-child',
          'div[class*="message"]:last-child',
          'div[class*="response"]:last-child'
        ];

        let finalResponse = '';
        let finalSelector = '';

        for (const selector of allSelectors) {
          const elements = document.querySelectorAll(selector);
          const filteredElements = Array.from(elements).filter(el => {
            const parentClasses = el.closest('[class*="sidebar"], [class*="navigation"], [class*="tab"]');
            return !parentClasses && el.getBoundingClientRect().width > 200;
          });

          for (const element of filteredElements) {
            const text = extractCleanText(element);
            if (text && text.length > finalResponse.length && text.length > 10) {
              finalResponse = text;
              finalSelector = selector;
            }
          }
        }

        console.log(`Gemini: 最终尝试找到内容，选择器: ${finalSelector}, 长度: ${finalResponse.length}`);

        if (finalResponse && finalResponse.trim() !== '') {
          sendStreamingResult(finalResponse, true);
        } else {
          sendResult("错误：Gemini 回答超时或未能抓取到内容。请检查页面是否正常工作。");
        }
      }
    }, 30000); // 30秒超时，与ChatGPT一致
  }

  // 智能提取干净的文本内容（参考ChatGPT实现）
  function extractCleanText(element) {
    if (!element) {
      console.log('Gemini: extractCleanText 收到空元素');
      return '';
    }

    console.log('Gemini: 开始提取内容，元素类型:', element.tagName, '内容预览:', element.textContent.substring(0, 100));

    // 创建一个元素的副本来处理
    const clonedElement = element.cloneNode(true);

    // 移除按钮容器，但保留内容区域
    const buttonsToRemove = clonedElement.querySelectorAll('button, [aria-label*="复制"], [aria-label*="编辑"], [aria-label*="Copy"], [aria-label*="Edit"]');
    buttonsToRemove.forEach(el => el.remove());

    // 移除代码块顶部的语言标签栏
    const langLabels = clonedElement.querySelectorAll('.flex.items-center, .language-label, .code-header');
    langLabels.forEach(label => label.remove());

    // 移除悬浮的工具栏
    const floatingToolbars = clonedElement.querySelectorAll('.sticky, .absolute, .floating-toolbar');
    floatingToolbars.forEach(toolbar => toolbar.remove());

    // 获取清理后的文本
    const rawText = clonedElement.innerText || clonedElement.textContent || '';

    // 进一步清理文本
    const cleanedText = cleanResponseText(rawText);
    console.log('Gemini: 清理后的内容长度:', cleanedText.length, '预览:', cleanedText.substring(0, 100));
    return cleanedText;
  }

  // 清理响应文本，去掉按钮文本和多余内容
  function cleanResponseText(text) {
    // 常见的按钮文本模式
    const buttonTexts = [
      '复制', 'Copy', '编辑', 'Edit', '朗读', 'Read aloud',
      '复制代码', 'Copy code', '查看代码', 'View code',
      '运行', 'Run', '测试', 'Test', '下载', 'Download',
      '重新生成', 'Regenerate', '最佳回复', '错误回复',
      '共享', 'Share', '展开', 'Expand', '收起', 'Collapse',
      'bash', 'python', 'javascript', 'css', 'html', 'sql', 'json', 'xml'
    ];

    let cleanedText = text;

    // 去掉按钮文本
    buttonTexts.forEach(buttonText => {
      const regex = new RegExp(`(^|\\s|\\n)${buttonText}(\\s|\\n|$)`, 'gi');
      cleanedText = cleanedText.replace(regex, '$1$2');
    });

    // 特殊处理：去掉代码块语言标签行
    cleanedText = cleanedText.replace(/^(bash|python|javascript|css|html|sql|json|xml|typescript|java|cpp|c\+\+)$/gim, '');

    // 清理多余的空白符和换行
    cleanedText = cleanedText
      .replace(/\n\s*\n\s*\n+/g, '\n\n') // 减少多个连续换行
      .replace(/[ \t]+/g, ' ') // 将多个空格/制表符合并为一个空格
      .replace(/\n[ \t]+/g, '\n') // 去掉行开头的空格/制表符
      .replace(/[ \t]+\n/g, '\n') // 去掉行末尾的空格/制表符
      .replace(/^\s+|\s+$/g, '') // 去掉开头和结尾的空白符
      .trim();

    return cleanedText;
  }

  // 发送流式结果回后台
  function sendStreamingResult(text, isComplete) {
    console.log('Gemini: 准备发送消息到background，isComplete:', isComplete, '内容预览:', text.substring(0, 50));

    chrome.runtime.sendMessage({
      type: 'aiResponse',
      source: 'gemini',
      answer: text,
      isStreaming: !isComplete,
      isComplete: isComplete
    });

    console.log('Gemini: 消息已发送，isComplete:', isComplete);
  }

  function sendResult(text) {
    chrome.runtime.sendMessage({
      type: 'aiResponse',
      source: 'gemini',
      answer: text
    });
  }

} // 结束防重复注入的检查
