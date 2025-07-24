const vscode = require('vscode');
const axios = require('axios');
const { getCommonStyles, getProgressBar } = require('./utils');

async function fetchMemes() {
    const config = vscode.workspace.getConfiguration('codefun');
    const apiUrl = config.get('memeApiUrl', 'https://meme-api.com/gimme/10');
    try {
        const response = await axios.get(apiUrl);
        const memes = response.data.memes || [response.data]; // Handle single meme or array
        return memes.map(meme => ({
            url: meme.url,
            title: meme.title || 'Meme'
        }));
    } catch (error) {
        console.error('Error fetching memes:', error.message);
        vscode.window.showErrorMessage('Failed to fetch memes. Try again later.');
        return [];
    }
}

function getMemeViewerContent(state, funPoints, webview) {
    const config = vscode.workspace.getConfiguration('codefun');
    const pointCost = config.get('memePointCost', 10);
    const meme = state.memes[state.currentMemeIndex] || { url: '', title: 'No Meme Available' };
    const prevDisabled = state.currentMemeIndex === 0 ? 'disabled' : '';
    const nextDisabled = state.currentMemeIndex >= state.memes.length - 1 || state.viewedMemes >= 10 ? 'disabled' : '';
    const canViewMeme = funPoints >= pointCost ? '' : 'disabled';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: https://* vscode-webview-resource:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';">
            <style>${getCommonStyles()}</style>
        </head>
        <body>
            <div class="progress">Fun Points: <span class="fun-points-value">${funPoints} points</span></div>
            ${getProgressBar(state.breakProgress, state.totalSteps)}
            <div class="meme-container">
                <h1>😂 Enjoy a Meme Break!</h1>
                <p>View another meme for ${pointCost} Fun Points or return to coding.</p>
                ${meme.url ? `
                    <img src="${meme.url}" alt="${meme.title}" class="meme-image">
                    <p>${meme.title}</p>
                ` : `
                    <p>No memes available. Try again later!</p>
                `}
                <div class="button-group">
                    <button onclick="previousMeme()" ${prevDisabled}>Previous</button>
                    <button onclick="nextMeme()" ${nextDisabled}>Next (${pointCost} points)</button>
                    <button onclick="closeMemeViewer()">Continue Coding</button>
                </div>
                <p id="error" class="error-message"></p>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                function nextMeme() {
                    vscode.postMessage({ command: 'viewMeme', index: ${state.currentMemeIndex + 1} });
                }
                function previousMeme() {
                    vscode.postMessage({ command: 'viewMeme', index: ${state.currentMemeIndex - 1} });
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
                    if (message.command === 'updateFunPoints') {
                        document.querySelector('.fun-points-value').textContent = \`\${message.funPoints} points\`;
                    }
                });
            </script>
        </body>
        </html>
    `;
}

module.exports = { fetchMemes, getMemeViewerContent };