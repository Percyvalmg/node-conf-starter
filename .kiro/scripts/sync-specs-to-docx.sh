#!/bin/bash
# Syncs all .md files in .kiro/specs/ to Word documents in docs/specs/
# Handles subdirectories by flattening paths with dashes (e.g., squad-assembly/requirements.md -> squad-assembly-requirements.docx)
# Only re-converts files that are newer than the existing .docx (incremental sync).

set -euo pipefail

WORKSPACE_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SPECS_DIR="$WORKSPACE_ROOT/.kiro/specs"
OUTPUT_DIR="$WORKSPACE_ROOT/docs/specs"

mkdir -p "$OUTPUT_DIR"

if [ ! -d "$SPECS_DIR" ]; then
  echo "No specs directory found at $SPECS_DIR"
  exit 0
fi

COUNT=0

find "$SPECS_DIR" -name "*.md" -type f | while read -r MD_FILE; do
  # Build output filename: strip base path, replace / with -, swap extension
  REL_PATH="${MD_FILE#$SPECS_DIR/}"
  DOCX_NAME=$(echo "$REL_PATH" | sed 's/\//-/g' | sed 's/\.md$/.docx/')
  OUTPUT_FILE="$OUTPUT_DIR/$DOCX_NAME"

  # Only convert if .md is newer than .docx (or .docx doesn't exist)
  if [ ! -f "$OUTPUT_FILE" ] || [ "$MD_FILE" -nt "$OUTPUT_FILE" ]; then
    /usr/local/bin/pandoc "$MD_FILE" -o "$OUTPUT_FILE"
    echo "Converted: $REL_PATH -> $DOCX_NAME"
    COUNT=$((COUNT + 1))
  fi
done

echo "Sync complete. $COUNT file(s) converted."
