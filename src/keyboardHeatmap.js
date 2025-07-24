const keyboardLayout = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['Caps', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', 'Enter'],
    ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
    ['Ctrl', 'Win', 'Alt', 'Space', 'Alt', 'Win', 'Menu', 'Ctrl']
];

const keySizes = {
    'Backspace': 2,
    'Tab': 1.5,
    'Caps': 1.75,
    'Enter': 2.25,
    'Shift': 2.25,
    'Space': 6.25,
    'Ctrl': 1.25,
    'Win': 1.25,
    'Alt': 1.25,
    'Menu': 1.25
};

function getKeyboardHeatmapHtml() {
    return `
    <div class="keyboard-heatmap-container">
        <h3>Keyboard Heatmap</h3>
        <div class="keyboard">
            ${keyboardLayout.map((row, rowIndex) => `
                <div class="keyboard-row" id="row-${rowIndex}">
                    ${row.map(key => {
                        const isSpecialKey = key.length > 1;
                        const keySize = keySizes[key] || 1;
                        const keyLower = key.toLowerCase();
                        return `<div class="key ${isSpecialKey ? 'special-key' : ''}" 
                                 data-key="${keyLower}"
                                 data-heat="0"
                                 style="flex: ${keySize}">
                                 <span class="key-text">${key}</span>
                             </div>`;
                    }).join('')}
                </div>
            `).join('')}
        </div>
    </div>`;
}

function getKeyboardHeatmapStyle() {
    return `
    .keyboard-heatmap-container {
        margin-top: 30px;
        width: 100%;
        max-width: 900px;
        padding: 15px;
        background: rgba(30, 30, 30, 0.6);
        border-radius: 10px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    }
    .keyboard-heatmap-container h3 {
        text-align: center;
        margin-top: 0;
        margin-bottom: 15px;
        color: #e0e0e0;
    }
    .keyboard {
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 100%;
        user-select: none;
    }
    .keyboard-row {
        display: flex;
        justify-content: center;
        gap: 5px;
    }
    .key {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 40px;
        min-width: 40px;
        border-radius: 5px;
        font-size: 14px;
        background: rgba(60, 60, 60, 0.8);
        color: #e0e0e0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }
    .key.special-key { font-size: 12px; }
    .key::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0);
        transition: background-color 0.5s ease;
        z-index: 0;
    }
    .key-text { position: relative; z-index: 1; }
    .key[data-heat="1"]::before { background-color: rgba(255, 230, 0, 0.1); }
    .key[data-heat="2"]::before { background-color: rgba(255, 200, 0, 0.2); }
    .key[data-heat="3"]::before { background-color: rgba(255, 170, 0, 0.3); }
    .key[data-heat="4"]::before { background-color: rgba(255, 140, 0, 0.4); }
    .key[data-heat="5"]::before { background-color: rgba(255, 110, 0, 0.5); }
    .key[data-heat="6"]::before { background-color: rgba(255, 80, 0, 0.6); }
    .key[data-heat="7"]::before { background-color: rgba(255, 50, 0, 0.7); }
    .key[data-heat="8"]::before { background-color: rgba(255, 20, 0, 0.8); }
    .key[data-heat="9"]::before { background-color: rgba(255, 0, 0, 0.9); }
    @keyframes keypress {
        0% { transform: scale(1); }
        50% { transform: scale(0.95); }
        100% { transform: scale(1); }
    }
    .key.pressed { animation: keypress 0.3s ease; }
    `;
}

