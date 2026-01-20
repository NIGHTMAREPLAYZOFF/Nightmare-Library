#!/bin/bash
export PATH=$PATH:/home/runner/.local/bin
# Ensure Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    ./start_ollama.sh
fi
# Launch interpreter using the user's verified syntax with -y for non-interactive stability
interpreter --model ollama/deepseek-r1:1.5b --api_base http://localhost:11434 -y
