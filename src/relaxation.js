const vscode = require('vscode');
const { getCommonStyles, getProgressBar } = require('./utils');

function getRelaxationContent(subMode) {
    switch (subMode) {
        case 'eyeIntro':
            return `
                <div class="container">
                    <h1>👀 Give Your Eyes a Break</h1>
                    <p>Your eyes work hard staring at screens all day. Take a short break!</p>
                    <div class="button-group">
                        <button onclick="startEyeTimer()">Start Eye Rest</button>
                    </div>
                    <script>
                        const vscode = acquireVsCodeApi();
                        function startEyeTimer() { vscode.postMessage({ command: 'startEyeTimer' }); }
                    </script>
                </div>
            `;
        case 'eyeTimer':
            const eyeTimerDuration = vscode.workspace.getConfiguration('codefun').get('eyeTimerDuration', 20);
            return `
                <div class="container">
                    <h1>👀 Close Your Eyes!</h1>
                    <div class="timer pulse" id="timer">${eyeTimerDuration}s</div>
                    <p id="randomMessage">Relax and let your eyes rest...</p>
                    <div class="button-group">
                        <button onclick="skipStep()">Skip</button>
                    </div>
                    <script>
                        const messages = [
                            "Why are you reading this? Close your eyes!",
                            "Seriously, stop peeking! 👀",
                            "Eyes closed means better rest!",
                            "You're missing the point! 😄"
                        ];
                        let seconds = ${eyeTimerDuration};
                        const timerEl = document.getElementById('timer');
                        const msgEl = document.getElementById('randomMessage');
                        let msgIndex = 0;
                        const vscode = acquireVsCodeApi();
                        let interval = setInterval(() => {
                            seconds--;
                            timerEl.textContent = \`\${seconds}s\`;
                            if (seconds % 5 === 0 && seconds > 0) {
                                msgEl.textContent = messages[msgIndex % messages.length];
                                msgIndex++;
                            }
                            if (seconds <= 0) {
                                clearInterval(interval);
                                timerEl.textContent = "Good job! 👍";
                                timerEl.classList.remove('pulse');
                                document.querySelector('.button-group').innerHTML = '<button onclick="next()">Next</button><button onclick="skipStep()">Skip</button>';
                            }
                        }, 1000);
                        function next() {
                            clearInterval(interval);
                            vscode.postMessage({ command: 'nextAfterEyeTimer' });
                        }
                        function skipStep() {
                            clearInterval(interval);
                            vscode.postMessage({ command: 'skipStep' });
                        }
                    </script>
                </div>
            `;
        case 'waterBreak':
            const minWater = vscode.workspace.getConfiguration('codefun').get('waterMinimum', 250);
            return `
                <style>
                    .floating-reward {
                        position: fixed;
                        left: 50%;
                        top: 60px;
                        transform: translateX(-50%);
                        font-size: 2em;
                        color: var(--vscode-button-background);
                        font-weight: bold;
                        opacity: 1;
                        pointer-events: none;
                        z-index: 9999;
                        animation: floatUpFade 2s ease-out forwards;
                    }
                    @keyframes floatUpFade {
                        0% { opacity: 1; top: 60px; }
                        80% { opacity: 1; }
                        100% { opacity: 0; top: 10px; }
                    }
                </style>
                <div class="container">
                    <h1>💧 Hydration Station</h1>
                    <p>Time to hydrate! Drink at least ${minWater} ml of water.</p>
                    <div class="input-group">
                        <input type="number" id="waterAmount" placeholder="Enter ml" min="${minWater}" step="50" class="water-input">
                        <span class="unit">ml</span>
                    </div>
                    <p id="error" class="error-message"></p>
                    <div class="button-group">
                        <button onclick="submitWater()">Submit</button>
                        <button onclick="skipStep()">Skip</button>
                    </div>
                    <script>
                        const vscode = acquireVsCodeApi();
                        function submitWater() {
                            const amount = parseInt(document.getElementById('waterAmount').value) || 0;
                            if (amount < ${minWater}) {
                                const errorEl = document.getElementById('error');
                                errorEl.textContent = 'Please drink at least ${minWater} ml!';
                                errorEl.style.display = 'block';
                                setTimeout(() => errorEl.style.display = 'none', 3000);
                            } else {
                                vscode.postMessage({ command: 'submitWater', amount: amount });
                            }
                        }
                        function skipStep() {
                            vscode.postMessage({ command: 'skipStep' });
                        }
                        window.addEventListener('message', event => {
                            const message = event.data;
                            if (message.command === 'showReward') {
                                const emoji = '✨';
                                const rewardEl = document.createElement('div');
                                rewardEl.textContent = \`+ \${message.amount} Fun Points \${emoji}\`;
                                rewardEl.className = 'floating-reward';
                                document.body.appendChild(rewardEl);
                                setTimeout(() => rewardEl.remove(), 2000);
                            }
                            if (message.command === 'showError') {
                                const errorEl = document.getElementById('error');
                                errorEl.textContent = message.message;
                                errorEl.style.display = 'block';
                                setTimeout(() => errorEl.style.display = 'none', 3000);
                            }
                        });
                    </script>
                </div>
            `;
        case 'stretchBreak':
            const stretchTimerDuration = vscode.workspace.getConfiguration('codefun').get('stretchTimerDuration', 20);
            return `
                <div class="container">
                    <h1>🚶 Stretch Time</h1>
                    <div id="timerContainer">
                        <button onclick="startStretchTimer()">Start Stretch Timer</button>
                    </div>
                    <p id="stretchMessage">Get up and stretch your body!</p>
                    <div class="stretch-tips">
                        <div class="tip">💡 Reach for the ceiling!</div>
                        <div class="tip">💡 Roll your shoulders</div>
                        <div class="tip">💡 Twist your torso</div>
                    </div>
                    <div class="button-group">
                        <button onclick="skipStep()">Skip</button>
                    </div>
                    <script>
                        const vscode = acquireVsCodeApi();
                        let seconds = ${stretchTimerDuration};
                        let interval;
                        function startStretchTimer() {
                            const timerContainer = document.getElementById('timerContainer');
                            timerContainer.innerHTML = '<div class="timer pulse" id="timer">${stretchTimerDuration}s</div>';
                            const timerEl = document.getElementById('timer');
                            interval = setInterval(() => {
                                seconds--;
                                timerEl.textContent = \`\${seconds}s\`;
                                if (seconds <= 0) {
                                    clearInterval(interval);
                                    timerEl.textContent = "Done! 👍";
                                    document.querySelector('.button-group').innerHTML = '<button onclick="finish()">Done</button><button onclick="skipStep()">Skip</button>';
                                }
                            }, 1000);
                        }
                        function finish() {
                            if (interval) clearInterval(interval);
                            vscode.postMessage({ command: 'finishStretch' });
                        }
                        function skipStep() {
                            if (interval) clearInterval(interval);
                            vscode.postMessage({ command: 'skipStep' });
                        }
                    </script>
                </div>
            `;
        case 'chooseBreak':
            const memePointCost = vscode.workspace.getConfiguration('codefun').get('memePointCost', 10);
            return `
                <div class="container">
                    <h1>🎉 Break Time!</h1>
                    <p>Choose to watch some memes or get back to coding!</p>
                    <div class="button-group">
                        <button onclick="startMemeViewer()">Watch Memes (${memePointCost} points)</button>
                        <button onclick="closeMemeViewer()">Continue Coding</button>
                    </div>
                    <p id="error" class="error-message"></p>
                    <script>
                        const vscode = acquireVsCodeApi();
                        function startMemeViewer() {
                            vscode.postMessage({ command: 'startMemeViewer' });
                        }
                        function closeMemeViewer() {
                            vscode.postMessage({ command: 'closeMemeViewer' });
                        }
                        window.addEventListener('message', event => {
                            const message = event.data;
                            if (message.command === 'showError') {
                                const errorEl = document.getElementById('error');
                                errorEl.textContent = message.message;
                                errorEl.style.display = 'block';
                                setTimeout(() => errorEl.style.display = 'none', 3000);
                            }
                        });
                    </script>
                </div>
            `;
        default:
            return '<div class="container"><h1>Error: Invalid subMode</h1></div>';
    }
}

function getRelaxationPage(state, funPoints) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
            <style>${getCommonStyles()}</style>
        </head>
        <body>
            <div class="progress">Fun Points: <span class="fun-points-value">${funPoints} points</span></div>
            ${getProgressBar(state.breakProgress, state.totalSteps)}
            ${getRelaxationContent(state.subMode)}
        </body>
        </html>
    `;
}

module.exports = { getRelaxationPage };