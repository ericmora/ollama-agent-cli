import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import * as diff from 'diff';
import { colors } from './constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function displayLogo() {
    try {
        const logoPath = path.join(__dirname, '../../logo.txt');
        let logoContent = await readFile(logoPath, 'utf8');
        logoContent = logoContent.replace(/\{center\}/g, '').replace(/\{\/center\}/g, '');
        console.log(`${colors.cyan}${logoContent}${colors.reset}`);
    } catch (error) {
        // console.error('Error displaying logo:', error);
    }
}

export function renderResponse(fullResponse, settings) {
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

export function displayDiff(filePath, oldContent, newContent) {
    const changes = diff.diffLines(oldContent, newContent);
    const width = process.stdout.columns || 80;
    const title = `✔ WriteFile Writing to ${filePath} `;

    console.log('╭' + '-'.repeat(width - 2) + '╮');
    console.log('│' + title.padEnd(width - 2) + '│');
    console.log('│' + ' '.repeat(width - 2) + '│');

    let lineNumber = 0;
    changes.forEach((part) => {
        const lines = part.value.split('\n').filter(line => line !== '');
        lines.forEach(line => {
            let formattedLine = '';
            if (part.added) {
                lineNumber++;
                formattedLine = `${colors.green}+ ${lineNumber.toString().padStart(4)} ${line}${colors.reset}`;
            } else if (part.removed) {
                formattedLine = `${colors.red}- ${lineNumber.toString().padStart(4)} ${line}${colors.reset}`;
            } else {
                lineNumber++;
                formattedLine = `  ${lineNumber.toString().padStart(4)} ${line}`;
            }
            console.log('│' + ' ' + formattedLine.padEnd(width - 4) + ' │');
        });
    });

    console.log('╰' + '-'.repeat(width - 2) + '╯');
}