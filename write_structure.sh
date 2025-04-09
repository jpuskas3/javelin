#!/bin/bash

# Output file
OUTPUT_FILE="project_structure.txt"

# Directories to exclude
EXCLUDES=("__pycache__" ".git" "node_modules" ".venv")

# Build find exclude expression
EXCLUDE_PATTERN=$(printf "! -path \"*/%s/*\" " "${EXCLUDES[@]}")

# Header
echo "📁 Project structure for: $(pwd)" > "$OUTPUT_FILE"
echo "----------------------------------------" >> "$OUTPUT_FILE"

# Generate tree-like output
eval find . $EXCLUDE_PATTERN -print |
  awk '
  {
    gsub(/^\.\//, "")
    depth = gsub("/", "/")
    indent = ""
    for (i = 1; i < depth; i++) indent = indent "│   "
    name = $0
    print indent "├── " name
  }' >> "$OUTPUT_FILE"

echo "✔️  Project structure saved to $OUTPUT_FILE"
