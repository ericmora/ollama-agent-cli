import axios from 'axios';
import { colors } from '../utils/constants.js';

export async function sendChat(model, messages, host, signal) {
    const url = `${host}/api/chat`;

    try {
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
        return response.data.message.content;
    } catch (error) {
        if (axios.isCancel(error)) {
            throw new Error('Operation cancelled by user.');
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
        return null;
    }
}
