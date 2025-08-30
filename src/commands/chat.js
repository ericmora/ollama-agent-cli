import { executeCommand } from '../services/tools.js';
import { sendChat } from '../services/ollama.js';
import { colors, SYSTEM_PROMPT } from '../utils/constants.js';

let messages = [];

export function clearHistory(language = 'en') {
    messages = [
        { role: 'system', content: SYSTEM_PROMPT(language) }
    ];
}

function renderResponse(fullResponse, settings) {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    let lastIndex = 0;
    let output = '';
    let matchThink;

    while ((matchThink = thinkRegex.exec(fullResponse)) !== null) {
        output += fullResponse.substring(lastIndex, matchThink.index);
        if (settings && settings.showThinking) {
            output += `${colors.gray}${matchThink[1]}${colors.reset}`;
        } else {
            output += ''; // Do not show thinking fragments
        }
        lastIndex = thinkRegex.lastIndex;
    }
    output += fullResponse.substring(lastIndex);
    return output;
}

export async function handleChat(prompt, model, host, debug = false, yes = false, yesAll = false, rl = null, signal = null, settings = null) {
    if (messages.length === 0) {
        clearHistory(settings ? settings.language : 'en');
    }
    
    messages[0].content = SYSTEM_PROMPT(settings ? settings.language : 'en');

    messages.push({ role: 'user', content: prompt });

    let retries = 0;
    const maxRetries = 3;

    try {
        while (true) {
            if (debug) {
                console.log('Sending request to Ollama with messages:', JSON.stringify(messages, null, 2));
            }

            const fullResponse = await sendChat(model, messages, host, signal);

            if (fullResponse === null) {
                return; // Error handled in sendChat
            }

            if (debug) {
                console.log('Received from Ollama:', fullResponse);
            }

            const commandRegex = /@@COMMAND@@\n([\s\S]*)\n@@COMMAND@@/;
            const match = fullResponse.match(commandRegex);

            if (match) {
                const explanation = fullResponse.replace(commandRegex, '').trim();
                const command = match[1].trim();

                console.log(renderResponse(fullResponse, settings));

                const toolOutput = await executeCommand(command, [], explanation, yes, yesAll, rl, signal);
                const toolResult = JSON.parse(toolOutput);

                if (toolResult.error && retries < maxRetries) {
                    retries++;
                    console.log(`${colors.yellow}Command failed. Asking the AI for a fix...${colors.reset}`);
                    messages.push({ role: 'assistant', content: fullResponse });
                    messages.push({ role: 'tool', content: toolOutput });
                    messages.push({
                        role: 'user', 
                        content: 'The previous command failed. Please analyze the error and provide a corrected command.' 
                    });
                    continue;
                } else if (toolResult.error) {
                    console.error(`${colors.red}The agent failed to fix the command after several attempts. Please try a different approach.${colors.reset}`);
                    return;
                }
                
                if (debug) {
                    console.log(`[AGENT]: Tool output: ${toolOutput}`);
                    if (toolResult.stdout) {
                        console.log(`--- Command Output ---
${toolResult.stdout}----------------------`);
                    }
                }

                if (command === 'replace' && toolResult.success) {
                    console.log(`
${colors.yellow}File modification:${colors.reset}`);
                    console.log(`- ${colors.red}${toolResult.oldString}${colors.reset}`);
                    console.log(`+ ${colors.green}${toolResult.newString}${colors.reset}`);
                }

                messages.push({ role: 'assistant', content: fullResponse });
                messages.push({ role: 'tool', content: toolOutput });
                messages.push({ role: 'user', content: 'The command has finished executing. Here is the output: ' + toolOutput + '. Please summarize this output for the user in a friendly way.' });

            } else {
                console.log(renderResponse(fullResponse, settings));
                messages.push({ role: 'assistant', content: fullResponse });
                return;
            }
        }
    } catch (error) {
        if (error.message === 'Operation cancelled by user.') {
            console.log(`
${colors.yellow}Operation cancelled by user.${colors.reset}`);
            return;
        }
        console.error(`${colors.red}An unexpected error occurred: ${error.message}${colors.reset}`);
    }
}
