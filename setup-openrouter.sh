#!/bin/bash

# OpenRouter Setup Script for Bamboozled
# This script helps you quickly configure OpenRouter as your AI provider

set -e

echo "╔════════════════════════════════════════════╗"
echo "║     OpenRouter Setup for Bamboozled       ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ .env file not found!"
  echo "📝 Creating .env from example..."
  cp .env.example .env
  echo "✅ Created .env file"
fi

# Get API key
echo "🔑 Please enter your OpenRouter API key"
echo "   (Get one at https://openrouter.ai/keys)"
echo ""
read -p "API Key (sk-or-...): " api_key

if [ -z "$api_key" ]; then
  echo "❌ API key is required!"
  exit 1
fi

# Ask for model preference
echo ""
echo "🤖 Choose your model:"
echo "   1. Claude Sonnet 4.5 (Recommended - balanced)"
echo "   2. Claude Haiku 4 (Fast & cheap)"
echo "   3. Claude Opus 4 (Highest quality)"
echo "   4. GPT-4 Turbo"
echo "   5. Llama 3.3 70B (Open source)"
echo "   6. Custom model"
echo ""
read -p "Choice [1]: " choice
choice=${choice:-1}

case $choice in
  1)
    model="anthropic/claude-sonnet-4.5"
    ;;
  2)
    model="anthropic/claude-haiku-4"
    ;;
  3)
    model="anthropic/claude-opus-4"
    ;;
  4)
    model="openai/gpt-4-turbo"
    ;;
  5)
    model="meta-llama/llama-3.3-70b-instruct"
    ;;
  6)
    echo ""
    read -p "Enter model ID (e.g., anthropic/claude-sonnet-4.5): " model
    ;;
  *)
    model="anthropic/claude-sonnet-4.5"
    ;;
esac

# Update .env file
echo ""
echo "📝 Updating .env file..."

# Remove old AI provider settings
sed -i.bak '/^AI_PROVIDER=/d' .env
sed -i.bak '/^OPENROUTER_API_KEY=/d' .env
sed -i.bak '/^OPENROUTER_MODEL=/d' .env
sed -i.bak '/^AI_API_KEY=/d' .env

# Add new settings
cat >> .env << EOF

# OpenRouter Configuration
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=$api_key
OPENROUTER_MODEL=$model
EOF

echo "✅ Configuration updated!"
echo ""

# Show summary
echo "╔════════════════════════════════════════════╗"
echo "║            Setup Complete! ✅              ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "Configuration:"
echo "  Provider: OpenRouter"
echo "  Model: $model"
echo ""
echo "Next steps:"
echo "  1. cd backend && npm install"
echo "  2. npm run dev"
echo "  3. Open http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  • View logs: cd backend && npm run dev"
echo "  • Run tests: cd backend && npm test openrouter"
echo "  • Change model: edit .env and change OPENROUTER_MODEL"
echo ""
echo "Documentation: See OPENROUTER.md for full guide"
echo ""
echo "Happy puzzling! 🧩✨"
