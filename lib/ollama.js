import axios from 'axios';
import { executeCommand } from './tools.js';

const colors = {
    reset: "\x1b[0m",
    blue: "\x1b[34m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    gray: "\x1b[90m", // New color for <think> tags
};

const SYSTEM_PROMPT = `You are a command-line agent running on ${process.platform}. Your goal is to assist the user.

When you need to execute a command, you must respond in the following format and nothing else. Replace <explanation> with your explanation and <the command> with the actual command.

Example:
This command will list all files and directories.
@@COMMAND@@
ls -l
@@COMMAND@@

After you propose and I execute a command, you will receive the command's output. Your next response MUST be a concise, user-friendly summary of that output. Do NOT repeat the command or its explanation. Focus solely on interpreting the results for the user.

If a command fails, I will provide you with the error message. Analyze the error and provide a corrected command or a different approach.

For conversational responses, just respond with text.
`;

let messages = [
    { role: 'system', content: SYSTEM_PROMPT }
];

export function clearHistory() {
    messages = [
        { role: 'system', content: SYSTEM_PROMPT }
    ];
}

export async function streamChat(prompt, model, host, debug = false, yes = false, yesAll = false, rl = null, signal = null) {
    const url = `${host}/api/chat`;
    
    messages.push({ role: 'user', content: prompt });

    let retries = 0;
    const maxRetries = 3;

    try {
        while (true) {
            if (debug) {
                console.log('Sending request to Ollama with messages:', JSON.stringify(messages, null, 2));
            }
            const response = await axios({
                method: 'post',
                url: url,
                data: {
                    model: model,
                    messages: messages,
                    stream: false,
                },
                signal: signal,
            });

            const fullResponse = response.data.message.content;

            if (debug) {
                console.log('Received from Ollama:', fullResponse);
            }

            const commandRegex = /@@COMMAND@@\n([\s\S]*)\n@@COMMAND@@/;
            const match = fullResponse.match(commandRegex);

            if (match) {
                const explanation = fullResponse.replace(commandRegex, '').trim();
                const command = match[1].trim();

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

                messages.push({ role: 'assistant', content: fullResponse });
                messages.push({ role: 'tool', content: toolOutput });
                messages.push({ role: 'user', content: 'The command has finished executing. Here is the output: ' + toolOutput + '. Please summarize this output for the user in a friendly way.' });

            } else {
                const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
                let lastIndex = 0;
                let output = '';
                let matchThink;

                while ((matchThink = thinkRegex.exec(fullResponse)) !== null) {
                    output += fullResponse.substring(lastIndex, matchThink.index);
                    output += `${colors.gray}${matchThink[1]}${colors.reset}`;
                    lastIndex = thinkRegex.lastIndex;
                }
                output += fullResponse.substring(lastIndex);

                console.log(`${output}${colors.reset}`);
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
        if (axios.isCancel(error)) {
            console.log(`
${colors.yellow}Operation cancelled by user.${colors.reset}`);
            return;
        }
        if (axios.isAxiosError(error)) {
            if (error.response) {
                console.error(`${colors.red}Error: Ollama server responded with status ${error.response.status} - ${error.response.statusText}${colors.reset}`);
                if (error.response.data) {
                    console.error('Response data:', error.response.data.toString());
                }
            } else if (error.request) {
                console.error(`${colors.red}Error: No response received from Ollama server. Is it running at ${url}?${colors.reset}`);
            } else {
                console.error(`${colors.red}An unexpected error occurred: ${error.message}${colors.reset}`);
            }
        } else {
            console.error(`${colors.red}An unexpected error occurred: ${error.message}${colors.reset}`);
        }
    }
}