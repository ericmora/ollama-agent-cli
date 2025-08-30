#!/bin/bash

# This script stops any running instances of the services defined in servers/docker-compose.yml
# and starts them again to ensure a clean environment.

echo "--- Restarting Docker Services ---"

# Navigate to the directory containing the docker-compose.yml file
cd servers

# Stop and remove any existing containers, networks, and volumes
echo "Stopping existing services (if any)..."
docker compose down

# Start the services in detached mode
echo "Starting services..."
docker compose up -d

# Navigate back to the project root
cd ..

echo "Waiting for services to initialize..."
sleep 5 # Give containers a moment to start

# --- Post-Start Checks ---

# Check if Ollama container is running
if docker ps --filter "name=ollama" --format "{{.Names}}" | grep -q "ollama"; then
    echo "Ollama container started successfully."

    # Define the default model
    OLLAMA_MODEL="llama3"

    # Check if the default model is available and pull it if it's not
    echo "Checking for default Ollama model ($OLLAMA_MODEL)..."
    if ! docker exec ollama ollama list | grep -q "$OLLAMA_MODEL"; then
        echo "Default model not found. Pulling '$OLLAMA_MODEL'..."
        docker exec ollama ollama pull "$OLLAMA_MODEL"
        if [ $? -eq 0 ]; then
            echo "Model '$OLLAMA_MODEL' pulled successfully."
        else
            echo "Error: Failed to pull model '$OLLAMA_MODEL'."
        fi
    else
        echo "Default model '$OLLAMA_MODEL' is already available."
    fi
else
    echo "Error: Ollama container failed to start. Please check your Docker setup and the logs in the 'servers' directory."
    exit 1
fi

echo "
--- Services are ready ---"
echo "Ollama is accessible on: http://localhost:3003"
echo "Bolt DIY is accessible on: http://localhost:2002"
