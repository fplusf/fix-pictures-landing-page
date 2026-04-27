#!/bin/bash
# Diagnose Antigravity Gemini MCP setup

echo "=== Antigravity Gemini MCP Diagnostics ==="
echo ""

# 1. Check extensions for any MCP/Gemini server scripts
echo "--- Extensions dir ---"
EXT_DIR="$HOME/.antigravity/antigravity/resources/app/extensions"
if [ -d "$EXT_DIR" ]; then
  ls "$EXT_DIR" | grep -i -E "gemini|mcp|google|ai|copilot"
else
  echo "Not found at $EXT_DIR"
fi

echo ""
echo "--- User extensions ---"
USER_EXT="$HOME/.antigravity-extensions"
if [ -d "$USER_EXT" ]; then
  ls "$USER_EXT" | grep -i -E "gemini|mcp|google|ai"
else
  echo "Not found at $USER_EXT"
fi

echo ""
echo "--- GlobalStorage contents ---"
GSTORAGE="$HOME/Library/Application Support/Antigravity/User/globalStorage"
if [ -d "$GSTORAGE" ]; then
  ls "$GSTORAGE"
else
  echo "Not found at $GSTORAGE"
fi

echo ""
echo "--- Look for any mcp server js/bin files inside Antigravity ---"
find "$HOME/.antigravity" -name "*.js" -path "*mcp*" 2>/dev/null | head -20
find "$HOME/.antigravity" -name "server*" -path "*gemini*" 2>/dev/null | head -10
find "$HOME/.antigravity" -name "*gemini*" 2>/dev/null | head -20

echo ""
echo "--- Check for google gemini npm packages ---"
find "$HOME" -name "package.json" -path "*gemini*mcp*" 2>/dev/null | head -5
find "$HOME" -name "package.json" -path "*google*mcp*" 2>/dev/null | head -5
which gemini-mcp 2>/dev/null || echo "gemini-mcp not in PATH"
which google-mcp 2>/dev/null || echo "google-mcp not in PATH"

echo ""
echo "--- Check npx-available MCP packages ---"
ls "$HOME/.npm/_npx" 2>/dev/null | grep -i -E "gemini|google|mcp" | head -10 || echo "npx cache not found"

echo ""
echo "--- Check if antigravity has a tunnel/serve mode ---"
"$HOME/.antigravity/antigravity/bin/antigravity" chat --help 2>&1 | head -20
