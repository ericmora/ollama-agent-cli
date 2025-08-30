import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
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
