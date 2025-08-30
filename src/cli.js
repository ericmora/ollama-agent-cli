import { Command } from 'commander';
import { handleChat } from './commands/chat.js';
import { startInteractiveSession } from './commands/interactive.js';
import { displayLogo } from './utils/display.js';
import { getSettings } from './services/settings.js';

export async function run() {
    await displayLogo();

    const program = new Command();

    program
        .name('ollama-agent')
        .description('CLI tool to interact with a local Ollama server')
        .version('1.0.0');

    program.argument('[prompt]', 'The prompt for the Ollama model');

    program.option('-m, --model <name>', 'Specify the Ollama model to use', process.env.OLLAMA_MODEL || 'llama3');
    program.option('-H, --host <url>', 'Specify the Ollama host URL', process.env.OLLAMA_HOST || 'http://localhost:11434');
    program.option('-i, --interactive', 'Start in interactive chat mode', false);
    program.option('-d, --debug', 'Enable debug mode (show JSON output)', false);
    program.option('--yes', 'Automatically approve the next command', false);
    program.option('--yes-all', 'Automatically approve all commands', false);

    program.action(async (prompt, options) => {
        const { model, host, debug, yes, yesAll } = options;
        const settings = await getSettings();

        if (options.interactive && !prompt) {
            await startInteractiveSession(model, host, debug, yes, yesAll);
        } else if (prompt) {
            if (debug) {
                console.log(`Using model: ${model}`);
                console.log(`Connecting to host: ${host}`);
                console.log(`Prompt: ${prompt}`);
            }
            await handleChat(prompt, model, host, debug, yes, yesAll, null, null, settings);
        } else {
            program.help();
        }
    });

    program.parse(process.argv);
}
