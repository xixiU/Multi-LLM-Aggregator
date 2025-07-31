const aiTargets = {
    'chatgpt': { url: "https://chatgpt.com/*", script: "scripts/content_chatgpt.js" },
    'gemini': { url: "https://gemini.google.com/*", script: "scripts/content_gemini.js" },
    'grok': { url: "https://x.com/i/grok", script: "scripts/content_grok.js" },
    'kimi': { url: "https://kimi.moonshot.cn/*", script: "scripts/content_kimi.js" }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);

    if (message.type === 'queryAI') {
        const target = aiTargets[message.target];
        if (!target) {
            console.error('Unknown AI target:', message.target);
            sendResponse({ error: 'Unknown AI target' });
            return;
        }

        console.log('Looking for tabs with URL:', target.url);

        // 先获取当前活跃的标签页，以便稍后切换回来
        chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
            const originalTab = activeTabs[0];
            console.log('Original active tab:', originalTab.id);

            // 查找对应的AI标签页
            chrome.tabs.query({ url: target.url }, (tabs) => {
                console.log('Found tabs:', tabs);
                if (tabs.length > 0) {
                    const targetTab = tabs[0];
                    console.log('Activating and injecting script into tab:', targetTab.id);

                    // 先激活标签页，确保页面在前台
                    chrome.tabs.update(targetTab.id, { active: true }, () => {
                        // 等待一小会儿确保页面激活
                        setTimeout(() => {
                            // 注入并执行内容脚本
                            chrome.scripting.executeScript({
                                target: { tabId: targetTab.id },
                                files: [target.script]
                            }, () => {
                                if (chrome.runtime.lastError) {
                                    console.error('Script injection error:', chrome.runtime.lastError);
                                    chrome.runtime.sendMessage({
                                        type: 'aiError',
                                        source: message.target,
                                        error: '无法注入脚本到标签页'
                                    });
                                    return;
                                }
                                console.log('Script injected, sending query to tab');
                                // 脚本注入后，发送问题给它
                                chrome.tabs.sendMessage(targetTab.id, {
                                    type: 'startQuery',
                                    prompt: message.prompt
                                }, (response) => {
                                    if (chrome.runtime.lastError) {
                                        console.error('Tab message error:', chrome.runtime.lastError);
                                        chrome.runtime.sendMessage({
                                            type: 'aiError',
                                            source: message.target,
                                            error: '无法发送消息到标签页'
                                        });
                                    }

                                    // 发送完成后，切换回原来的标签页
                                    if (originalTab && originalTab.id !== targetTab.id) {
                                        setTimeout(() => {
                                            chrome.tabs.update(originalTab.id, { active: true }, () => {
                                                console.log('Switched back to original tab:', originalTab.id);
                                            });
                                        }, 500); // 等待500ms确保消息发送完成
                                    }
                                });
                            });
                        });
                    } else {
                        console.log('No tabs found for URL:', target.url);
                        // 如果找不到标签页，可以发送一个错误信息回UI
                        chrome.runtime.sendMessage({
                            type: 'aiError',
                            source: message.target,
                            error: '请先在浏览器中打开并登录 ' + target.url.replace('/*', '')
                        });
                    }
        });
            sendResponse({ success: true });
        } else if (message.type === 'debugTabs') {
            // 调试：获取所有标签页
            chrome.tabs.query({}, (tabs) => {
                const tabInfo = tabs.map(tab => ({
                    id: tab.id,
                    url: tab.url,
                    title: tab.title
                }));
                console.log('所有标签页:', tabInfo);
                sendResponse({ tabs: tabInfo });
            });
            return true;
        } else if (message.type === 'checkConnection') {
            // 检查连接状态
            const target = aiTargets[message.target];
            if (!target) {
                sendResponse({ connected: false, message: '未知AI平台' });
                return;
            }

            console.log(`检查 ${message.target} 连接，URL模式: ${target.url}`);
            chrome.tabs.query({ url: target.url }, (tabs) => {
                console.log(`找到 ${tabs.length} 个匹配的标签页:`, tabs.map(t => t.url));
                const connected = tabs.length > 0;
                sendResponse({
                    connected: connected,
                    message: connected ? '已连接' : '未找到标签页'
                });
            });
            return true; // 保持消息通道开放
        } else if (message.type === 'aiResponse') {
            console.log('Forwarding AI response:', message);
            // 转发AI响应到popup
            chrome.runtime.sendMessage(message);
        } else if (message.type === 'aiError') {
            console.log('Forwarding AI error:', message);
            // 转发AI错误到popup
            chrome.runtime.sendMessage(message);
        }
        // 返回true以表明我们将异步发送响应
        return true;
    });
