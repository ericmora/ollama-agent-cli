#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { streamChat, clearHistory } from './lib/ollama.js';
import readline from 'readline';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function displayLogo() {
    try {
        const logoPath = path.join(__dirname, 'logo.txt');
        let logoContent = await readFile(logoPath, 'utf8');
        logoContent = logoContent.replace(/\{center\}/g, '').replace(/\{\/center\}/g, '');
        console.log(`${colors.cyan}${logoContent}${colors.reset}`);
    } catch (error) {
        // console.error('Error displaying logo:', error);
    }
}

await displayLogo();

const program = new Command();

program
    .name('ollama-agent')
    .description('CLI tool to interact with a local Ollama server')
    .version('0.0.1');

program.argument('[prompt]', 'The prompt for the Ollama model');

program.option('-m, --model <name>', 'Specify the Ollama model to use', process.env.OLLAMA_MODEL || 'llama3');
program.option('-H, --host <url>', 'Specify the Ollama host URL', process.env.OLLAMA_HOST || 'http://localhost:11434');
program.option('-i, --interactive', 'Start in interactive chat mode', false);
program.option('-d, --debug', 'Enable debug mode (show JSON output)', false);
program.option('--yes', 'Automatically approve the next command', false);
program.option('--yes-all', 'Automatically approve all commands', false);

program.action(async (prompt, options) => {
    const model = options.model;
    const host = options.host;
    const debug = options.debug;
    const yes = options.yes;
    const yesAll = options.yesAll;

    if (options.interactive && !prompt) {
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
                clearHistory();
                console.log(`${colors.yellow}Conversation history cleared.${colors.reset}`);
                rl.prompt();
                return;
            }
            if (trimmedLine === '') {
                rl.prompt();
                return;
            }
            if (debug) {
                console.log(`
Using model: ${model}`);
                console.log(`Connecting to host: ${host}`);
                console.log(`Prompt: ${trimmedLine}`);
            }
            await streamChat(trimmedLine, model, host, debug, yes, yesAll, rl, controller.signal);
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
    } else if (prompt) {
        if (debug) {
            console.log(`Using model: ${model}`);
            console.log(`Connecting to host: ${host}`);
            console.log(`Prompt: ${prompt}`);
        }
        await streamChat(prompt, model, host, debug, yes, yesAll);
    } else {
        program.help();
    }
});


program.parse(process.argv);
