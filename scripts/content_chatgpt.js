// Filename: scripts/content_chatgpt.js

// 1. 定义选择器 (未来失效时，主要修改这里)
const SELECTORS = {
  textArea: 'div#prompt-textarea[contenteditable="true"]',
  sendButton: 'button[data-testid="send-button"]',
  // 抓取完整的markdown容器，避免截断
  responseContainer: 'div[data-message-author-role="assistant"] div.markdown.prose',
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

// 4. 监听并抓取回答（支持实时流式更新）
function observeResponse() {
  let lastSentContent = '';
  let updateTimer = null;
  let hasCompletedOnce = false; // 防止重复发送完成消息

  const observer = new MutationObserver((mutations, obs) => {
    // 检查是否有内容更新
    const responseElements = document.querySelectorAll(SELECTORS.responseContainer);
    if (responseElements.length > 0) {
      const lastResponse = responseElements[responseElements.length - 1];
      const currentContent = extractCleanText(lastResponse);

      // 如果内容有变化且不为空，发送更新
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
          console.log('ChatGPT: 发送流式更新，内容长度:', currentContent.length);
          sendStreamingResult(currentContent, false); // false 表示还在生成中
        }, 200); // 减少到200ms防抖，提高响应速度
      }
    }

    // 判断AI是否已停止生成：寻找"停止生成"按钮是否消失
    const stopButton = document.querySelector(SELECTORS.stopGeneratingButton);
    if (!stopButton && !hasCompletedOnce) {
      // 停止按钮已消失，说明回答已完成
      console.log('ChatGPT: 检测到停止生成按钮消失，准备发送最终结果');
      hasCompletedOnce = true; // 标记为已完成，防止重复发送

      if (updateTimer) {
        clearTimeout(updateTimer);
      }

      const responseElements = document.querySelectorAll(SELECTORS.responseContainer);
      if (responseElements.length > 0) {
        const lastResponse = responseElements[responseElements.length - 1];
        const finalContent = extractCleanText(lastResponse);
        console.log('ChatGPT: 发送最终结果，内容长度:', finalContent.length);

        // 只有内容不为空才发送
        if (finalContent && finalContent.trim() !== '') {
          sendStreamingResult(finalContent, true); // true 表示已完成
        } else {
          console.log('ChatGPT: 最终内容为空，等待更多内容');
          hasCompletedOnce = false; // 重置标记，继续等待
          return;
        }
        obs.disconnect(); // 成功获取结果，停止监听
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 设置一个超时，以防万一
  setTimeout(() => {
    console.log('ChatGPT: 响应监听超时，尝试获取最终内容');
    observer.disconnect();
    if (updateTimer) {
      clearTimeout(updateTimer);
    }

    const responseElements = document.querySelectorAll(SELECTORS.responseContainer);
    if (responseElements.length > 0) {
      const lastResponse = responseElements[responseElements.length - 1];
      const finalContent = extractCleanText(lastResponse);
      console.log('ChatGPT: 超时时的内容长度:', finalContent.length);

      if (finalContent && finalContent.trim() !== "" && finalContent.length > 0) {
        console.log('ChatGPT: 超时发送最终内容');
        sendStreamingResult(finalContent, true);
      } else {
        console.log('ChatGPT: 超时且内容为空，发送错误消息');
        sendResult("错误：ChatGPT 回答超时或未能抓取到内容。");
      }
    } else {
      console.log('ChatGPT: 超时且没有找到响应元素');
      sendResult("错误：ChatGPT 回答超时或未能抓取到内容。");
    }
  }, 30000); // 30秒超时
}

// 5. 智能提取干净的文本内容
function extractCleanText(element) {
  if (!element) {
    console.log('ChatGPT: extractCleanText 收到空元素');
    return '';
  }

  console.log('ChatGPT: 开始提取内容，元素类型:', element.tagName, '内容预览:', element.textContent.substring(0, 100));

  // 创建一个元素的副本来处理
  const clonedElement = element.cloneNode(true);

  // 移除按钮容器，但保留内容区域
  const buttonsToRemove = clonedElement.querySelectorAll('button, [aria-label*="复制"], [aria-label*="编辑"], [aria-label*="Copy"], [aria-label*="Edit"]');
  buttonsToRemove.forEach(el => el.remove());

  // 移除代码块顶部的语言标签栏（但保留代码内容）
  const langLabels = clonedElement.querySelectorAll('.flex.items-center.text-token-text-secondary.px-4.py-2, .bg-token-sidebar-surface-primary.select-none.rounded-t-2xl');
  langLabels.forEach(label => label.remove());

  // 移除悬浮的工具栏（但保留主要内容）
  const floatingToolbars = clonedElement.querySelectorAll('.sticky.top-9, .absolute.end-0.bottom-0');
  floatingToolbars.forEach(toolbar => toolbar.remove());

  // 构建markdown文本
  let markdownText = '';

  // 处理子元素，保持markdown结构
  const children = clonedElement.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (child.tagName === 'P') {
      // 段落
      markdownText += child.innerText.trim() + '\n\n';
    } else if (child.tagName === 'H1' || child.tagName === 'H2' || child.tagName === 'H3') {
      // 标题
      const level = child.tagName[1];
      markdownText += '#'.repeat(level) + ' ' + child.innerText.trim() + '\n\n';
    } else if (child.tagName === 'PRE' || child.classList.contains('overflow-visible!')) {
      // 代码块
      const codeContent = child.querySelector('code');
      if (codeContent) {
        markdownText += '```\n' + codeContent.innerText.trim() + '\n```\n\n';
      }
    } else if (child.tagName === 'UL' || child.tagName === 'OL') {
      // 列表
      const items = child.querySelectorAll('li');
      items.forEach((item, index) => {
        const prefix = child.tagName === 'UL' ? '- ' : `${index + 1}. `;
        markdownText += prefix + item.innerText.trim() + '\n';
      });
      markdownText += '\n';
    } else if (child.tagName === 'BLOCKQUOTE') {
      // 引用
      markdownText += '> ' + child.innerText.trim() + '\n\n';
    } else if (child.tagName === 'HR') {
      // 分隔线
      markdownText += '---\n\n';
    } else {
      // 其他元素，直接提取文本
      const text = child.innerText.trim();
      if (text) {
        markdownText += text + '\n\n';
      }
    }
  }

  // 如果没有找到子元素，使用整体文本
  if (markdownText.trim() === '') {
    console.log('ChatGPT: 没有通过子元素提取到内容，使用整体文本');
    const fallbackText = clonedElement.innerText || clonedElement.textContent || '';
    console.log('ChatGPT: 回退文本内容:', fallbackText.substring(0, 200));
    markdownText = fallbackText;
  }

  console.log('ChatGPT: 提取的原始内容长度:', markdownText.length);

  // 进一步清理文本
  const cleanedText = cleanResponseText(markdownText);
  console.log('ChatGPT: 清理后的内容长度:', cleanedText.length, '预览:', cleanedText.substring(0, 100));
  return cleanedText;
}

// 6. 清理响应文本，去掉按钮文本和多余内容
function cleanResponseText(text) {
  // 常见的按钮文本模式（更全面的列表）
  const buttonTexts = [
    '复制', 'Copy', '编辑', 'Edit', '朗读', 'Read aloud',
    '复制代码', 'Copy code', '查看代码', 'View code',
    '运行', 'Run', '测试', 'Test', '下载', 'Download',
    '重新生成', 'Regenerate', '最佳回复', '错误回复',
    '共享', 'Share', '在画布中编辑', 'Edit in canvas',
    'bash', 'python', 'javascript', 'css', 'html', 'sql', 'json', 'xml'
  ];

  let cleanedText = text;

  // 去掉按钮文本（更精确的匹配）
  buttonTexts.forEach(buttonText => {
    // 匹配独立的按钮文本（前后有空白符或换行符）
    const regex = new RegExp(`(^|\\s|\\n)${buttonText}(\\s|\\n|$)`, 'gi');
    cleanedText = cleanedText.replace(regex, '$1$2');
  });

  // 特殊处理：去掉代码块语言标签行（如单独的"bash"、"python"等）
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

// 7. 发送流式结果回后台
function sendStreamingResult(text, isComplete) {
  console.log('ChatGPT: 准备发送消息到background，isComplete:', isComplete, '内容预览:', text.substring(0, 50));

  // 不期待回应，避免消息通道错误
  chrome.runtime.sendMessage({
    type: 'aiResponse',
    source: 'chatgpt',
    answer: text,
    isStreaming: !isComplete,
    isComplete: isComplete
  });

  console.log('ChatGPT: 消息已发送，isComplete:', isComplete);
}

// 8. 发送结果回后台（兼容性保留）
function sendResult(text) {
  chrome.runtime.sendMessage({
    type: 'aiResponse',
    source: 'chatgpt',
    answer: text,
    isStreaming: false,
    isComplete: true
  });
}