const vscode = require('vscode');
const { showHistoryPanel } = require('./graphView');
const { getKeyboardHeatmapHtml, getKeyboardHeatmapStyle, getKeyboardHeatmapScript } = require('./keyboardHeatmap');

class TypingSpeedFeature {
    constructor(context) {
        this.context = context;
        this.state = {
            keystrokeCount: 0,
            startTime: Date.now(),
            panel: null,
            lastTypedTime: Date.now(),
            currentWPM: 0,
            history: [],
            keyPressData: {},
            lastFullUpdateTime: undefined
        };

        // Load saved state
        const savedHistory = context.globalState.get('typingSpeedHistory', []);
        if (savedHistory) this.state.history = savedHistory;
        const savedKeyPressData = context.globalState.get('keyPressData', {});
        if (savedKeyPressData) this.state.keyPressData = savedKeyPressData;

        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'codefun.toggleTypingSpeed';
        this.statusBarItem.text = '$(keyboard) Typing Speed: Off';
        this.statusBarItem.show();
        context.subscriptions.push(this.statusBarItem);

        // Create overlay decoration
        this.showOverlay = false;
        this.overlayDecorationType = vscode.window.createTextEditorDecorationType({
            after: {
                contentText: '0 WPM',
                color: '#e0e0e0',
                fontStyle: 'italic',
                backgroundColor: 'rgba(30, 30, 30, 0.6)',
                padding: '2px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
            },
            isWholeLine: true
        });

        // Register toggle command
        context.subscriptions.push(
            vscode.commands.registerCommand('codefun.toggleTypingSpeed', () => {
                this.showOverlay = !this.showOverlay;
                this.statusBarItem.text = `$(keyboard) Typing Speed: ${this.showOverlay ? 'On' : 'Off'}`;
                if (!this.showOverlay) {
                    this.clearOverlay();
                    this.state.keystrokeCount = 0;
                    this.state.startTime = Date.now();
                    this.state.currentWPM = 0;
                } else {
                    this.state.startTime = Date.now();
                    this.updateOverlay();
                }
            })
        );

        // Track typing input
        context.subscriptions.push(
            vscode.workspace.onDidChangeTextDocument(event => {
                if (!this.showOverlay) return;
                const now = Date.now();
                const idleTimeInSeconds = (now - this.state.lastTypedTime) / 1000;
                const idleThreshold = 5;

                if (idleTimeInSeconds > idleThreshold) {
                    this.state.startTime = now;
                    this.state.keystrokeCount = 0;
                    this.resetWPMDisplay();
                }

                const pressedKeys = this.getKeysFromTextDocumentChangeEvent(event);
                pressedKeys.forEach(key => {
                    this.state.keyPressData[key] = (this.state.keyPressData[key] || 0) + 1;
                });

                if (this.state.panel) {
                    this.state.panel.webview.postMessage({
                        command: 'updateKeyHeat',
                        keys: pressedKeys
                    });

                    if (!this.state.lastFullUpdateTime || now - this.state.lastFullUpdateTime > 5000) {
                        this.state.panel.webview.postMessage({
                            command: 'initKeyboardHeatmap',
                            keyPressData: this.state.keyPressData
                        });
                        this.state.lastFullUpdateTime = now;
                    }
                }

                for (const change of event.contentChanges) {
                    this.state.keystrokeCount += change.text.length;
                }

                this.state.lastTypedTime = now;
                this.updateTypingSpeed();
            })
        );

        // Handle overlay click
        context.subscriptions.push(
            vscode.commands.registerCommand('codefun.showTypingSpeedDetails', () => {
                this.toggleVisualizerPanel();
            })
        );

        // Periodic updates
        const updateInterval = setInterval(() => {
            this.updateTypingSpeed();
        }, 2000);
        context.subscriptions.push({ dispose: () => clearInterval(updateInterval) });
    }

    getConfiguration() {
        const config = vscode.workspace.getConfiguration('codefun');
        return {
            idleTimeThreshold: config.get('idleTimeThreshold', 5),
            saveHistory: config.get('saveHistory', true),
            historyMaxEntries: config.get('historyMaxEntries', 500)
        };
    }

    getKeysFromTextDocumentChangeEvent(event) {
        const keys = [];
        for (const change of event.contentChanges) {
            if (change.text.length === 1) {
                keys.push(change.text.toLowerCase());
            } else if (change.text === '') {
                keys.push('backspace');
            } else if (change.text.includes('\n')) {
                keys.push('enter');
            } else if (change.text === '\t') {
                keys.push('tab');
            } else if (change.text === ' ') {
                keys.push('space');
            }
        }
        return keys;
    }

