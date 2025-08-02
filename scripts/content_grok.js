// Filename: scripts/content_grok.js

// 防止脚本重复注入
if (window.grokContentScriptLoaded) {
    console.log('Grok content script 已经加载，跳过重复执行');
} else {
    window.grokContentScriptLoaded = true;
    console.log('Grok content script 开始加载');

    // Grok/X.com的选择器 - 可能需要根据实际界面调整
    const SELECTORS = {
        // Grok的输入框选择器
        textInput: 'div[data-testid="dmComposerTextInput"], div[contenteditable="true"], textarea',
        sendButton: 'button[data-testid="dmComposerSendButton"], button[aria-label*="发送"], button[aria-label*="Send"]',
        // 回答容器选择器
        responseContainer: 'div[data-testid="conversation-turn-text"], div[class*="message"], div[class*="response"]'
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

} // 结束防重复注入的检查