function getKeyboardHeatmapScript() {
    return `
    let keyHeatLevels = {};
    let isHeatmapInitialized = false;
    let lastKeyPressData = {};
    let heatmapInitializationAttempts = 0;

    function initKeyboardHeatmap(keyPressData) {
        console.log('Initializing keyboard heatmap with data:', keyPressData);
        if (!document.querySelector('.key')) {
            console.log('Keyboard DOM elements not ready yet, will retry');
            lastKeyPressData = keyPressData || {};
            if (heatmapInitializationAttempts < 5) {
                heatmapInitializationAttempts++;
                setTimeout(() => initKeyboardHeatmap(lastKeyPressData), 300);
            } else {
                console.error('Failed to find keyboard elements after multiple attempts');
            }
            return;
        }
        const keys = document.querySelectorAll('.key');
        keys.forEach(key => key.setAttribute('data-heat', '0'));
        lastKeyPressData = keyPressData || {};
        if (keyPressData && Object.keys(keyPressData).length > 0) {
            let maxPresses = 1;
            Object.keys(keyPressData).forEach(key => {
                if (keyPressData[key] > maxPresses) maxPresses = keyPressData[key];
            });
            Object.keys(keyPressData).forEach(key => {
                const normalizedKey = key.toLowerCase();
                const keyElement = document.querySelector(\`.key[data-key="\${normalizedKey}"]\`);
                if (keyElement) {
                    const heatLevel = Math.min(9, Math.max(1, Math.floor((keyPressData[key] / maxPresses) * 9)));
                    keyElement.setAttribute('data-heat', heatLevel.toString());
                    keyHeatLevels[normalizedKey] = heatLevel;
                }
            });
        }
        isHeatmapInitialized = true;
        console.log('Keyboard heatmap initialized successfully');
    }

    function updateKeyHeat(keys) {
        if (!keys || !Array.isArray(keys) || keys.length === 0) return;
        console.log('Updating keyboard heat for keys:', keys);
        if (!isHeatmapInitialized) {
            keys.forEach(key => {
                const normalizedKey = key.toLowerCase();
                lastKeyPressData[normalizedKey] = (lastKeyPressData[normalizedKey] || 0) + 1;
            });
            initKeyboardHeatmap(lastKeyPressData);
            return;
        }
        keys.forEach(key => {
            const normalizedKey = key.toLowerCase();
            lastKeyPressData[normalizedKey] = (lastKeyPressData[normalizedKey] || 0) + 1;
        });
        let maxPresses = 1;
        Object.keys(lastKeyPressData).forEach(key => {
            if (lastKeyPressData[key] > maxPresses) maxPresses = lastKeyPressData[key];
        });
        keys.forEach(key => {
            const normalizedKey = key.toLowerCase();
            const keyElement = document.querySelector(\`.key[data-key="\${normalizedKey}"]\`);
            if (keyElement) {
                keyElement.classList.add('pressed');
                setTimeout(() => keyElement.classList.remove('pressed'), 300);
                const heatLevel = Math.min(9, Math.max(1, Math.floor((lastKeyPressData[normalizedKey] / maxPresses) * 9)));
                keyElement.setAttribute('data-heat', heatLevel.toString());
                keyHeatLevels[normalizedKey] = heatLevel;
                console.log(\`Updated key "\${normalizedKey}" to heat level \${heatLevel}\`);
            } else {
                console.log(\`Key element not found for "\${normalizedKey}"\`);
            }
        });
        Object.keys(lastKeyPressData).forEach(key => {
            if (!keys.includes(key)) {
                const keyElement = document.querySelector(\`.key[data-key="\${key}"]\`);
                if (keyElement) {
                    const heatLevel = Math.min(9, Math.max(1, Math.floor((lastKeyPressData[key] / maxPresses) * 9)));
                    keyElement.setAttribute('data-heat', heatLevel.toString());
                    keyHeatLevels[key] = heatLevel;
                }
            }
        });
    }

    function resetKeyboardHeatmap() {
        console.log('Resetting keyboard heatmap');
        const keys = document.querySelectorAll('.key');
        keys.forEach(key => key.setAttribute('data-heat', '0'));
        keyHeatLevels = {};
        lastKeyPressData = {};
        isHeatmapInitialized = false;
        heatmapInitializationAttempts = 0;
    }

    window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'initKeyboardHeatmap') {
            console.log('Received initKeyboardHeatmap command with data', message.keyPressData);
            initKeyboardHeatmap(message.keyPressData);
        } else if (message.command === 'updateKeyHeat') {
            updateKeyHeat(message.keys);
        } else if (message.command === 'reset' && message.clearKeyHeatmap) {
            resetKeyboardHeatmap();
        }
    });

    document.addEventListener('DOMContentLoaded', function() {
        console.log('Keyboard heatmap DOM is ready');
        let checkAttempts = 0;
        const checkInterval = setInterval(() => {
            if (document.querySelector('.key')) {
                clearInterval(checkInterval);
                vscode.postMessage({ command: 'heatmapReady' });
                console.log('Found keyboard keys, sent heatmapReady signal');
            } else {
                checkAttempts++;
                if (checkAttempts >= 10) {
                    clearInterval(checkInterval);
                    console.error('Could not find keyboard keys after multiple attempts');
                }
            }
        }, 200);
    });
    `;
}

module.exports = { getKeyboardHeatmapHtml, getKeyboardHeatmapStyle, getKeyboardHeatmapScript };