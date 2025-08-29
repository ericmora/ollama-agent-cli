import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const SETTINGS_FILE = path.join(os.homedir(), '.ollama-agent-cli');

const DEFAULT_SETTINGS = {
    language: 'en',
    showThinking: true,
};

export async function getSettings() {
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (error) {
        if (error.code === 'ENOENT') {
            return DEFAULT_SETTINGS;
        }
        console.error('Error reading settings file:', error);
        return DEFAULT_SETTINGS;
    }
}

export async function saveSettings(settings) {
    try {
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    } catch (error) {
        console.error('Error saving settings file:', error);
    }
}
