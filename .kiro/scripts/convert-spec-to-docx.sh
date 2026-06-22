#!/bin/bash
# Converts a newly created spec .md file to a Word document in docs/specs/
# Receives hook context JSON on stdin with the file path.
# Handles subdirectories by flattening paths with dashes (e.g., squad-assembly/requirements.md -> squad-assembly-requirements.docx)

set -euo pipefail

# Read JSON from stdin and extract the file path
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys, json; print(json.load(sys.stdin).get('filePath', ''))" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  echo "No filePath found in hook context" >&2
  exit 1
fi

WORKSPACE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SPECS_DIR="$WORKSPACE_ROOT/.kiro/specs"
OUTPUT_DIR="$WORKSPACE_ROOT/docs/specs"

mkdir -p "$OUTPUT_DIR"

# Build output filename: strip specs base path, replace / with -, swap extension
REL_PATH="${FILE_PATH#$SPECS_DIR/}"
DOCX_NAME=$(echo "$REL_PATH" | sed 's/\//-/g' | sed 's/\.md$/.docx/')
OUTPUT_FILE="$OUTPUT_DIR/$DOCX_NAME"

/usr/local/bin/pandoc "$FILE_PATH" -o "$OUTPUT_FILE"

echo "Converted $FILE_PATH -> $OUTPUT_FILE"
