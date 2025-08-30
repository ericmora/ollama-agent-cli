import { exec } from 'child_process';
import util from 'util';
import readline from 'readline';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { colors } from '../utils/constants.js';
import { renderResponse, displayDiff } from '../utils/display.js';

const execPromise = util.promisify(exec);
const APPROVALS_FILE = path.join(os.homedir(), '.ollama-agent-approvals.json');

async function readApprovals() {
    try {
        const data = await fs.readFile(APPROVALS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }
        console.error(`${colors.red}Error reading approvals file:${colors.reset}`, error);
        return {};
    }
}

async function writeApprovals(approvals) {
    try {
        await fs.writeFile(APPROVALS_FILE, JSON.stringify(approvals, null, 2), 'utf8');
    } catch (error) {
        console.error(`${colors.red}Error writing approvals file:${colors.reset}`, error);
    }
}

function getCommandRoot(command) {
    return command.split(' ')[0];
}


async function confirmAction(command, actionDescription, fullCommand, yes, yesAll, rl, settings) {
    const commandRoot = getCommandRoot(command);

    if (commandRoot === 'echo') {
        return true;
    }

    if (commandRoot === 'read_file_direct') {
        const filePath = fullCommand.replace('read_file_direct ', '');
        const currentDir = process.cwd();
        const resolvedPath = path.resolve(currentDir, filePath);
        const relativePath = path.relative(currentDir, resolvedPath);

        if (!relativePath.startsWith('..') && relativePath !== '') {
            return true;
        }
    }

    if (yesAll) {
        return true;
    }

    const approvals = await readApprovals();
    if (approvals[commandRoot] === 'always') {
        return true;
    }

    if (yes) {
        return true;
    }

    const localRl = rl || readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        const renderedExplanation = renderResponse(actionDescription, settings);
        console.log(`
${renderedExplanation}
`);
        console.log(`Command: ${colors.yellow}${colors.bold}${fullCommand}${colors.reset}`);
        localRl.question('Approve action? (y)es / (n)o / (a)lways: ', async (answer) => {
            if (!rl) {
                localRl.close();
            }
            const lowerAnswer = answer.toLowerCase();
            if (lowerAnswer === 'y' || lowerAnswer === 'yes') {
                resolve(true);
            } else if (lowerAnswer === 'a' || lowerAnswer === 'always') {
                approvals[commandRoot] = 'always';
                await writeApprovals(approvals);
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

async function replaceFileContents(filePath, oldContent, newContent) {
    try {
        const originalContent = await fs.readFile(filePath, 'utf8');
        if (oldContent && !originalContent.includes(oldContent)) {
            return JSON.stringify({ error: `Old content not found in ${filePath}. Cannot perform replacement.` });
        }
        const updatedContent = oldContent ? originalContent.replace(oldContent, newContent) : newContent;
        await fs.writeFile(filePath, updatedContent, 'utf8');
        return JSON.stringify({ success: true, message: `File ${filePath} has been updated.` });
    } catch (error) {
        if (error.code === 'ENOENT' && !oldContent) {
            // File doesn't exist, and we are creating it (oldContent is empty)
            try {
                await fs.writeFile(filePath, newContent, 'utf8');
                return JSON.stringify({ success: true, message: `File ${filePath} has been created.` });
            } catch (writeError) {
                return JSON.stringify({ error: writeError.message });
            }
        }
        return JSON.stringify({ error: error.message });
    }
}

async function confirmFileAction(filePath, oldContent, newContent, explanation, yes, yesAll, rl, settings) {
    if (yesAll || yes) {
        return true;
    }

    const approvals = await readApprovals();
    if (approvals[filePath] === 'always') {
        return true;
    }

    const localRl = rl || readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        const renderedExplanation = renderResponse(explanation, settings);
        console.log(`
${renderedExplanation}
`);
        displayDiff(filePath, oldContent, newContent);
        
        localRl.question('Approve file modification? (y)es / (n)o / (a)lways: ', async (answer) => {
            if (!rl) {
                localRl.close();
            }
            const lowerAnswer = answer.toLowerCase();
            if (lowerAnswer === 'y' || lowerAnswer === 'yes') {
                resolve(true);
            } else if (lowerAnswer === 'a' || lowerAnswer === 'always') {
                approvals[filePath] = 'always';
                await writeApprovals(approvals);
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

export async function handleFileReplacement(filePath, oldContent, newContent, explanation, yes, yesAll, rl, signal, settings) {
    try {
        const approved = await confirmFileAction(filePath, oldContent, newContent, explanation, yes, yesAll, rl, settings);
        if (!approved) {
            throw new Error('Operation cancelled by user.');
        }
        return await replaceFileContents(filePath, oldContent, newContent);
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

export async function readFileDirect(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.stringify({ stdout: data });
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

export async function executeCommand(command, args = [], explanation = '', yes = false, yesAll = false, rl = null, signal = null, settings = null) {
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}`.trim() : command;
    const actionDescription = explanation || `I will execute the following command:`

    const approved = await confirmAction(command, actionDescription, fullCommand, yes, yesAll, rl, settings);

    if (!approved) {
        throw new Error('Operation cancelled by user.');
    }

    if (command === 'read_file_direct') {
        const [filePath] = args;
        return await readFileDirect(filePath);
    }

    const spinner = ['|', '/', '-', '\\'];
    let i = 0;
    const executingMessage = `${colors.yellow}Executing: ${fullCommand}${colors.reset}`;
    
    const interval = setInterval(() => {
        process.stdout.write(`\r${executingMessage} ${spinner[i++]}`);
        i %= spinner.length;
    }, 100);

    try {
        const { stdout, stderr } = await execPromise(`bash -c "${fullCommand}"`, { signal });
        clearInterval(interval);
        process.stdout.write('\r' + ' '.repeat(executingMessage.length + 2) + '\r');
        return JSON.stringify({ stdout, stderr }, null, 2);
    } catch (error) {
        clearInterval(interval);
        process.stdout.write('\r' + ' '.repeat(executingMessage.length + 2) + '\r');
        if (error.name === 'AbortError') {
            return JSON.stringify({ error: 'Command was cancelled by user.' });
        }
        console.error(`
${colors.red}Error executing command: ${error}${colors.reset}`);
        return JSON.stringify({ error: error.message, stdout: error.stdout, stderr: error.stderr }, null, 2);
    }
}