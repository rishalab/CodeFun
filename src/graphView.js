const vscode = require('vscode');

let historyPanel;

function showHistoryPanel(context, history) {
    if (historyPanel) {
        historyPanel.reveal(vscode.ViewColumn.One);
        historyPanel.webview.postMessage({ 
            command: 'updateHistory',
            history: history 
        });
        return;
    }

    historyPanel = vscode.window.createWebviewPanel(
        'codefunTypingSpeedHistory',
        'CodeFun Typing Speed History',
        vscode.ViewColumn.One,
        { enableScripts: true, retainContextWhenHidden: true }
    );

    historyPanel.webview.html = getHistoryWebviewContent(historyPanel.webview, context, history);

    historyPanel.onDidDispose(() => {
        historyPanel = undefined;
    }, null, context.subscriptions);

    historyPanel.webview.onDidReceiveMessage(
        message => {
            if (message.command === 'closePanel') {
                if (historyPanel) {
                    historyPanel.dispose();
                    historyPanel = undefined;
                }
            }
        },
        undefined,
        context.subscriptions
    );
}

function getHistoryWebviewContent(webview, context, history) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Typing Speed History</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.0/chart.min.js"></script>
        <style>
            body {
                margin: 0;
                padding: 20px;
                background: transparent;
                font-family: 'Segoe UI', sans-serif;
                color: #e0e0e0;
                display: flex;
                flex-direction: column;
                height: 100vh;
                box-sizing: border-box;
            }
            h1 {
                margin-top: 0;
                margin-bottom: 10px;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .chart-controls {
                display: flex;
                gap: 10px;
                align-items: center;
            }
            #chart-container {
                flex: 1;
                position: relative;
                min-height: 300px;
                width: 100%;
            }
            #stats-panel {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 20px;
                margin-bottom: 20px;
            }
            .stat-card {
                background: rgba(30, 30, 30, 0.6);
                border-radius: 10px;
                padding: 15px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .stat-value {
                font-size: 2.5em;
                font-weight: bold;
                margin: 5px 0;
            }
            .stat-label {
                font-size: 0.9em;
                opacity: 0.7;
            }
            button {
                background: rgba(30, 30, 30, 0.8);
                border: 1px solid #555;
                color: #e0e0e0;
                padding: 8px 15px;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            button:hover {
                background: rgba(60, 60, 60, 0.8);
            }
            select {
                background: rgba(30, 30, 30, 0.8);
                border: 1px solid #555;
                color: #e0e0e0;
                padding: 8px;
                border-radius: 4px;
            }
            .no-data {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: #888;
                font-size: 1.2em;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Typing Speed History</h1>
            <div class="chart-controls">
                <select id="time-range">
                    <option value="last-hour">Last Hour</option>
                    <option value="last-day" selected>Last Day</option>
                    <option value="last-week">Last Week</option>
                    <option value="all-time">All Time</option>
                </select>
                <button id="back-button">← Back</button>
            </div>
        </div>
        <div id="stats-panel">
            <div class="stat-card">
                <div class="stat-label">Peak Speed</div>
                <div id="peak-wpm" class="stat-value">0</div>
                <div class="stat-label">WPM</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average Speed</div>
                <div id="avg-wpm" class="stat-value">0</div>
                <div class="stat-label">WPM</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Samples Collected</div>
                <div id="sample-count" class="stat-value">0</div>
                <div class="stat-label">Data Points</div>
            </div>
        </div>
        <div id="chart-container">
            <canvas id="wpm-chart"></canvas>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            let wpmChart = null;
            let wpmHistory = ${JSON.stringify(history)};
            let currentTimeRange = 'last-day';

            function filterDataByTimeRange(history, range) {
                const now = Date.now();
                let cutoffTime;
                switch(range) {
                    case 'last-hour': cutoffTime = now - (60 * 60 * 1000); break;
                    case 'last-day': cutoffTime = now - (24 * 60 * 60 * 1000); break;
                    case 'last-week': cutoffTime = now - (7 * 24 * 60 * 60 * 1000); break;
                    case 'all-time': return history;
                }
                return history.filter(entry => entry.timestamp >= cutoffTime);
            }

            function sampleDataForDisplay(history, maxPoints = 100) {
                if (history.length <= maxPoints) return history;
                const step = Math.ceil(history.length / maxPoints);
                return history.filter((_, index) => index % step === 0);
            }

            function formatTimeLabel(timestamp, range) {
                const date = new Date(timestamp);
                switch(range) {
                    case 'last-hour': return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    case 'last-day': return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    case 'last-week': return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
                    case 'all-time': return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    default: return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            }

            function updateStats(filteredData) {
                if (filteredData.length === 0) {
                    document.getElementById('peak-wpm').textContent = '0';
                    document.getElementById('avg-wpm').textContent = '0';
                    document.getElementById('sample-count').textContent = '0';
                    return;
                }
                const minTime = filteredData[0].timestamp;
                const validData = filteredData.filter(entry => (entry.timestamp - minTime) >= 5000); // Only after 5 seconds
                const peakWpm = validData.length > 0 ? Math.max(...validData.map(entry => entry.wpm)) : 0;
                document.getElementById('peak-wpm').textContent = peakWpm.toFixed(0);
                const totalWpm = filteredData.reduce((sum, entry) => sum + entry.wpm, 0);
                const avgWpm = totalWpm / filteredData.length;
                document.getElementById('avg-wpm').textContent = avgWpm.toFixed(1);
                document.getElementById('sample-count').textContent = filteredData.length;
            }

            function initChart() {
                const ctx = document.getElementById('wpm-chart').getContext('2d');
                wpmChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'WPM over time',
                            data: [],
                            borderColor: '#00BFFF',
                            backgroundColor: 'rgba(0,191,255,0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#e0e0e0' } },
                            x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#e0e0e0', maxTicksLimit: 10, callback: function(value, index, values) {
                                if (values.length > 20) {
                                    if (index % Math.ceil(values.length / 10) !== 0) return '';
                                }
                                return this.getLabelForValue(value);
                            } } }
                        },
                        plugins: {
                            legend: { labels: { color: '#e0e0e0' } },
                            tooltip: { callbacks: { title: function(tooltipItems) {
                                const item = tooltipItems[0];
                                const index = item.dataIndex;
                                const filteredData = filterDataByTimeRange(wpmHistory, currentTimeRange);
                                const sampledData = sampleDataForDisplay(filteredData);
                                if (sampledData[index]) {
                                    const timestamp = sampledData[index].timestamp;
                                    return new Date(timestamp).toLocaleString();
                                }
                                return '';
                            } } }
                        }
                    }
                });
            }

            function updateChart(history, range) {
                if (!wpmChart) initChart();
                const filteredData = filterDataByTimeRange(history, range);
                updateStats(filteredData);
                if (filteredData.length === 0) {
                    if (!document.querySelector('.no-data')) {
                        const noDataMsg = document.createElement('div');
                        noDataMsg.className = 'no-data';
                        noDataMsg.textContent = 'No typing data available for this time period';
                        document.getElementById('chart-container').appendChild(noDataMsg);
                    }
                    wpmChart.data.labels = [];
                    wpmChart.data.datasets[0].data = [];
                    wpmChart.update();
                    return;
                } else {
                    const noDataMsg = document.querySelector('.no-data');
                    if (noDataMsg) noDataMsg.remove();
                }
                const sampledData = sampleDataForDisplay(filteredData);
                const labels = sampledData.map(entry => formatTimeLabel(entry.timestamp, range));
                const data = sampledData.map(entry => entry.wpm);
                wpmChart.data.labels = labels;
                wpmChart.data.datasets[0].data = data;
                let title = 'WPM over ';
                switch(range) {
                    case 'last-hour': title += 'the Last Hour'; break;
                    case 'last-day': title += 'the Last Day'; break;
                    case 'last-week': title += 'the Last Week'; break;
                    case 'all-time': title += 'All Time'; break;
                }
                wpmChart.data.datasets[0].label = title;
                wpmChart.update();
            }

            window.addEventListener('load', () => {
                initChart();
                updateChart(wpmHistory, currentTimeRange);
            });

            document.getElementById('time-range').addEventListener('change', (e) => {
                currentTimeRange = e.target.value;
                updateChart(wpmHistory, currentTimeRange);
            });

            document.getElementById('back-button').addEventListener('click', () => {
                vscode.postMessage({ command: 'closePanel' });
            });

            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'updateHistory') {
                    wpmHistory = message.history;
                    updateChart(wpmHistory, currentTimeRange);
                }
            });
        </script>
    </body>
    </html>
    `;
}

module.exports = { showHistoryPanel };