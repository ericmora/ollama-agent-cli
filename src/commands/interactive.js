import readline from 'readline';
import axios from 'axios';
import { handleChat, clearHistory } from './chat.js';
import { getSettings, saveSettings } from '../services/settings.js';
import { colors } from '../utils/constants.js';

export async function startInteractiveSession(model, host, debug, yes, yesAll) {
    let settings = await getSettings();
    let currentModel = model;

    console.log(`${colors.yellow}Starting interactive Ollama chat. Type /bye or /exit to quit. Press ESC to cancel a command.${colors.reset}`);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${colors.green}> ${colors.reset}`,
    });

    let controller = new AbortController();

    process.stdin.on('keypress', (_, key) => {
        if (key.name === 'escape') {
            controller.abort();
            controller = new AbortController();
        }
    });

    rl.on('line', async (line) => {
        const trimmedLine = line.trim();
        if (trimmedLine === '/bye' || trimmedLine === '/exit') {
            rl.close();
            return;
        }
        if (trimmedLine === '/clear') {
            clearHistory(settings.language);
            console.log(`${colors.yellow}Conversation history cleared.${colors.reset}`);
            rl.prompt();
            return;
        }
        if (trimmedLine === '/help') {
            console.log(`${colors.cyan}Available commands:${colors.reset}`);
            console.log(`  ${colors.green}/bye${colors.reset} or ${colors.green}/exit${colors.reset} - Exit the interactive chat.`);
            console.log(`  ${colors.green}/clear${colors.reset} - Clear the conversation history.`);
            console.log(`  ${colors.green}/models${colors.reset} - List and select an Ollama model.`);
            console.log(`  ${colors.green}/settings${colors.reset} - Configure agent settings.`);
            console.log(`  ${colors.green}/help${colors.reset} - Display this help message.`);
            rl.prompt();
            return;
        }
        if (trimmedLine === '/settings') {
            console.log(`${colors.cyan}Current Settings:${colors.reset}`);
            console.log(`  Language: ${settings.language}`);
            console.log(`  Show Thinking: ${settings.showThinking ? 'Yes' : 'No'}`);

            rl.question(`${colors.green}Enter setting to change (language, showThinking) or press Enter to exit: ${colors.reset}`, async (settingToChange) => {
                settingToChange = settingToChange.trim().toLowerCase();
                if (settingToChange === 'language') {
                    rl.question(`${colors.green}Enter new language (en, es): ${colors.reset}`, async (newLang) => {
                        newLang = newLang.trim().toLowerCase();
                        if (['en', 'es'].includes(newLang)) {
                            settings.language = newLang;
                            await saveSettings(settings);
                            console.log(`${colors.yellow}Language updated to: ${newLang}.${colors.reset}`);
                        } else {
                            console.log(`${colors.red}Invalid language. Please use 'en' or 'es'.${colors.reset}`);
                        }
                        rl.prompt();
                    });
                } else if (settingToChange === 'showthinking') {
                    rl.question(`${colors.green}Show thinking fragments? (yes/no): ${colors.reset}`, async (newVal) => {
                        newVal = newVal.trim().toLowerCase();
                        if (['yes', 'no'].includes(newVal)) {
                            settings.showThinking = newVal === 'yes';
                            await saveSettings(settings);
                            console.log(`${colors.yellow}Show Thinking updated to: ${settings.showThinking ? 'Yes' : 'No'}.${colors.reset}`);
                        } else {
                            console.log(`${colors.red}Invalid input. Please use 'yes' or 'no'.${colors.reset}`);
                        }
                        rl.prompt();
                    });
                } else if (settingToChange === '') {
                    rl.prompt();
                } else {
                    console.log(`${colors.red}Invalid setting. Please choose 'language' or 'showThinking'.${colors.reset}`);
                    rl.prompt();
                }
            });
            return;
        }
        if (trimmedLine === '/models') {
            try {
                const modelsUrl = `${host}/api/tags`;
                const response = await axios.get(modelsUrl);
                const models = response.data.models;

                if (models.length === 0) {
                    console.log(`${colors.yellow}No models found on your Ollama server.${colors.reset}`);
                    rl.prompt();
                    return;
                }

                console.log(`${colors.cyan}Available models:${colors.reset}`);
                models.forEach((m, index) => {
                    const isCurrent = m.name === currentModel;
                    console.log(`  ${index + 1}. ${m.name}${isCurrent ? ' (current)' : ''}`);
                });

                rl.question(`${colors.green}Enter the number of the model you want to use: ${colors.reset}`, async (answer) => {
                    const selectedIndex = parseInt(answer) - 1;
                    if (selectedIndex >= 0 && selectedIndex < models.length) {
                        currentModel = models[selectedIndex].name;
                        clearHistory(settings.language);
                        console.log(`${colors.yellow}Model changed to: ${currentModel}. Conversation history cleared.${colors.reset}`);
                    } else {
                        console.log(`${colors.red}Invalid model selection.${colors.reset}`);
                    }
                    rl.prompt();
                });
            } catch (error) {
                console.error(`${colors.red}Error fetching models: ${error.message}${colors.reset}`);
                rl.prompt();
            }
            return;
        }
        if (trimmedLine === '') {
            rl.prompt();
            return;
        }
        if (debug) {
            console.log(`
Using model: ${currentModel}`);
            console.log(`Connecting to host: ${host}`);
            console.log(`Prompt: ${trimmedLine}`);
        }
        await handleChat(trimmedLine, currentModel, host, debug, yes, yesAll, rl, controller.signal, settings);
        rl.prompt();
    });

    rl.on('close', () => {
        console.log(`${colors.yellow}Exiting interactive chat.${colors.reset}`);
        process.exit(0);
    });

    rl.on('SIGINT', () => {
        rl.question('Are you sure you want to exit? (yes/no) ', (answer) => {
            if (answer.match(/^y(es)?$/i)) {
                rl.close();
            } else {
                rl.prompt();
            }
        });
    });

    rl.prompt();
}
