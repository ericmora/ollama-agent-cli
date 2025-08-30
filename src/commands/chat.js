import { executeCommand, handleFileReplacement, readFileDirect } from '../services/tools.js';
import { sendChat } from '../services/ollama.js';
import { colors, SYSTEM_PROMPT } from '../utils/constants.js';
import { renderResponse } from '../utils/display.js';

let messages = [];

export function clearHistory(language = 'en') {
    messages = [
        { role: 'system', content: SYSTEM_PROMPT(language) }
    ];
}

export async function handleChat(prompt, model, host, debug = false, yes = false, yesAll = false, rl = null, signal = null, settings = null) {
    if (messages.length === 0) {
        clearHistory(settings ? settings.language : 'en');
    }
    
    messages[0].content = SYSTEM_PROMPT(settings ? settings.language : 'en');

    messages.push({ role: 'user', content: prompt });

    let retries = 0;
    const maxRetries = 3;
    let isCorrection = false;

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

            const commandRegex = /@@COMMAND@@\n([\s\S]*?)\n@@COMMAND@@/;
            const replaceFileRegex = /@@REPLACE_FILE@@\n([\s\S]*?)---OLD---\n([\s\S]*?)---NEW---\n([\s\S]*?)\n@@REPLACE_FILE@@/;
            const readFileDirectRegex = /@@READ_FILE_DIRECT@@\n([\s\S]*?)\n@@READ_FILE_DIRECT@@/;

            const commandMatch = fullResponse.match(commandRegex);
            const replaceFileMatch = fullResponse.match(replaceFileRegex);
            const readFileDirectMatch = fullResponse.match(readFileDirectRegex);

            if (commandMatch) {
                const explanation = fullResponse.split('@@COMMAND@@')[0].trim();
                const command = commandMatch[1].trim();

                const toolOutput = await executeCommand(command, [], explanation, isCorrection || yes, yesAll, rl, signal, settings);
                const toolResult = JSON.parse(toolOutput);

                if (toolResult.error && retries < maxRetries) {
                    retries++;
                    isCorrection = true;
                    console.log(`${colors.yellow}Command failed. Asking the AI for a fix...${colors.reset}`);
                    messages.push({ role: 'assistant', content: fullResponse });
                    messages.push({ role: 'tool', content: toolOutput });
                    messages.push({ role: 'user', content: 'The previous command failed. Please analyze the error and provide a corrected command.' });
                    continue;
                } else if (toolResult.error) {
                    console.error(`${colors.red}The agent failed to fix the command after several attempts. Please try a different approach.${colors.reset}`);
                    return;
                }
                
                isCorrection = false;
                messages.push({ role: 'assistant', content: fullResponse });
                messages.push({ role: 'tool', content: toolOutput });
                messages.push({ role: 'user', content: 'The command has finished executing. Here is the output: ' + toolOutput + '. Please summarize this output for the user in a friendly way.' });

            } else if (replaceFileMatch) {
                const explanation = fullResponse.split('@@REPLACE_FILE@@')[0].trim();
                const filePath = replaceFileMatch[1].trim();
                const oldContent = replaceFileMatch[2].trim();
                const newContent = replaceFileMatch[3].trim();

                const toolOutput = await handleFileReplacement(filePath, oldContent, newContent, explanation, isCorrection || yes, yesAll, rl, signal, settings);
                const toolResult = JSON.parse(toolOutput);

                if (toolResult.error && retries < maxRetries) {
                    retries++;
                    isCorrection = true;
                    console.log(`${colors.yellow}File replacement failed. Asking the AI for a fix...${colors.reset}`);
                    messages.push({ role: 'assistant', content: fullResponse });
                    messages.push({ role: 'tool', content: toolOutput });
                    messages.push({ role: 'user', content: 'The previous file replacement failed. Please analyze the error and provide a corrected action.' });
                    continue;
                } else if (toolResult.error) {
                    console.error(`${colors.red}The agent failed to fix the file replacement after several attempts. Please try a different approach.${colors.reset}`);
                    return;
                }

                isCorrection = false;
                messages.push({ role: 'assistant', content: fullResponse });
                messages.push({ role: 'tool', content: toolOutput });
                messages.push({ role: 'user', content: 'The file replacement has finished. Please summarize this action for the user in a friendly way.' });

            } else if (readFileDirectMatch) {
                const explanation = fullResponse.split('@@READ_FILE_DIRECT@@')[0].trim();
                const filePath = readFileDirectMatch[1].trim();

                const toolOutput = await readFileDirect(filePath);
                const toolResult = JSON.parse(toolOutput);

                if (toolResult.error && retries < maxRetries) {
                    retries++;
                    isCorrection = true;
                    console.log(`${colors.yellow}File read failed. Asking the AI for a fix...${colors.reset}`);
                    messages.push({ role: 'assistant', content: fullResponse });
                    messages.push({ role: 'tool', content: toolOutput });
                    messages.push({ role: 'user', content: 'The previous file read failed. Please analyze the error and provide a corrected action.' });
                    continue;
                } else if (toolResult.error) {
                    console.error(`${colors.red}The agent failed to fix the file read after several attempts. Please try a different approach.${colors.reset}`);
                    return;
                }

                isCorrection = false;
                messages.push({ role: 'assistant', content: fullResponse });
                messages.push({ role: 'tool', content: toolOutput });
                messages.push({ role: 'user', content: 'The file has been read. Please summarize its content for the user in a friendly way.' });

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
