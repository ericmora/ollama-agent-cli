# ollama-agent-cli

`ollama-agent-cli` is a command-line interface (CLI) tool that allows users to interact with a local Ollama server, leveraging the power of large language models to execute commands and provide intelligent responses.

## Features

*   **Interactive Mode:** Engage in a conversational chat with the Ollama model.
*   **Command Execution:** The agent can propose and execute shell commands on your system with explicit user approval.
*   **Smart Approvals:** Approve commands once, and the agent remembers your preference for future similar commands.
*   **Self-Correction:** The agent attempts to fix failed commands by analyzing errors and proposing corrected solutions.
*   **File Manipulation:** Includes a `replace` command to modify file content.
*   **Conversation History:** Maintains context across interactions in interactive mode.
*   **Clear History:** Use `/clear` to reset the conversation history.
*   **Cancel Operations:** Press `ESC` to abort ongoing command executions or model responses.
*   **Debug Mode:** Get detailed JSON output for debugging purposes.
*   **Non-interactive Approvals:** Use `--yes` or `--yes-all` flags for automated command approval.
*   **Colorful UI:** Enhanced user interface with ANSI colors for better readability.

## Installation

To install `ollama-agent-cli` globally, ensure you have Node.js and npm installed, then run:

```bash
npm install -g ollama-agent-cli
```

## Usage

### Interactive Mode

To start an interactive chat session with the Ollama model:

```bash
ollama-agent --interactive
```

In interactive mode, you can type your prompts. The agent will respond conversationally or propose commands. You can also use special commands:

*   `/bye` or `/exit`: Exit the interactive chat.
*   `/clear`: Clear the conversation history.

### Single Command Mode

To send a single prompt to the Ollama model and get a response:

```bash
ollama-agent "What is the largest file in the current directory?"
```

### Options

You can use the following options with `ollama-agent`:

*   `-m, --model <name>`: Specify the Ollama model to use (default: `llama3`).
*   `-H, --host <url>`: Specify the Ollama host URL (default: `http://localhost:11434`).
*   `-i, --interactive`: Start in interactive chat mode.
*   `-d, --debug`: Enable debug mode, showing detailed JSON output and command execution details.
*   `--yes`: Automatically approve the next proposed command.
*   `--yes-all`: Automatically approve all proposed commands without asking for confirmation.

### Command Approval

When the agent proposes a command, you will be asked for approval. You have three options:

*   `(y)es`: Approve the current command for a single execution.
*   `(n)o`: Deny the current command.
*   `(a)lways`: Approve this type of command (based on its root command) for all future executions without asking again.

### AI Command Format

When the Ollama model proposes a command, it should follow this strict format:

```
<explanation of the command>
@@COMMAND@@
<the command to execute>
@@COMMAND@@
```

The agent will parse this format to extract the explanation and the command for execution.

## Development

### Project Structure

```
/ollama-agent-cli
|-- .env                  # Local configuration file (ignored by git)
|-- .env.example          # Configuration template
|-- .gitignore            # Files to ignore by git
|-- GEMINI.md             # Project architecture documentation
|-- package.json          # Project definition, dependencies, and scripts
|-- index.js              # CLI entry point
|-- /lib
|   |-- ollama.js         # Module for communication with Ollama API and core agent logic
|   |-- tools.js          # Module for shell command execution and file manipulation
|-- README.md             # This file
```

### Running Locally

1.  Clone the repository:
    ```bash
git clone git@github.com:ericmora/ollama-agent-cli.git
cd ollama-agent-cli
    ```
2.  Install dependencies:
    ```bash
npm install
    ```
3.  Run the CLI:
    ```bash
node index.js --interactive
    ```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the ISC License. See the `LICENSE` file for details.
