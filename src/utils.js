function getCommonStyles() {
    return `
        :root {
            --vscode-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            --vscode-button-bg: var(--vscode-button-background);
            --vscode-button-hover: var(--vscode-button-hoverBackground);
            --vscode-input-background: var(--vscode-editorWidget-background);
            --vscode-input-border: var(--vscode-editorWidget-border);
        }
        body {
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            line-height: 1.6;
            animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            text-align: center;
        }
        .meme-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 90vh;
        }
        h1 {
            color: var(--vscode-editor-foreground);
            margin-bottom: 1.5rem;
        }
        .timer {
            font-size: 2.5rem;
            margin: 2rem 0;
            color: var(--vscode-button-background);
            animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .button-group {
            margin-top: 2rem;
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        button {
            background: var(--vscode-button-bg);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 0.8rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.95rem;
        }
        button:hover {
            background: var(--vscode-button-hover);
            transform: translateY(-1px);
            box-shadow: 0 3px 6px rgba(0,0,0,0.1);
        }
        button:active {
            transform: translateY(0);
            box-shadow: none;
        }
        .input-group {
            margin: 2rem auto;
            max-width: 300px;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .water-input {
            flex: 1;
            padding: 0.8rem;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            background: var(--vscode-input-background);
            color: var(--vscode-editor-foreground);
            font-size: 1rem;
        }
        .unit {
            color: var(--vscode-descriptionForeground);
        }
        .error-message {
            color: #ff4444;
            margin: 1rem 0;
            display: none;
        }
        .meme-image {
            max-width: 90%;
            max-height: 60vh;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            margin: 2rem 0;
            object-fit: contain;
        }
        .progress {
            color: var(--vscode-descriptionForeground);
            margin: 1rem 0;
            font-size: 0.9rem;
        }
        .stretch-tips {
            margin: 2rem 0;
            display: grid;
            gap: 1rem;
        }
        .tip {
            padding: 1rem;
            background: var(--vscode-editorWidget-background);
            border-radius: 6px;
            font-size: 0.95rem;
        }
        .progress-bar {
            width: 100%;
            height: 6px;
            background: var(--vscode-editorWidget-background);
            border-radius: 3px;
            margin: 2rem 0;
        }
        .progress-fill {
            height: 100%;
            background: var(--vscode-button-background);
            border-radius: 3px;
            transition: width 0.3s ease;
        }
    `;
}

function getProgressBar(currentStep, totalSteps) {
    const width = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
    return `<div class="progress-bar"><div class="progress-fill" style="width: ${width}%"></div></div>`;
}

module.exports = { getCommonStyles, getProgressBar };