#!/bin/bash
# Check if ollama is already running
if ! pgrep -x "ollama" > /dev/null; then
  echo "Starting Ollama server..."
  ollama serve > ollama.log 2>&1 &
  # Wait for it to be ready
  for i in {1..30}; do
    if curl -s http://127.0.0.1:11434/api/tags > /dev/null; then
      echo "Ollama server is ready."
      break
    fi
    sleep 1
  done
else
  echo "Ollama server is already running."
fi
