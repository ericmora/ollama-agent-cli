#!/bin/bash

# This script automates the installation and initial setup of Bolt DIY.
# It assumes Git is installed on your system.

# --- Prerequisites Check ---

echo "Checking for Node.js..."
if ! command -v node &> /dev/null
then
    echo "Node.js is not installed. Please install Node.js (LTS version) from https://nodejs.org/en/download/ before running this script."
    exit 1
fi

echo "Checking for npm..."
if ! command -v npm &> /dev/null
then
    echo "npm is not installed. Please ensure npm is installed with Node.js."
    exit 1
fi

echo "Checking for pnpm..."
if ! command -v pnpm &> /dev/null
then
    echo "pnpm is not installed. Installing pnpm globally..."
    npm install -g pnpm
    if [ $? -ne 0 ]; then
        echo "Failed to install pnpm. Please try again manually or check your npm permissions."
        exit 1
    fi
fi

# --- Bolt DIY Installation ---

BOLT_DIR=".files/bolt.diy"
REPO_URL="https://github.com/stackblitz-labs/bolt.diy.git"

echo "Cloning Bolt DIY repository..."
if [ -d "$BOLT_DIR" ]; then
    echo "Directory $BOLT_DIR already exists. Skipping cloning."
    cd "$BOLT_DIR"
    echo "Pulling latest changes..."
    git pull
else
    mkdir -p .files
    git clone "$REPO_URL" "$BOLT_DIR"
    if [ $? -ne 0 ]; then
        echo "Failed to clone Bolt DIY repository. Please check your internet connection or Git setup."
        exit 1
    fi
    cd "$BOLT_DIR"
fi

echo "Installing project dependencies..."
pnpm install
if [ $? -ne 0 ]; then
    echo "Failed to install Bolt DIY dependencies. Please check the error messages above."
    exit 1
fi

# --- Start Application ---

echo "Starting Bolt DIY application in development mode (http://localhost:5173)..."
echo "You can stop it later by finding the process and killing it, or by pressing Ctrl+C in the terminal where it's running."
pnpm run dev &

# --- Ollama Configuration Instructions ---

echo "\n--- Manual Configuration for Ollama ---"
echo "Bolt DIY is now running. To configure it to work with Ollama, please follow these steps:"
echo "1. Open your web browser and go to http://localhost:5173"
echo "2. Click the settings icon (usually a gear) in the sidebar to open the settings menu."
echo "3. Navigate to the \"Providers\" tab."
echo "4. Search for \"Ollama\"."
echo "5. In the \"Custom Base URL\" field for Ollama, enter: http://localhost:11434"
echo "   (Ensure your Ollama server is running, e.g., via 'ollama serve' or your docker-compose setup)"
echo "6. Save your changes."
echo "\n--- Alternative: Docker Compose Setup ---"
echo "You can also run Ollama and Bolt DIY together using Docker Compose. A 'docker-compose.yml' file was previously generated for you."
echo "To use it, ensure Docker is installed, then run 'docker compose up -d' in the directory containing the 'docker-compose.yml' file."

echo "\nBolt DIY setup complete. Please refer to the manual configuration steps for Ollama integration."