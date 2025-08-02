const aiTargets = {
    'chatgpt': { url: "https://chatgpt.com/*", script: "scripts/content_chatgpt.js" },
    'gemini': { url: "https://gemini.google.com/*", script: "scripts/content_gemini.js" },
    'grok': { url: "https://x.com/i/grok", script: "scripts/content_grok.js" },
    'kimi': { url: "https://kimi.moonshot.cn/*", script: "scripts/content_kimi.js" }
};

// 标签页切换管理
let tabSwitchManager = {
    originalTabId: null,
    originalTabUrl: null,
    activeQueries: new Set(),
    switchScheduled: false,
    pendingQueries: new Map() // 存储待响应的查询
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
            console.log('Original active tab:', originalTab ? originalTab.id : 'none', 'URL:', originalTab ? originalTab.url : 'none');

            // 保存原始标签页信息（只在第一次查询时保存）
            if (!tabSwitchManager.originalTabId && originalTab) {
                tabSwitchManager.originalTabId = originalTab.id;
                tabSwitchManager.originalTabUrl = originalTab.url;
                console.log('Saved original tab for session:', tabSwitchManager.originalTabId);
            }

            // 将当前查询添加到活动查询集合和待响应集合
            tabSwitchManager.activeQueries.add(message.target);
            tabSwitchManager.pendingQueries.set(message.target, sendResponse);

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
                                    console.info('切换回来:', chrome.runtime.lastError);

                                    // 暂时不移除查询，等待AI响应完成
                                });
                            });
                        }, 300); // 300ms后激活
                    });
                } else {
                    console.log('No tabs found for URL:', target.url);
                    // 如果找不到标签页，可以发送一个错误信息回UI
                    // 移除该查询
                    tabSwitchManager.activeQueries.delete(message.target);
                    tabSwitchManager.pendingQueries.delete(message.target);
                    
                    chrome.runtime.sendMessage({
                        type: 'aiError',
                        source: message.target,
                        error: '请先在浏览器中打开并登录 ' + target.url.replace('/*', '')
                    });
                }
            });
        });
        // 不立即响应，等待AI完成后响应
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
        
        // 检查是否有对应的待响应查询
        const queryResponse = tabSwitchManager.pendingQueries.get(message.source);
        if (queryResponse) {
            // 移除该查询
            tabSwitchManager.activeQueries.delete(message.source);
            tabSwitchManager.pendingQueries.delete(message.source);
            console.log('Query completed for:', message.source, 'Remaining queries:', tabSwitchManager.activeQueries);
            
            // 等待2秒后响应，让用户看到结果
            setTimeout(() => {
                queryResponse({ success: true, response: message.answer });
                
                // 检查是否需要切换回原来的标签页
                scheduleTabSwitch();
            }, 2000);
        }
        
        // 转发AI响应到popup
        chrome.runtime.sendMessage(message);
        return false;
    } else if (message.type === 'aiError') {
        console.log('Forwarding AI error:', message);
        
        // 检查是否有对应的待响应查询
        const queryResponse = tabSwitchManager.pendingQueries.get(message.source);
        if (queryResponse) {
            // 移除该查询
            tabSwitchManager.activeQueries.delete(message.source);
            tabSwitchManager.pendingQueries.delete(message.source);
            console.log('Query failed for:', message.source, 'Remaining queries:', tabSwitchManager.activeQueries);
            
            queryResponse({ success: false, error: message.error });
            
            // 检查是否需要切换回原来的标签页
            scheduleTabSwitch();
        }
        
        // 转发AI错误到popup
        chrome.runtime.sendMessage(message);
        return false;
    }
    
    // 如果是queryAI类型的消息，需要返回true表示异步响应
    if (message.type === 'queryAI') {
        return true;
    }
    
    // 其他未处理的消息类型
    return false;
});

// 智能标签页切换函数
function scheduleTabSwitch() {
    // 如果还有活动查询，或者已经安排了切换，则不执行
    if (tabSwitchManager.activeQueries.size > 0 || tabSwitchManager.switchScheduled) {
        console.log('Tab switch not needed:', {
            activeQueries: tabSwitchManager.activeQueries.size,
            switchScheduled: tabSwitchManager.switchScheduled
        });
        return;
    }

    // 如果没有保存的原始标签页，则不切换
    if (!tabSwitchManager.originalTabId || !tabSwitchManager.originalTabUrl) {
        console.log('No original tab to switch back to');
        return;
    }

    console.log('Scheduling tab switch back to:', tabSwitchManager.originalTabId);
    tabSwitchManager.switchScheduled = true;

    setTimeout(() => {
        // 先检查原始标签页是否还存在
        chrome.tabs.get(tabSwitchManager.originalTabId, (tab) => {
            if (chrome.runtime.lastError) {
                console.log('Original tab no longer exists:', chrome.runtime.lastError);
                resetTabSwitchManager();
            } else {
                chrome.tabs.update(tabSwitchManager.originalTabId, { active: true }, () => {
                    if (chrome.runtime.lastError) {
                        console.error('Failed to switch back to original tab:', chrome.runtime.lastError);
                    } else {
                        console.log('Successfully switched back to original tab:', tabSwitchManager.originalTabId);
                    }
                    resetTabSwitchManager();
                });
            }
        });
    }, 2000); // 等待2秒后切换回原标签页
}

// 重置标签页切换管理器
function resetTabSwitchManager() {
    tabSwitchManager.originalTabId = null;
    tabSwitchManager.originalTabUrl = null;
    tabSwitchManager.activeQueries.clear();
    tabSwitchManager.pendingQueries.clear();
    tabSwitchManager.switchScheduled = false;
    console.log('Tab switch manager reset');
}
