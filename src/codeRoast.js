const vscode = require('vscode');
const axios = require('axios');

// Constants
const GEMINI_API_KEY = "AIzaSyCy5XhqxbFGUp5uWG7yXnOt_X3z3ntE-NQ";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent";

function confirmAndRoast(funPoints, roastDiagnostics, updateFunPoints) {
    console.log("[DEBUG] Showing confirmation message for roast");
    vscode.window.showInformationMessage(
        "Ready for a roast? Your code might not survive this... 🔥😈",
        "No 🙈",
        "Yes 😼"
    ).then(selection => {
        console.log(`[DEBUG] User selected: ${selection}`);
        if (selection === "No 🙈") {
            vscode.window.showInformationMessage("Wise choice! Your code lives another day. 😏");
            return;
        }
        if (selection === "Yes 😼") {
            const roastPointCost = vscode.workspace.getConfiguration('codefun').get('roastPointCost', 20);
            if (funPoints < roastPointCost) {
                vscode.window.showErrorMessage(`Not enough Fun Points! Need ${roastPointCost} points to roast your code.`);
                return;
            }
            analyzeAndRoastCode(funPoints, roastDiagnostics, updateFunPoints);
        }
    });
}

async function analyzeAndRoastCode(funPoints, roastDiagnostics, updateFunPoints) {
    console.log("[DEBUG] analyzeAndRoastCode() called");
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage("No active code to roast! Open a file and try again.");
        console.log("[DEBUG] No active editor");
        return;
    }

    const document = editor.document;
    const documentText = document.getText();
    console.log("[DEBUG] Sending code to Gemini");

    const roastResponse = await getRoastFromGemini(documentText);
    if (roastResponse) {
        console.log("[DEBUG] Roast response received");
        applyRoastDiagnostics(document, roastResponse, roastDiagnostics);
        funPoints -= vscode.workspace.getConfiguration('codefun').get('roastPointCost', 20);
        updateFunPoints(funPoints);
        vscode.window.showInformationMessage(`Code roasted! 20 Fun Points deducted. Hover over blue squiggly lines to see the roasts!`);
    } else {
        console.log("[DEBUG] Roast response is null");
        vscode.window.showErrorMessage("Failed to get a roast from Gemini. Try again later.");
    }
}

async function getRoastFromGemini(code) {
    console.log("[DEBUG] getRoastFromGemini() sending request...");
    try {
        const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            contents: [{
                role: "user",
                parts: [{ text: `Analyze this code and provide 3-5 sarcastic, humorous roasts targeting specific lines or code elements (e.g., variable names, functions, comments). Each roast should be a single sentence, include emojis, and specify the line number or code element. Return as a list of strings, e.g., "Line 5: That variable name is so bad it deserves a timeout! 😖"\n\n${code}` }]
            }]
        }, {
            headers: { "Content-Type": "application/json" }
        });

        const roastText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("[DEBUG] Roast received:", roastText);
        return roastText.split("\n").filter(line => line.trim() !== "");
    } catch (error) {
        console.error("[ERROR] Failed to fetch roast:", error.message);
        vscode.window.showErrorMessage(`API Error: ${error.response?.data?.error?.message || error.message}`);
        return null;
    }
}

function applyRoastDiagnostics(document, roasts, roastDiagnostics) {
    console.log("[DEBUG] Applying roast diagnostics");
    roastDiagnostics.clear();

    const documentText = document.getText().split("\n");
    const lastLineIndex = documentText.length - 1;
    const emojis = ["😂", "🔥", "🤦‍♂️", "🎭", "😵", "🐍", "🤡", "💀", "🧐", "👀"];
    let diagnostics = [];

    roasts.forEach((roast, index) => {
        // Extract line number from roast (e.g., "Line 5: ...")
        let lineIndex = lastLineIndex;
        const lineMatch = roast.match(/Line\s+(\d+)/i);
        if (lineMatch) {
            lineIndex = Math.min(parseInt(lineMatch[1]) - 1, lastLineIndex); // 1-based to 0-based
        } else {
            // Fallback to keyword search
            const keywordMatch = roast.match(/`([^`]+)`/);
            if (keywordMatch) {
                const keyword = keywordMatch[1];
                lineIndex = documentText.findIndex(line => line.includes(keyword)) || lastLineIndex;
            }
        }

        const lineText = documentText[lineIndex];
        const endPosition = new vscode.Position(lineIndex, lineText.length);
        const range = new vscode.Range(endPosition, endPosition);

        const diagnostic = new vscode.Diagnostic(
            range,
            `${emojis[index % emojis.length]} ${roast}`,
            vscode.DiagnosticSeverity.Information
        );
        diagnostic.source = 'codefunRoast';
        diagnostic.code = 'fixRoast';
        diagnostics.push(diagnostic);
    });

    roastDiagnostics.set(document.uri, diagnostics);
    console.log("[DEBUG] Diagnostics set");
}

module.exports = { confirmAndRoast };