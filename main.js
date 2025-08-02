// 主页面JavaScript逻辑

// 语言数据
const translations = {
    'zh': {
        'title': 'AI Aggregator',
        'subtitle': '同时向多个AI模型发送问题并对比回答',
        'switch-lang': 'EN',
        'input-label': '输入您的问题：',
        'input-placeholder': '在此输入您想要询问的问题...',
        'send-button': '发送给所有AI',
        'clear-button': '清空结果',
        'ai-control-title': 'AI模型控制',
        'instructions-title': '使用说明',
        'instruction-1': '确保已打开并登录以下AI平台：',
        'instruction-2': '在上方输入框中输入您的问题',
        'instruction-3': '点击"发送给所有AI"按钮',
        'instruction-4': '等待各个AI的回答并对比结果',
        'alert-no-question': '请输入问题',
        'alert-no-ai-enabled': '请至少启用一个AI模型',
        'status-connected': '已连接',
        'status-disconnected': '未连接',
        'status-error': '连接失败',
        'status-not-found': '未找到标签页',
        'status-streaming': '生成中...',
        'status-connection-error': '连接错误',
        'waiting-question': '等待问题...',
        'copy-button': '复制',
        'waiting-answer': '正在等待回答...'
    },
    'en': {
        'title': 'AI Aggregator',
        'subtitle': 'Send questions to multiple AI models simultaneously and compare responses',
        'switch-lang': '中文',
        'input-label': 'Enter your question:',
        'input-placeholder': 'Type your question here...',
        'send-button': 'Send to All AI',
        'clear-button': 'Clear Results',
        'ai-control-title': 'AI Model Controls',
        'instructions-title': 'Instructions',
        'instruction-1': 'Make sure the following AI platforms are open and logged in:',
        'instruction-2': 'Enter your question in the input box above',
        'instruction-3': 'Click the "Send to All AI" button',
        'instruction-4': 'Wait for responses from each AI and compare results',
        'alert-no-question': 'Please enter a question',
        'alert-no-ai-enabled': 'Please enable at least one AI model',
        'status-connected': 'Connected',
        'status-disconnected': 'Disconnected',
        'status-error': 'Connection Failed',
        'status-not-found': 'Tab Not Found',
        'status-streaming': 'Generating...',
        'status-connection-error': 'Connection Error',
        'waiting-question': 'Waiting for question...',
        'copy-button': 'Copy',
        'waiting-answer': 'Waiting for answer...'
    }
};

class AIAggregator {
    constructor() {
        this.ais = ['chatgpt', 'gemini', 'grok', 'kimi'];
        // 默认启用的AI（ChatGPT和Gemini）
        this.defaultEnabledAIs = ['chatgpt', 'gemini'];
        this.enabledAIs = new Set();
        this.currentLanguage = 'zh'; // 默认中文
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.bindEvents();
        this.initSwitches();
        this.initLanguage();
        this.checkConnections();
    }