    updateTypingSpeed() {
        const now = Date.now();
        const inactiveFor = (now - this.state.lastTypedTime) / 1000;
        let wpm = 0;
        if (inactiveFor < 2) {
            const elapsedMinutes = (now - this.state.startTime) / 60000;
            const wordsTyped = this.state.keystrokeCount / 5;
            wpm = Math.round(wordsTyped / elapsedMinutes);
        }

        this.state.currentWPM = wpm;

        if (wpm > 0 && (!this.state.history.length || this.state.history[this.state.history.length - 1].wpm !== wpm)) {
            this.state.history.push({ timestamp: now, wpm });
            const maxEntries = this.getConfiguration().historyMaxEntries;
            if (this.state.history.length > maxEntries) {
                this.state.history = this.state.history.slice(-maxEntries);
            }
            if (this.getConfiguration().saveHistory) {
                this.context.globalState.update('typingSpeedHistory', this.state.history);
                this.context.globalState.update('keyPressData', this.state.keyPressData);
            }
        }

        const quote = this.getQuote(wpm);
        this.statusBarItem.text = `$(keyboard) Typing Speed: ${this.showOverlay ? `${wpm} WPM — ${quote}` : 'Off'}`;
        this.updateOverlay();
        this.postWPMToWebview();
    }

    updateOverlay() {
        if (!this.showOverlay) return;
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const lastLine = editor.document.lineCount - 1;
        const range = new vscode.Range(
            new vscode.Position(lastLine, editor.document.lineAt(lastLine).text.length),
            new vscode.Position(lastLine, editor.document.lineAt(lastLine).text.length)
        );
        const decoration = {
            range,
            renderOptions: {
                after: {
                    contentText: `${this.state.currentWPM} WPM`,
                    color: '#e0e0e0',
                    fontStyle: 'italic',
                    backgroundColor: 'rgba(30, 30, 30, 0.6)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }
            }
        };
        editor.setDecorations(this.overlayDecorationType, [decoration]);
    }

    clearOverlay() {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.setDecorations(this.overlayDecorationType, []);
        }
    }

    toggleVisualizerPanel() {
        if (this.state.panel) {
            this.state.panel.reveal(vscode.ViewColumn.Beside, true); // Preserve focus
        } else {
            this.createVisualizerPanel();
        }
    }

    createVisualizerPanel() {
        const panel = vscode.window.createWebviewPanel(
            'codefunTypingSpeed',
            'CodeFun Typing Speed Visualizer',
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
            { enableScripts: true, retainContextWhenHidden: true }
        );
        this.state.panel = panel;

        panel.webview.html = this.getWebviewContent();
        panel.webview.onDidReceiveMessage(
            message => {
                if (message.command === 'ready') {
                    this.postWPMToWebview();
                    setTimeout(() => {
                        if (this.state.panel) {
                            this.state.panel.webview.postMessage({
                                command: 'initKeyboardHeatmap',
                                keyPressData: this.state.keyPressData
                            });
                        }
                    }, 500);
                } else if (message.command === 'resetStats') {
                    this.resetStats();
                } else if (message.command === 'heatmapReady') {
                    if (this.state.panel) {
                        this.state.panel.webview.postMessage({
                            command: 'initKeyboardHeatmap',
                            keyPressData: this.state.keyPressData
                        });
                        this.state.lastFullUpdateTime = Date.now();
                    }
                } else if (message.command === 'showHistory') {
                    showHistoryPanel(this.context, message.history);
                }
            },
            undefined,
            this.context.subscriptions
        );

        panel.onDidDispose(() => {
            this.state.panel = null;
        }, null, this.context.subscriptions);
    }

