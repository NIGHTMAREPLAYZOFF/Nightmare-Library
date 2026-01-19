#!/bin/bash
export PATH=$PATH:/home/runner/.local/bin
# Ensure Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    ./start_ollama.sh
fi
# Launch interpreter with profile and skip cloud checks to avoid menu
interpreter --profile ollama_local -y
