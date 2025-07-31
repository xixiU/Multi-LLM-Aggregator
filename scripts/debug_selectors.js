// 调试选择器脚本
// 在浏览器控制台中运行此脚本来测试选择器

function debugSelectors() {
    const platforms = {
        'ChatGPT': {
            textArea: 'textarea#prompt-textarea',
            sendButton: 'button[data-testid="send-button"]',
            responseContainer: 'div.markdown'
        },
        'Gemini': {
            richTextInput: 'div[contenteditable="true"]',
            sendButton: 'button[aria-label="Send message"], button[data-testid="send-button"]',
            responseContainer: 'div[data-testid="response-content"], .response-content'
        },
        'Kimi': {
            textArea: 'textarea[placeholder*="跟 Kimi 说点什么"], textarea[placeholder*="说点什么"], textarea',
            sendButton: 'button[type="submit"], button:has(svg), button',
            responseContainer: 'div[class*="bubble-content-wrapper"], div[class*="message-content"]'
        },
        'Grok': {
            textInput: 'div[data-testid="dmComposerTextInput"], div[contenteditable="true"], textarea',
            sendButton: 'button[data-testid="dmComposerSendButton"], button[aria-label*="发送"], button[aria-label*="Send"]',
            responseContainer: 'div[data-testid="conversation-turn-text"], div[class*="message"], div[class*="response"]'
        }
    };

    console.log('=== 选择器调试结果 ===');

    for (const [platform, selectors] of Object.entries(platforms)) {
        console.log(`\n--- ${platform} ---`);
        for (const [name, selector] of Object.entries(selectors)) {
            const elements = document.querySelectorAll(selector);
            console.log(`${name}: ${elements.length} 个元素找到`);
            if (elements.length > 0) {
                console.log('  第一个元素:', elements[0]);
            }
        }
    }
}

// 自动运行调试
debugSelectors(); 