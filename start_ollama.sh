#!/bin/bash
# Start Ollama server in background if not already running
if ! pgrep -x "ollama" > /dev/null; then
  echo "Starting global Ollama server..."
  ollama serve > ollama.log 2>&1 &
  # Wait for it to be ready
  for i in {1..30}; do
    if curl -s http://localhost:11434/api/tags > /dev/null; then
      echo "Ollama server is ready."
      break
    fi
    sleep 1
  done
else
  echo "Ollama server is already running."
fi