    getWebviewContent() {
        const mediaBaseUri = this.state.panel.webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'src', 'media')
        );
        const initialAnimationFile = this.getAnimationFile(0);
        const keyboardHeatmapHtml = getKeyboardHeatmapHtml();
        const keyboardHeatmapStyle = getKeyboardHeatmapStyle();
        const keyboardHeatmapScript = getKeyboardHeatmapScript();

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Typing Animation</title>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.7.4/lottie.min.js"></script>
            <style>
                :root {
                    --primary-text: #e0e0e0;
                    --border-color: rgba(80, 80, 80, 0.5);
                    --bg-dark: rgba(30, 30, 30, 0.8);
                    --bg-darker: rgba(30, 30, 30, 0.4);
                    --button-hover: rgba(60, 60, 60, 0.8);
                    --transition-duration: 0.8s;
                    --transition-timing: cubic-bezier(0.25, 0.1, 0.25, 1.0);
                }
                * { box-sizing: border-box; }
                body {
                    margin: 0;
                    background: transparent;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    align-items: center;
                    height: 100vh;
                    overflow-y: auto;
                    font-family: 'Segoe UI', sans-serif;
                    color: var(--primary-text);
                    padding: 0;
                }
                .content-wrapper {
                    width: 100%;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                }
                #container {
                    width: 100%;
                    min-height: 300px;
                    height: 40vh;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }
                @media (max-height: 700px) {
                    #container { min-height: 200px; height: 30vh; }
                }
                #lottie {
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    transition: opacity var(--transition-duration) var(--transition-timing);
                    opacity: 0;
                }
                #lottie.loaded { opacity: 1; }
                #lottie.fade-out { opacity: 0; }
                #lottie.fade-in { opacity: 1; }
                #quote-container {
                    padding: 20px;
                    text-align: center;
                    width: 100%;
                    font-size: clamp(1rem, 2vw, 1.5rem);
                    font-weight: 500;
                    color: white;
                    text-shadow: 1px 1px 3px black;
                    background: var(--bg-darker);
                    border-bottom: 1px solid var(--border-color);
                    position: relative;
                    overflow: hidden;
                }
                #quote {
                    transition: transform 0.5s ease, opacity 0.5s ease;
                }
                #quote.changing {
                    transform: translateY(20px);
                    opacity: 0;
                }
                #wpm-value {
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                }
                #wpm-display {
                    position: absolute;
                    top: 20px;
                    left: 20px;
                    font-size: clamp(1.5rem, 4vw, 3rem);
                    font-weight: 800;
                    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.3s ease;
                    background: transparent;
                    z-index: 10;
                }
                #emoji {
                    font-size: clamp(1.2rem, 3vw, 2rem);
                    transition: all 0.3s ease;
                }
                .control-buttons {
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    display: flex;
                    gap: 10px;
                    z-index: 10;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }
                @media (max-width: 600px) {
                    #wpm-display { top: 10px; left: 10px; }
                    .control-buttons { top: 10px; right: 10px; }
                    button { padding: 4px 8px !important; font-size: 0.8rem !important; }
                }
                @media (max-width: 480px) {
                    .control-buttons { flex-direction: column; align-items: flex-end; }
                }
                button {
                    background: var(--bg-dark);
                    border: 1px solid #555;
                    color: var(--primary-text);
                    padding: 5px 10px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 0.9rem;
                    white-space: nowrap;
                }
                button:hover { background: var(--button-hover); }
                .animate-wpm {
                    animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes pop {
                    0% { transform: scale(1); opacity: 0.7; }
                    50% { transform: scale(1.4); opacity: 1; }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
                #keyboard-section {
                    width: 100%;
                    padding: 20px 10px;
                    margin-top: 10px;
                    border-top: 1px solid var(--border-color);
                    overflow-x: auto;
                }
                #keyboard-section::-webkit-scrollbar {
                    height: 8px;
                }
                #keyboard-section::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 4px;
                }
                #keyboard-section::-webkit-scrollbar-thumb {
                    background: rgba(100, 100, 100, 0.5);
                    border-radius: 4px;
                }
                .keyboard-container {
                    min-width: 600px;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .animate-fade-in {
                    animation: fadeIn var(--transition-duration) var(--transition-timing) forwards;
                }
                .animate-fade-out {
                    animation: fadeOut var(--transition-duration) var(--transition-timing) forwards;
                }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes slideDown { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                ${keyboardHeatmapStyle}
            </style>
        </head>
        <body>
            <div class="content-wrapper">
                <div id="quote-container">
                    <div id="quote">🐢 Slow and steady wins the race...</div>
                </div>
                <div id="container">
                    <div id="lottie"></div>
                    <div id="wpm-display">
                        <span id="wpm-value">0</span>
                        <span id="emoji">🐢</span>
                    </div>
                    <div class="control-buttons">
                        <button id="toggle-history">Show History</button>
                        <button id="reset-stats">Reset Stats</button>
                    </div>
                </div>
                <div id="keyboard-section">
                    ${keyboardHeatmapHtml}
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                let animation;
                let lastWPM = 0;
                let wpmHistory = [];
                let heatmapInitialized = false;
                let animationTransitionInProgress = false;

                function loadAnimation(animationPath) {
                    const container = document.getElementById('lottie');
                    if (animationTransitionInProgress) {
                        console.log('Animation transition already in progress, skipping');
                        return;
                    }
                    animationTransitionInProgress = true;
                    try {
                        container.classList.remove('loaded');
                        container.classList.remove('fade-in');
                        container.classList.add('fade-out');
                        setTimeout(() => {
                            if (animation) animation.destroy();
                            container.innerHTML = '';
                            animation = lottie.loadAnimation({
                                container: container,
                                renderer: 'svg',
                                loop: true,
                                autoplay: false,
                                path: animationPath
                            });
                            animation.addEventListener('DOMLoaded', () => {
                                container.classList.remove('fade-out');
                                setTimeout(() => {
                                    animation.play();
                                    container.classList.add('fade-in');
                                    container.classList.add('loaded');
                                    setTimeout(() => {
                                        animationTransitionInProgress = false;
                                    }, 800);
                                }, 100);
                            });
                            animation.addEventListener('data_failed', () => {
                                console.error('Failed to load animation:', animationPath);
                                container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;opacity:0;transition:opacity 0.8s cubic-bezier(0.25, 0.1, 0.25, 1.0);" class="fallback-animation"><span style="font-size:3em;">⌨️</span></div>';
                                setTimeout(() => {
                                    const fallback = container.querySelector('.fallback-animation');
                                    if (fallback) fallback.style.opacity = '1';
                                    container.classList.add('loaded');
                                    container.classList.add('fade-in');
                                    setTimeout(() => {
                                        animationTransitionInProgress = false;
                                    }, 800);
                                }, 100);
                            });
                        }, 800);
                    } catch (error) {
                        console.error('Animation error:', error);
                        container.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;height:100%;opacity:0;transition:opacity 0.8s cubic-bezier(0.25, 0.1, 0.25, 1.0);" class="fallback-animation"><span style="font-size:3em;">⌨️</span></div>';
                        setTimeout(() => {
                            const fallback = container.querySelector('.fallback-animation');
                            if (fallback) fallback.style.opacity = '1';
                            container.classList.add('loaded');
                            container.classList.add('fade-in');
                            setTimeout(() => {
                                animationTransitionInProgress = false;
                            }, 800);
                        }, 100);
                    }
                }

                function getSpeedEmoji(wpm) {
                    if (wpm <= 10) return "🐢";
                    if (wpm <= 20) return "🌱";
                    if (wpm <= 35) return "🚶";
                    if (wpm <= 50) return "🏃";
                    if (wpm <= 65) return "⚡";
                    return "🚀";
                }

                function getWPMColor(wpm) {
                    if (wpm < 10) return 'linear-gradient(45deg, #FFD1D1, #FFE5E5)';
                    if (wpm < 20) return 'linear-gradient(45deg, #FFFACD, #FFF5B7)';
                    if (wpm < 35) return 'linear-gradient(45deg, #DFFFD6, #E8FFE0)';
                    if (wpm < 50) return 'linear-gradient(45deg, #D6F6FF, #E0FCFF)';
                    if (wpm < 65) return 'linear-gradient(45deg, #EAD9FF, #F3E8FF)';
                    return 'linear-gradient(45deg, #FFD9F7, #FFE0FA)';
                }

                function updateWPMDisplay(newWPM) {
                    const wpmValueEl = document.getElementById('wpm-value');
                    const emojiEl = document.getElementById('emoji');
                    wpmValueEl.classList.remove('animate-wpm');
                    void wpmValueEl.offsetWidth;
                    wpmValueEl.classList.add('animate-wpm');
                    wpmValueEl.textContent = newWPM;
                    emojiEl.textContent = getSpeedEmoji(newWPM);
                    const color = getWPMColor(newWPM);
                    wpmValueEl.style.backgroundImage = color;
                    wpmValueEl.style.webkitBackgroundClip = 'text';
                    wpmValueEl.style.backgroundClip = 'text';
                    wpmValueEl.style.color = 'transparent';
                    lastWPM = newWPM;
                }

                ${keyboardHeatmapScript}

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.command === 'update') {
                        const { wpm, quote, animationFile, color, history } = message;
                        const quoteElement = document.getElementById('quote');
                        quoteElement.classList.add('changing');
                        setTimeout(() => {
                            quoteElement.textContent = quote;
                            quoteElement.classList.remove('changing');
                            setTimeout(() => {
                                quoteElement.style.animation = 'pulse 1s ease';
                                setTimeout(() => {
                                    quoteElement.style.animation = '';
                                }, 1000);
                            }, 500);
                        }, 300);
                        try {
                            const newPath = '${mediaBaseUri}/' + animationFile;
                            loadAnimation(newPath);
                        } catch (error) {
                            console.error('Failed to load animation:', error);
                        }
                        updateWPMDisplay(wpm);
                        if (history) wpmHistory = history;
                    } else if (message.command === 'reset') {
                        updateWPMDisplay(0);
                        document.getElementById('quote').textContent = '🐢 Slow and steady wins the race...';
                        if (message.clearHistory) wpmHistory = [];
                        if (message.clearKeyHeatmap) resetKeyboardHeatmap();
                        lastWPM = 0;
                    } else if (message.command === 'initKeyboardHeatmap') {
                        console.log('Received keyboard heatmap data from extension');
                        initKeyboardHeatmap(message.keyPressData);
                        heatmapInitialized = true;
                    } else if (message.command === 'updateKeyHeat') {
                        console.log('Received key press update from extension');
                        updateKeyHeat(message.keys);
                    }
                });

                document.getElementById('toggle-history').addEventListener('click', () => {
                    vscode.postMessage({ command: 'showHistory', history: wpmHistory });
                });

                document.getElementById('reset-stats').addEventListener('click', () => {
                    vscode.postMessage({ command: 'resetStats' });
                });

                document.addEventListener('DOMContentLoaded', () => {
                    console.log('DOM content loaded');
                    setTimeout(() => {
                        vscode.postMessage({ command: 'heatmapReady' });
                    }, 300);
                });

                window.onload = () => {
                    vscode.postMessage({ command: 'ready' });
                    const checkKeyboardElements = setInterval(() => {
                        if (document.querySelector('.key')) {
                            clearInterval(checkKeyboardElements);
                            console.log('Keyboard elements found - sending heatmapReady');
                            vscode.postMessage({ command: 'heatmapReady' });
                        }
                    }, 200);
                    setTimeout(() => {
                        clearInterval(checkKeyboardElements);
                        if (!heatmapInitialized) {
                            console.log('Fallback: sending heatmapReady after timeout');
                            vscode.postMessage({ command: 'heatmapReady' });
                        }
                    }, 2000);
                };
            </script>
        </body>
        </html>
        `;
    }

    postWPMToWebview() {
        if (this.state.panel) {
            this.state.panel.webview.postMessage({
                command: 'update',
                wpm: this.state.currentWPM,
                quote: this.getQuote(this.state.currentWPM),
                animationFile: this.getAnimationFile(this.state.currentWPM),
                color: this.getWPMColor(this.state.currentWPM),
                history: this.state.history
            });
        }
    }

    resetStats() {
        this.state.keystrokeCount = 0;
        this.state.startTime = Date.now();
        this.state.currentWPM = 0;
        this.state.history = [];
        this.state.keyPressData = {};
        this.state.lastFullUpdateTime = undefined;
        if (this.getConfiguration().saveHistory) {
            this.context.globalState.update('typingSpeedHistory', []);
            this.context.globalState.update('keyPressData', {});
        }
        this.updateTypingSpeed();
        if (this.state.panel) {
            this.state.panel.webview.postMessage({
                command: 'reset',
                clearHistory: true,
                clearKeyHeatmap: true
            });
        }
    }

    resetWPMDisplay() {
        if (this.state.panel) {
            this.state.panel.webview.postMessage({
                command: 'reset',
                clearHistory: false,
                clearKeyHeatmap: false
            });
        }
    }

    getAnimationFile(wpm) {
        if (wpm < 10) return 'slow1.json';
        if (wpm < 20) return 'slow2.json';
        if (wpm < 30) return 'medium1.json';
        if (wpm < 40) return 'medium2.json';
        if (wpm < 50) return 'fast1.json';
        return 'fast2.json';
    }

    getQuote(wpm) {
        if (wpm < 10) return '🐢 Slow and steady wins the race...';
        if (wpm < 20) return '🌱 Warming up... keep those keys moving!';
        if (wpm < 35) return '🚶 Steady and focused — you\'re getting there!';
        if (wpm < 50) return '🏃 Nice flow! You\'re typing like a pro.';
        if (wpm < 65) return '⚡ Speedy fingers! Keep up the great momentum!';
        return '🚀 Typing master unlocked! You\'re on fire!';
    }

    getWPMColor(wpm) {
        if (wpm < 10) return 'linear-gradient(45deg, #FFD1D1, #FFE5E5)';
        if (wpm < 20) return 'linear-gradient(45deg, #FFFACD, #FFF5B7)';
        if (wpm < 35) return 'linear-gradient(45deg, #DFFFD6, #E8FFE0)';
        if (wpm < 50) return 'linear-gradient(45deg, #D6F6FF, #E0FCFF)';
        if (wpm < 65) return 'linear-gradient(45deg, #EAD9FF, #F3E8FF)';
        return 'linear-gradient(45deg, #FFD9F7, #FFE0FA)';
    }
}

module.exports = { TypingSpeedFeature };