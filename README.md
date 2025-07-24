# CodeFun: Towards Injecting Fun into IDE :)

CodeFun is a Visual Studio Code extension, an attempt to introduce fun elements into the IDE to distract the Software Engineer, not from work, but from the accumulated frustration due to prolonged work. Through micro-interventions like break reminders, controlled meme-breaks, code-roasts etc, CodeFun makes the session feel less monotonous.

---

## What is this tool?

CodeFun is a locally-running VS Code extension designed to bring fun interactions into the development environment. It works by prompting short breaks and offering modules like a meme viewer, roast generator, and typing activity tracker.

It does not aim to enforce breaks or gamify productivity. It simply introduces options for having fun during work.

Current limitations include minimal personalization and no remote syncing or collaborative features. In future iterations, CodeFun may include more diverse content, personalization, and a study of its broader impact on users.

---

## Features

- Code Roast Generator  
- Meme Viewer  
- Eye Rest Timer  
- Hydration Prompts  
- Stretch Breaks  
- Typing Speed Graphs  
- Keyboard Heatmap  
- Fun Point system with basic streak tracking  

---

## Uses

CodeFun can be used to:

- Introduce short, refreshing breaks during development  
- Observe basic typing activity and self-reflect  
- Add moments of humor or variation in long coding sessions  

---

## How it works

The extension prompts the user with a break reminder every 60 minutes(customizable). On affirmation, It starts with a series of relaxations followed by an option to watch memes by spending the "Fun Points" gained through working. Typing-Analytics and Code-Roasts can be accessed by using the commands.

---

## Repository Structure

In the Repo
- `package.json`: Extension configuration  
- `Readme.md`: Readme file containing information and instructions for use

Inside the src folder
- `extension.js`: Extension entry point  
- `utils.js`: Contains the common styles 
- `*.js`: Each javascript file is one module  

---

## How to use

1. Clone the repository  
2. Run `npm install`  
3. Open the folder in VS Code  
4. Press `F5` to launch in Extension Development Host  
5. Interact with CodeFun from the command palette or via automatic prompts  

---

## Demonstration Video

Navigate to the tool folder. In the cwd, Access the file titled "CodeFun Tool Demo.mp4" for the Tool demonstration video.

---
 
