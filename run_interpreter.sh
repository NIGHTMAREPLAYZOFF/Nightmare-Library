#!/bin/bash
export PATH=$PATH:/home/runner/.local/bin
# Ensure Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    ollama serve > ollama.log 2>&1 &
    sleep 5
fi
# Run interpreter in non-interactive mode
interpreter --api_base http://localhost:11434/v1 --model ollama/deepseek-r1:1.5b --local -y
