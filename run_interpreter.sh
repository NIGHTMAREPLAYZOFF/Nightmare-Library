#!/bin/bash
export PATH=$PATH:/home/runner/.local/bin
# Ensure Ollama is running
./start_ollama.sh
# Run with --local to ensure it uses the local Ollama instance correctly
interpreter --api_base http://localhost:11434/v1 --model ollama/deepseek-r1:1.5b --local
