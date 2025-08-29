import { exec } from 'child_process';
import util from 'util';
import readline from 'readline';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const execPromise = util.promisify(exec);
const APPROVALS_FILE = path.join(os.homedir(), '.ollama-agent-approvals.json');

const colors = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
};

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

async function confirmAction(command, actionDescription, fullCommand, yes, yesAll, rl) {
    const commandRoot = getCommandRoot(command);

    if (commandRoot === 'echo') {
        return true;
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
        console.log(`
${colors.cyan}${actionDescription}${colors.reset}
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

async function replace(filePath, oldString, newString) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        if (!data.includes(oldString)) {
            return JSON.stringify({ error: `Old string not found in ${filePath}` });
        }
        const result = data.replace(oldString, newString);
        await fs.writeFile(filePath, result, 'utf8');
        return JSON.stringify({ success: true, message: `Replaced string in ${filePath}` });
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

export async function executeCommand(command, args = [], explanation = '', yes = false, yesAll = false, rl = null, signal = null) {
    const fullCommand = args.length > 0 ? `${command} ${args.join(' ')}`.trim() : command;
    const actionDescription = explanation || `I will execute the following command:`

    const approved = await confirmAction(command, actionDescription, fullCommand, yes, yesAll, rl);

    if (!approved) {
        throw new Error('Operation cancelled by user.');
    }

    if (command === 'replace') {
        const [filePath, oldString, newString] = args;
        return await replace(filePath, oldString, newString);
    }

    process.stdout.write(`${colors.yellow}Executing: ${fullCommand}${colors.reset}`);
    const spinner = ['|', '/', '-', '\\'];
    let i = 0;
    const interval = setInterval(() => {
        process.stdout.write(`\r${colors.yellow}${spinner[i++]}${colors.reset}`);
        i %= spinner.length;
    }, 100);

    try {
        const { stdout, stderr } = await execPromise(`bash -c "${fullCommand}"`, { signal });
        clearInterval(interval);
        process.stdout.write('\r' + ' '.repeat(1) + '\r');
        return JSON.stringify({ stdout, stderr }, null, 2);
    } catch (error) {
        clearInterval(interval);
        process.stdout.write('\r' + ' '.repeat(1) + '\r');
        if (error.name === 'AbortError') {
            return JSON.stringify({ error: 'Command was cancelled by user.' });
        }
        console.error(`\n${colors.red}Error executing command: ${error}${colors.reset}`);
        return JSON.stringify({ error: error.message, stdout: error.stdout, stderr: error.stderr }, null, 2);
    }
}
