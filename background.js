const aiTargets = {
    'chatgpt': { url: "https://chatgpt.com/*", script: "scripts/content_chatgpt.js" },
    'gemini': { url: "https://gemini.google.com/*", script: "scripts/content_gemini.js" },
    'kimi': { url: "https://kimi.moonshot.cn/*", script: "scripts/content_kimi.js" },
    'grok': { url: "https://x.com/i/grok", script: "scripts/content_grok.js" }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'queryAI') {
        const target = aiTargets[message.target];
        if (!target) return;

        // 查找对应的AI标签页
        chrome.tabs.query({ url: target.url }, (tabs) => {
            if (tabs.length > 0) {
                const targetTab = tabs[0];
                // 注入并执行内容脚本
                chrome.scripting.executeScript({
                    target: { tabId: targetTab.id },
                    files: [target.script]
                }, () => {
                    // 脚本注入后，发送问题给它
                    chrome.tabs.sendMessage(targetTab.id, {
                        type: 'startQuery',
                        prompt: message.prompt
                    });
                });
            } else {
                // 如果找不到标签页，可以发送一个错误信息回UI
                chrome.runtime.sendMessage({
                    type: 'aiResponse',
                    source: message.target,
                    answer: '错误：请先在浏览器中打开并登录 ' + target.url.replace('/*', '')
                });
            }
        });
    }
    // 返回true以表明我们将异步发送响应
    return true;
});