    bindEvents() {
        // 发送按钮事件
        document.getElementById('submit-button').addEventListener('click', () => {
            this.submitToAllAI();
        });

        // 清空按钮事件
        document.getElementById('clear-button').addEventListener('click', () => {
            this.clearResults();
        });

        // 复制按钮事件
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target.dataset.target;
                this.copyResult(target);
            });
        });

        // 回车键发送
        document.getElementById('prompt-input').addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.submitToAllAI();
            }
        });

        // AI开关事件
        document.querySelectorAll('.ai-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const ai = e.target.dataset.ai;
                if (e.target.checked) {
                    this.enabledAIs.add(ai);
                    this.showResultBox(ai);
                } else {
                    this.enabledAIs.delete(ai);
                    this.hideResultBox(ai);
                }
                this.saveSettings();
            });
        });

        // 语言切换事件
        document.getElementById('lang-toggle').addEventListener('click', () => {
            this.toggleLanguage();
        });
    }

    async checkConnections() {
        console.log('检查AI平台连接状态...');

        // 先获取所有打开的标签页进行调试
        try {
            const response = await this.sendMessage({
                type: 'debugTabs'
            });
            console.log('当前打开的标签页:', response);
        } catch (error) {
            console.error('获取标签页信息失败:', error);
        }

        for (const ai of this.ais) {
            try {
                const response = await this.sendMessage({
                    type: 'checkConnection',
                    target: ai
                });

                const statusKey = response.connected ? 'status-connected' : 'status-not-found';
                const statusText = translations[this.currentLanguage][statusKey];
                this.updateStatus(ai, response.connected ? 'connected' : 'error', statusText);
            } catch (error) {
                console.error(`检查 ${ai} 连接失败:`, error);
                const statusText = translations[this.currentLanguage]['status-error'];
                this.updateStatus(ai, 'error', statusText);
            }
        }
    }

    // 加载设置
    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['enabledAIs', 'language'], (result) => {
                if (result.enabledAIs) {
                    this.enabledAIs = new Set(result.enabledAIs);
                } else {
                    // 使用默认设置
                    this.enabledAIs = new Set(this.defaultEnabledAIs);
                }

                // 加载语言设置
                this.currentLanguage = result.language || 'zh';

                this.saveSettings();
                resolve();
            });
        });
    }

    // 保存设置
    saveSettings() {
        chrome.storage.local.set({
            enabledAIs: Array.from(this.enabledAIs),
            language: this.currentLanguage
        });
    }

    // 初始化开关状态
    initSwitches() {
        this.ais.forEach(ai => {
            const toggle = document.getElementById(`${ai}-toggle`);
            if (toggle) {
                toggle.checked = this.enabledAIs.has(ai);
            }

            // 根据开关状态控制结果框的显示
            if (this.enabledAIs.has(ai)) {
                this.showResultBox(ai);
            } else {
                this.hideResultBox(ai);
            }
        });
    }

    // 初始化语言设置
    initLanguage() {
        this.updateLanguage();
    }

    // 切换语言
    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
        this.updateLanguage();
        this.saveSettings();
    }

    // 更新界面语言
    updateLanguage() {
        const lang = this.currentLanguage;
        const langData = translations[lang];

        if (!langData) return;

        // 更新所有带有 data-i18n 属性的元素
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (langData[key]) {
                element.textContent = langData[key];
            }
        });

        // 更新placeholder属性
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (langData[key]) {
                element.placeholder = langData[key];
            }
        });

        // 更新语言切换按钮
        const currentLangSpan = document.getElementById('current-lang');
        const langTextSpan = document.querySelector('.lang-text');

        if (currentLangSpan && langTextSpan) {
            if (lang === 'zh') {
                currentLangSpan.textContent = '🇨🇳';
                langTextSpan.textContent = langData['switch-lang'];
            } else {
                currentLangSpan.textContent = '🇺🇸';
                langTextSpan.textContent = langData['switch-lang'];
            }
        }

        // 更新页面标题
        document.title = lang === 'zh' ? 'AI Aggregator - 多AI模型对比工具' : 'AI Aggregator - Multi AI Model Comparison Tool';

        // 更新结果框中的等待文本
        this.updateWaitingTexts();

        // 刷新连接状态以使用新语言
        this.refreshConnectionStatus();

        console.log(`Language switched to: ${lang}`);
    }

    // 更新等待文本
    updateWaitingTexts() {
        const waitingText = translations[this.currentLanguage]['waiting-question'];
        this.ais.forEach(ai => {
            const contentElement = document.getElementById(`${ai}-content`);
            if (contentElement && (contentElement.textContent.includes('等待问题') || contentElement.textContent.includes('Waiting for question'))) {
                contentElement.textContent = waitingText;
            }
        });
    }

    // 刷新连接状态显示
    refreshConnectionStatus() {
        // 重新检查连接状态以更新状态文本语言
        setTimeout(() => {
            this.checkConnections();
        }, 100);
    }

    async submitToAllAI() {
        const prompt = document.getElementById('prompt-input').value.trim();
        if (!prompt) {
            alert(translations[this.currentLanguage]['alert-no-question']);
            return;
        }

        const enabledAIsList = Array.from(this.enabledAIs);
        if (enabledAIsList.length === 0) {
            alert(translations[this.currentLanguage]['alert-no-ai-enabled']);
            return;
        }

        console.log('发送问题到启用的AI:', enabledAIsList, prompt);

        // 只更新启用的AI的状态为加载中
        this.ais.forEach(ai => {
            if (this.enabledAIs.has(ai)) {
                this.updateContent(ai, translations[this.currentLanguage]['waiting-answer'], 'loading');
            }
        });

        // 只发送到启用的AI
        for (const ai of enabledAIsList) {
            try {
                await this.sendMessage({
                    type: 'queryAI',
                    target: ai,
                    prompt: prompt
                });
            } catch (error) {
                console.error(`发送到 ${ai} 失败:`, error);
                this.updateContent(ai, `错误：${error.message}`, 'error');
            }
        }
    }

    async sendMessage(message) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }

    updateStatus(ai, status, message) {
        const statusElement = document.getElementById(`${ai}-status`);
        if (statusElement) {
            statusElement.textContent = message;

            // 移除旧的状态类
            statusElement.className = statusElement.className.replace(/status-(connected|disconnected|error|disabled)/g, '');
            statusElement.className = `status-text status-${status}`;
        }
    }

    updateContent(ai, content, className = '') {
        // 如果AI未启用，不更新其内容
        if (!this.enabledAIs.has(ai) && className !== '') {
            return;
        }

        const contentElement = document.getElementById(`${ai}-content`);
        const resultBox = document.getElementById(`${ai}-result`);

        if (contentElement) {
            // 检测是否需要markdown渲染
            if (this.isMarkdownContent(content)) {
                // 使用简单的markdown渲染器
                try {
                    contentElement.innerHTML = this.simpleMarkdownRender(content);
                } catch (error) {
                    console.error('Markdown渲染失败:', error);
                    contentElement.textContent = content;
                }
            } else {
                // 普通文本内容
                contentElement.textContent = content;
            }
            contentElement.className = `content ${className}`;

            // 处理结果框的样式
            if (resultBox) {
                if (className === 'disabled') {
                    resultBox.classList.add('disabled');
                } else {
                    resultBox.classList.remove('disabled');
                }
            }
        }
    }

    // 检测内容是否包含markdown格式
    isMarkdownContent(content) {
        // 检测常见的markdown模式
        const markdownPatterns = [
            /```[\s\S]*?```/, // 代码块
            /`[^`\n]+`/, // 行内代码
            /^#{1,6}\s/m, // 标题
            /\*\*[^*\n]+\*\*/, // 粗体
            /\*[^*\n]+\*(?!\*)/, // 斜体（避免与粗体冲突）
            /^\s*[-*+]\s/m, // 无序列表
            /^\s*\d+\.\s/m, // 有序列表
            /^\s*\|.*\|.*$/m, // 表格
            /^>\s/m, // 引用
            /^\s*---+\s*$/m // 分隔线
        ];

        return markdownPatterns.some(pattern => pattern.test(content));
    }

    // 简单的markdown渲染器
    simpleMarkdownRender(text) {
        let html = text;

        // 代码块
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // 行内代码
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 标题
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // 粗体
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 斜体
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

        // 无序列表
        html = html.replace(/^\s*[-*+]\s+(.*)$/gim, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

        // 引用
        html = html.replace(/^>\s+(.*)$/gim, '<blockquote>$1</blockquote>');

        // 分隔线
        html = html.replace(/^---+$/gim, '<hr>');

        // 段落（简单处理）
        html = html.replace(/\n\n/g, '</p><p>');
        html = '<p>' + html + '</p>';

        // 清理空段落
        html = html.replace(/<p><\/p>/g, '');

        return html;
    }

    // 显示结果框
    showResultBox(ai) {
        const resultBox = document.getElementById(`${ai}-result`);
        if (resultBox) {
            resultBox.style.display = 'block';
            this.updateContent(ai, translations[this.currentLanguage]['waiting-question']);
        }
    }

    // 隐藏结果框
    hideResultBox(ai) {
        const resultBox = document.getElementById(`${ai}-result`);
        if (resultBox) {
            resultBox.style.display = 'none';
        }
    }

    clearResults() {
        this.ais.forEach(ai => {
            if (this.enabledAIs.has(ai)) {
                this.updateContent(ai, translations[this.currentLanguage]['waiting-question']);
            }
        });
        document.getElementById('prompt-input').value = '';
    }

    async copyResult(ai) {
        const contentElement = document.getElementById(`${ai}-content`);
        const waitingText = translations[this.currentLanguage]['waiting-question'];
        if (contentElement && contentElement.textContent.trim() !== waitingText) {
            try {
                await navigator.clipboard.writeText(contentElement.textContent);

                // 显示复制成功提示
                const btn = document.querySelector(`[data-target="${ai}"]`);
                const originalText = btn.textContent;
                btn.textContent = '已复制';
                btn.style.background = 'rgba(40, 167, 69, 0.8)';

                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = 'rgba(255,255,255,0.2)';
                }, 2000);
            } catch (error) {
                console.error('复制失败:', error);
                alert('复制失败，请手动复制');
            }
        }
    }

    // 监听来自background script的消息
    listenForResponses() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('收到消息:', message);

            if (message.type === 'aiResponse') {
                // 支持流式更新
                if (message.isStreaming) {
                    this.updateContent(message.source, message.answer, 'streaming');
                    const statusText = translations[this.currentLanguage]['status-streaming'];
                    this.updateStatus(message.source, 'streaming', statusText);
                } else {
                    this.updateContent(message.source, message.answer);
                    const statusText = translations[this.currentLanguage]['status-connected'];
                    this.updateStatus(message.source, 'connected', statusText);
                }
            } else if (message.type === 'aiError') {
                this.updateContent(message.source, `错误：${message.error}`, 'error');
                const statusText = translations[this.currentLanguage]['status-connection-error'];
                this.updateStatus(message.source, 'error', statusText);
            }
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    const app = new AIAggregator();
    app.listenForResponses();

    // 添加一些有用的快捷键提示
    console.log('AI Aggregator 已加载');
    console.log('快捷键: Ctrl+Enter 发送问题');
    console.log('功能: 点击复制按钮可复制AI回答');
}); 