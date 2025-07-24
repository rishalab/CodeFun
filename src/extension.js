const vscode = require('vscode');
const { getRelaxationPage } = require('./relaxation');
const { getMemeViewerContent } = require('./memeViewer');
const { confirmAndRoast } = require('./codeRoast');
const { TypingSpeedFeature } = require('./typingSpeed');

function activate(context) {
    console.log('CodeFun extension activated');

    let relaxationPanel;
    let roastDiagnostics = vscode.languages.createDiagnosticCollection('codefunRoast');

    let state = {
        subMode: 'eyeIntro',
        breakProgress: 0,
        totalSteps: 4, // eyeTimer, waterBreak, stretchBreak, memeViewer
        memes: [],
        currentMemeIndex: 0,
        viewedMemes: 0
    };

    // Load Fun Points from global state
    let funPoints = context.globalState.get('funPoints', 0);

    // Initialize typing speed feature
    const typingSpeed = new TypingSpeedFeature(context);

    // Register start relaxation command
    context.subscriptions.push(
        vscode.commands.registerCommand('codefun.startRelaxation', async () => {
            if (relaxationPanel) {
                relaxationPanel.reveal(vscode.ViewColumn.One);
            } else {
                relaxationPanel = vscode.window.createWebviewPanel(
                    'codefunRelaxation',
                    'CodeFun Relaxation',
                    vscode.ViewColumn.One,
                    { enableScripts: true, retainContextWhenHidden: true }
                );
                relaxationPanel._state = state;

                relaxationPanel.webview.html = getRelaxationPage(state, funPoints);

                relaxationPanel.webview.onDidReceiveMessage(
                    async message => {
                        switch (message.command) {
                            case 'startEyeTimer':
                                state.subMode = 'eyeTimer';
                                state.breakProgress = 1;
                                relaxationPanel.webview.html = getRelaxationPage(state, funPoints);
                                break;
                            case 'nextAfterEyeTimer':
                                state.subMode = 'waterBreak';
                                state.breakProgress = 2;
                                relaxationPanel.webview.html = getRelaxationPage(state, funPoints);
                                break;
                            case 'submitWater':
                                const amount = Number(message.amount);
                                const minWater = vscode.workspace.getConfiguration('codefun').get('waterMinimum', 250);
                                if (isNaN(amount) || amount < minWater) {
                                    relaxationPanel.webview.postMessage({
                                        command: 'showError',
                                        message: `Please drink at least ${minWater} ml!`
                                    });
                                    return;
                                }
                                funPoints += Math.floor(amount / 100) * 10;
                                context.globalState.update('funPoints', funPoints);
                                relaxationPanel.webview.postMessage({
                                    command: 'showReward',
                                    amount: Math.floor(amount / 100) * 10
                                });
                                state.subMode = 'stretchBreak';
                                state.breakProgress = 3;
                                relaxationPanel.webview.html = getRelaxationPage(state, funPoints);
                                break;
                            case 'finishStretch':
                                funPoints += 50;
                                context.globalState.update('funPoints', funPoints);
                                relaxationPanel.webview.postMessage({
                                    command: 'showReward',
                                    amount: 50
                                });
                                state.subMode = 'chooseBreak';
                                state.breakProgress = 3;
                                relaxationPanel.webview.html = getRelaxationPage(state, funPoints);
                                break;
                            case 'startMemeViewer':
                                const memePointCost = vscode.workspace.getConfiguration('codefun').get('memePointCost', 10);
                                if (funPoints < memePointCost) {
                                    relaxationPanel.webview.postMessage({
                                        command: 'showError',
                                        message: `Not enough Fun Points! Need ${memePointCost} points to view memes.`
                                    });
                                    return;
                                }
                                funPoints -= memePointCost;
                                context.globalState.update('funPoints', funPoints);
                                state.subMode = 'memeViewer';
                                state.breakProgress = 4;
                                state.viewedMemes = 1;
                                const memeViewer = require('./memeViewer');
                                state.memes = await memeViewer.fetchMemes();
                                state.currentMemeIndex = 0;
                                relaxationPanel.webview.html = getMemeViewerContent(state, funPoints, relaxationPanel.webview);
                                break;
                            case 'viewMeme':
                                const pointCost = vscode.workspace.getConfiguration('codefun').get('memePointCost', 10);
                                if (funPoints < pointCost) {
                                    relaxationPanel.webview.postMessage({
                                        command: 'showError',
                                        message: `Not enough Fun Points! Need ${pointCost} points to view another meme.`
                                    });
                                    return;
                                }
                                funPoints -= pointCost;
                                context.globalState.update('funPoints', funPoints);
                                state.currentMemeIndex = message.index;
                                state.viewedMemes = Math.min(state.viewedMemes + 1, 10);
                                relaxationPanel.webview.postMessage({
                                    command: 'updateFunPoints',
                                    funPoints: funPoints
                                });
                                relaxationPanel.webview.html = getMemeViewerContent(state, funPoints, relaxationPanel.webview);
                                break;
                            case 'closeMemeViewer':
                                relaxationPanel.dispose();
                                relaxationPanel = null;
                                state.subMode = 'eyeIntro';
                                state.breakProgress = 0;
                                state.memes = [];
                                state.currentMemeIndex = 0;
                                state.viewedMemes = 0;
                                vscode.window.showInformationMessage('Back to coding! Keep the fun going!');
                                break;
                            case 'skipStep':
                                switch (state.subMode) {
                                    case 'eyeTimer':
                                        state.subMode = 'waterBreak';
                                        state.breakProgress = 2;
                                        break;
                                    case 'waterBreak':
                                        state.subMode = 'stretchBreak';
                                        state.breakProgress = 3;
                                        break;
                                    case 'stretchBreak':
                                        state.subMode = 'chooseBreak';
                                        state.breakProgress = 3;
                                        break;
                                    default:
                                        return;
                                }
                                relaxationPanel.webview.html = getRelaxationPage(state, funPoints);
                                break;
                        }
                    },
                    undefined,
                    context.subscriptions
                );

                relaxationPanel.onDidDispose(() => {
                    relaxationPanel = null;
                    state.subMode = 'eyeIntro';
                    state.breakProgress = 0;
                    state.memes = [];
                    state.currentMemeIndex = 0;
                    state.viewedMemes = 0;
                }, null, context.subscriptions);
            }
        })
    );

    // Register analyze and roast command
    context.subscriptions.push(
        vscode.commands.registerCommand('codefun.analyzeAndRoast', () => {
            const roastPointCost = vscode.workspace.getConfiguration('codefun').get('roastPointCost', 20);
            if (funPoints < roastPointCost) {
                vscode.window.showErrorMessage(`Not enough Fun Points! Need ${roastPointCost} points to roast your code.`);
                return;
            }
            confirmAndRoast(funPoints, roastDiagnostics, (newPoints) => {
                funPoints = newPoints;
                context.globalState.update('funPoints', funPoints);
            });
        })
    );

    // Register code action provider for removing roasts
    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider('*', new RoastFixProvider(), {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
        })
    );

    // Register show typing speed details command
    context.subscriptions.push(
        vscode.commands.registerCommand('codefun.showTypingSpeedDetails', () => {
            typingSpeed.toggleVisualizerPanel();
        })
    );

    // Clear diagnostics and decorations when the editor changes or file closes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                roastDiagnostics.delete(editor.document.uri);
                typingSpeed.clearOverlay();
            }
        }),
        vscode.workspace.onDidCloseTextDocument(doc => {
            roastDiagnostics.delete(doc.uri);
            if (vscode.window.activeTextEditor?.document === doc) {
                typingSpeed.clearOverlay();
            }
        })
    );
}

function deactivate() {
    console.log('CodeFun extension deactivated');
}

class RoastFixProvider {
    provideCodeActions(document, range, context) {
        const fixActions = [];
        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source === 'codefunRoast') {
                const fix = new vscode.CodeAction('Remove Roast', vscode.CodeActionKind.QuickFix);
                fix.diagnostics = [diagnostic];
                fix.command = {
                    title: 'Remove Roast',
                    command: 'codefun.removeRoast',
                    arguments: [document.uri]
                };
                fixActions.push(fix);
            }
        }
        return fixActions;
    }
}

module.exports = { activate, deactivate };