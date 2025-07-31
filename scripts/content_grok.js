// Filename: scripts/content_grok.js

// 警告：这些选择器是推测性的，极有可能需要你手动查找和修改
const SELECTORS = {
    // Grok的输入框可能是一个有特定aria-label的div
    textInput: 'div[data-testid="dmComposerTextInput"]',
    sendButton: 'button[data-testid="dmComposerSendButton"]',
    // 回答可能在带有 'conversation-turn' testid 的 div 中
    responseContainer: 'div[data-testid="conversation-turn-text"]'
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'startQuery') {
        sendResponse({ status: "Grok query received" });
        submitPrompt(message.prompt);
    }
    return true;
});

async function submitPrompt(prompt) {
    const inputDiv = document.querySelector(SELECTORS.textInput);
    const sendButton = document.querySelector(SELECTORS.sendButton);

    if (!inputDiv || !sendButton) {
        sendResult("错误：无法在 Grok 页面找到输入框或发送按钮 (选择器可能已失效)。");
        return;
    }

    inputDiv.innerText = prompt;
    inputDiv.dispatchEvent(new Event('input', { bubbles: true }));

    await new Promise(resolve => setTimeout(resolve, 500));

    if (!sendButton.disabled) {
        sendButton.click();
        observeResponse();
    } else {
        sendResult("错误：Grok 发送按钮不可用或被禁用。");
    }
}

function observeResponse() {
    let lastResponseCount = document.querySelectorAll(SELECTORS.responseContainer).length;

    const observer = new MutationObserver((mutations, obs) => {
        const currentResponseCount = document.querySelectorAll(SELECTORS.responseContainer).length;

        // X.com的DOM非常动态，需要复杂的逻辑来判断是否在加载
        // 一个简化的逻辑是：当出现新的回答时，我们稍等一下，然后抓取
        if (currentResponseCount > lastResponseCount) {
            // 等待一小段时间，让内容完全渲染
            setTimeout(() => {
                const allResponses = document.querySelectorAll(SELECTORS.responseContainer);
                const lastResponse = allResponses[allResponses.length - 1];
                sendResult(lastResponse.innerText.trim());
                obs.disconnect();
            }, 2000); // 等待2秒
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
        observer.disconnect();
        sendResult("错误：Grok 回答超时或抓取失败。");
    }, 30000);
}

function sendResult(text) {
    chrome.runtime.sendMessage({
        type: 'aiResponse',
        source: 'grok',
        answer: text
    });
}
