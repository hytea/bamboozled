#!/bin/bash

# Ollama Setup Script for Bamboozled
# This script helps you configure Ollama as your local AI provider

set -e

echo "╔════════════════════════════════════════════╗"
echo "║      Ollama Setup for Bamboozled          ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
  echo "❌ Ollama is not installed!"
  echo ""
  echo "Please install Ollama first:"
  echo "  🍎 macOS:   brew install ollama"
  echo "  🐧 Linux:   curl -fsSL https://ollama.ai/install.sh | sh"
  echo "  🪟 Windows: Download from https://ollama.ai/download"
  echo ""
  exit 1
fi

echo "✅ Ollama is installed"
echo ""

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
  echo "⚠️  Ollama is not running"
  echo "📝 Starting Ollama..."

  # Start Ollama in background
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open -a Ollama 2>/dev/null || ollama serve &
  else
    # Linux
    ollama serve &
  fi

  # Wait for Ollama to start
  echo "⏳ Waiting for Ollama to start..."
  for i in {1..10}; do
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
      echo "✅ Ollama is running"
      break
    fi
    sleep 1
  done
fi

# List available models
echo ""
echo "📦 Checking available models..."
models=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ -z "$models" ]; then
  echo "⚠️  No models found"
else
  echo "Available models:"
  echo "$models" | while read -r model; do
    echo "  • $model"
  done
fi

# Ask which model to use
echo ""
echo "🤖 Choose a model to download:"
echo "   1. llama3.2 (Recommended - 2GB, fast & capable)"
echo "   2. llama3.2:1b (Tiny - 1GB, very fast)"
echo "   3. mistral (Good - 4GB, high quality)"
echo "   4. phi3 (Small - 2GB, efficient)"
echo "   5. codellama (Code - 4GB, specialized)"
echo "   6. Custom model"
echo "   7. Skip (I already have a model)"
echo ""
read -p "Choice [1]: " choice
choice=${choice:-1}

case $choice in
  1)
    model="llama3.2"
    ;;
  2)
    model="llama3.2:1b"
    ;;
  3)
    model="mistral"
    ;;
  4)
    model="phi3"
    ;;
  5)
    model="codellama"
    ;;
  6)
    echo ""
    read -p "Enter model name (e.g., llama3.2): " model
    ;;
  7)
    echo ""
    read -p "Enter your existing model name: " model
    ;;
  *)
    model="llama3.2"
    ;;
esac

# Check if model needs to be pulled
if ! echo "$models" | grep -q "$model"; then
  echo ""
  echo "📥 Pulling model: $model"
  echo "   This may take a few minutes..."
  ollama pull "$model"
  echo "✅ Model downloaded successfully"
else
  echo "✅ Model already available: $model"
fi

# Update .env file
echo ""
echo "📝 Updating .env file..."

if [ ! -f .env ]; then
  echo "Creating .env from example..."
  cp .env.example .env
fi

# Remove old AI provider settings
sed -i.bak '/^AI_PROVIDER=/d' .env
sed -i.bak '/^LOCAL_MODEL_URL=/d' .env
sed -i.bak '/^LOCAL_MODEL_NAME=/d' .env

# Add new settings
cat >> .env << EOF

# Ollama (Local Model) Configuration
AI_PROVIDER=local
LOCAL_MODEL_URL=http://localhost:11434
LOCAL_MODEL_NAME=$model
EOF

echo "✅ Configuration updated!"
echo ""

# Show summary
echo "╔════════════════════════════════════════════╗"
echo "║            Setup Complete! ✅              ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Configuration:"
echo "  Provider: Ollama (Local)"
echo "  Model: $model"
echo "  URL: http://localhost:11434"
echo ""
echo "✨ Benefits of using Ollama:"
echo "  • 🆓 Completely free"
echo "  • 🔒 100% private (runs locally)"
echo "  • ⚡ Fast responses (no API calls)"
echo "  • 📡 Works offline"
echo ""
echo "Next steps:"
echo "  1. cd backend && npm install"
echo "  2. npm run dev"
echo "  3. Open http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  • List models: ollama list"
echo "  • Pull new model: ollama pull <model>"
echo "  • Test model: ollama run $model"
echo "  • Change model: edit .env and update LOCAL_MODEL_NAME"
echo ""
echo "Documentation: See OLLAMA.md for full guide"
echo ""
echo "Happy puzzling! 🧩✨"
