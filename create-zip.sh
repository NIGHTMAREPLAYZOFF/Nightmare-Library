#!/bin/bash

# Create a zip file of the entire Nightmare Library project
# Usage: ./create-zip.sh

PROJECT_NAME="nightmare-library"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ZIP_FILE="${PROJECT_NAME}_${TIMESTAMP}.zip"

echo "Creating zip file: $ZIP_FILE"

# Create zip, excluding node_modules, .git, and other unnecessary files
zip -r "$ZIP_FILE" . \
  -x "node_modules/*" \
  ".git/*" \
  ".gitignore" \
  "dist/*" \
  "build/*" \
  ".DS_Store" \
  "*.log" \
  ".env.local" \
  ".env.*.local" \
  "__pycache__/*" \
  "*.pyc" \
  ".next/*" \
  "coverage/*" \
  ".turbo/*" \
  "*.sqlite" \
  "*.db"

echo "✓ Zip file created successfully: $ZIP_FILE"
echo "File size: $(du -h "$ZIP_FILE" | cut -f1)"
echo ""
echo "You can now download and upload this file to ChatGPT or any AI assistant."
