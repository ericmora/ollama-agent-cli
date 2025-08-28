# Arquitectura de Desarrollo: ollama-agent-cli

## 1. Resumen del Proyecto

El objetivo es crear una herramienta de línea de comandos (CLI) llamada `ollama-agent-cli`, que permita a los usuarios interactuar con un servidor local de Ollama. La herramienta debe ser instalable globalmente, fácil de usar y configurable a través de un fichero `.env`.

## 2. Pila Tecnológica (Tech Stack)

- **Lenguaje:** Node.js
- **Gestor de Paquetes:** npm
- **Manejo de CLI:** `commander` - Una librería robusta para construir interfaces de línea de comandos.
- **Variables de Entorno:** `dotenv` - Para cargar variables desde un fichero `.env`.
- **Peticiones HTTP:** `axios` - Un cliente HTTP basado en promesas para comunicarse con la API de Ollama.

## 3. Estructura de Ficheros y Módulos

```
/ollama-agent-cli
|-- .env                  # Fichero de configuración local (ignorado por git)
|-- .env.example          # Plantilla de la configuración
|-- .gitignore            # Ficheros a ignorar por git
|-- GEMINI.md             # Este fichero de arquitectura
|-- package.json          # Definición del proyecto, dependencias y scripts
|-- index.js              # Punto de entrada de la CLI
|-- /lib
|   |-- ollama.js         # Módulo para la comunicación con la API de Ollama
```

## 4. Flujo de Trabajo (Workflow)

1.  **Ejecución:** El usuario ejecuta el comando en su terminal:
    ```bash
    ollama-agent --model "llama3" "Explícame qué es un agujero negro"
    ```

2.  **Punto de Entrada (`index.js`):**
    *   El `package.json` define `index.js` como el ejecutable para el comando `ollama-agent`.
    *   Se utiliza `dotenv` para cargar las variables de `OLLAMA_HOST` y `OLLAMA_MODEL` desde el fichero `.env`.
    *   Se utiliza `commander` para parsear los argumentos de la línea de comandos (`--model` y el prompt del usuario).
    *   Los argumentos de la CLI tienen prioridad sobre las variables del `.env`.

3.  **Lógica de Comunicación (`lib/ollama.js`):**
    *   `index.js` invoca una función del módulo `ollama.js`, pasándole el prompt, el modelo y la URL del host.
    *   Este módulo contiene una función (ej: `streamChat`) que utiliza `axios` para realizar una petición POST al endpoint `/api/chat` del servidor Ollama.
    *   La petición se configurará para recibir una respuesta en modo *streaming* para una experiencia interactiva.

4.  **Respuesta al Usuario:**
    *   La respuesta del servidor Ollama se recibe en trozos (chunks) y se imprime directamente en la `stdout` del usuario, simulando la escritura en tiempo real.

## 5. Configuración (`.env`)

El fichero `.env` contendrá la configuración esencial:

```
# URL del servidor local de Ollama
OLLAMA_HOST="http://localhost:11434"

# Modelo a utilizar por defecto si no se especifica otro
OLLAMA_MODEL="llama3"
```

## 6. Instalación

El `package.json` incluirá una sección `bin` que mapea el comando `ollama-agent` al script `index.js`. Esto permitirá una instalación global y sencilla mediante:

```bash
npm install -g .
```
