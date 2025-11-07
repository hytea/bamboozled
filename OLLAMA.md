:
# Ollama Local AI Provider Guide

Run Bamboozled **completely free and private** using Ollama - AI models running locally on your machine!

## What is Ollama?

[Ollama](https://ollama.ai/) allows you to run large language models locally on your computer. Benefits include:

- 🆓 **Completely Free** - No API costs, no subscriptions
- 🔒 **100% Private** - All data stays on your machine
- ⚡ **Fast Responses** - No network latency
- 📡 **Works Offline** - No internet required
- 🎯 **Full Control** - Choose any model, customize settings

## Quick Start

### Option 1: Automated Setup

```bash
./setup-ollama.sh
```

The script will:
1. Check if Ollama is installed
2. Start Ollama if needed
3. Download your chosen model
4. Configure your `.env` file

### Option 2: Manual Setup

#### 1. Install Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download from [https://ollama.ai/download](https://ollama.ai/download)

#### 2. Start Ollama

```bash
ollama serve
```

Or on macOS, just open the Ollama app.

#### 3. Pull a Model

```bash
# Recommended for Bamboozled
ollama pull llama3.2

# Other options
ollama pull mistral
ollama pull phi3
ollama pull codellama
```

#### 4. Configure Environment

Edit `.env`:

```bash
AI_PROVIDER=local
LOCAL_MODEL_URL=http://localhost:11434
LOCAL_MODEL_NAME=llama3.2
```

#### 5. Start Backend

```bash
cd backend
npm run dev
```

## Recommended Models

### Best for Bamboozled

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **llama3.2** | 2GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | **Recommended** - Best balance |
| llama3.2:1b | 1GB | ⚡⚡⚡⚡⚡ | ⭐⭐⭐ | Low-end hardware |
| mistral | 4GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | High quality needed |
| phi3 | 2GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | Efficient alternative |

### Installation Commands

```bash
# Fastest (1GB - great for testing)
ollama pull llama3.2:1b

# Recommended (2GB - balanced)
ollama pull llama3.2

# High Quality (4GB - best responses)
ollama pull mistral

# Tiny (400MB - extremely fast)
ollama pull tinyllama
```

### System Requirements

| Model | RAM | Disk | Speed |
|-------|-----|------|-------|
| llama3.2:1b | 4GB | 1GB | Very Fast |
| llama3.2 | 8GB | 2GB | Fast |
| mistral | 16GB | 4GB | Medium |
| phi3 | 8GB | 2GB | Fast |

## Usage

### Basic Operations

```bash
# List installed models
ollama list

# Pull a new model
ollama pull llama3.2

# Test a model interactively
ollama run llama3.2

# Remove a model
ollama rm llama3.2

# Check Ollama version
ollama --version
```

### Switch Models

Change the model anytime:

1. Edit `.env`:
```bash
LOCAL_MODEL_NAME=mistral
```

2. Restart backend:
```bash
cd backend
npm run dev
```

### Multiple Models

Keep multiple models and switch between them:

```bash
# Pull multiple models
ollama pull llama3.2
ollama pull mistral
ollama pull phi3

# Switch by editing .env
LOCAL_MODEL_NAME=llama3.2    # Fast
LOCAL_MODEL_NAME=mistral     # Quality
LOCAL_MODEL_NAME=phi3        # Efficient
```

## Features

### Answer Validation

The Ollama provider uses your local model to validate puzzle answers with:
- Fuzzy matching for typos
- Plural/singular handling
- Semantic understanding
- Fallback to exact match if model fails

### Response Generation

Generates personality-driven responses based on:
- User's mood tier (0-6)
- Current streak
- Total solves
- Guess accuracy

### Health Checks

Automatically verifies:
- Ollama is running
- Selected model is available
- Provides helpful error messages

## Troubleshooting

### "Ollama is not running"

**Solution:**
```bash
# Start Ollama
ollama serve

# Or on macOS
open -a Ollama
```

### "Model not found"

**Solution:**
```bash
# Pull the model
ollama pull llama3.2

# Or list available models
ollama list
```

### Slow Responses

**Solutions:**
1. Use a smaller model:
```bash
ollama pull llama3.2:1b
```

2. Check system resources:
```bash
# macOS/Linux
top
```

3. Close other applications

### Connection Refused

**Check if Ollama is running:**
```bash
curl http://localhost:11434/api/tags
```

**Restart Ollama:**
```bash
# Kill existing process
pkill ollama

# Start fresh
ollama serve
```

### Model Takes Long to Load

First run loads the model into memory (10-30 seconds). Subsequent responses are fast.

**Solution:** Keep Ollama running in the background.

## Advanced Configuration

### Custom Ollama URL

If running Ollama on a different port or machine:

```bash
LOCAL_MODEL_URL=http://192.168.1.100:11434
```

### Model Parameters

Ollama provider automatically optimizes for:
- JSON output for validation
- Non-streaming responses
- Appropriate context length

### Performance Tuning

#### For Faster Responses:
```bash
LOCAL_MODEL_NAME=llama3.2:1b  # Smallest, fastest
```

#### For Better Quality:
```bash
LOCAL_MODEL_NAME=mistral      # Larger, slower, better
```

#### For Code Understanding:
```bash
LOCAL_MODEL_NAME=codellama    # Specialized for code
```

## Testing

### Run Tests

```bash
cd backend
npm test ollama.provider.test.ts
```

### Interactive Testing

```bash
# Test model directly
ollama run llama3.2

# Ask validation question
>>> Is "peice of cake" the same as "piece of cake"? Respond yes or no.

# Exit with
>>> /bye
```

## Cost Comparison

| Provider | Cost per 1000 validations | Notes |
|----------|--------------------------|-------|
| **Ollama** | **$0.00** | Free! |
| Claude Haiku | $0.0225 | Cloud API |
| OpenRouter | $0.0132+ | Varies by model |

**Ollama is completely free!** ✨

## Privacy & Security

### What Stays Local

When using Ollama:
- ✅ All puzzle answers
- ✅ All user guesses
- ✅ All AI responses
- ✅ Player data and statistics

**Nothing is sent to external servers.**

### Network Usage

Ollama only uses network when:
- Pulling/updating models
- You explicitly configure external URLs

During gameplay: **0 bytes sent externally**

## Model Selection Guide

### Choose Based On:

**Hardware Limited? (4GB RAM)**
```bash
ollama pull llama3.2:1b
```

**Normal Computer? (8GB RAM)**
```bash
ollama pull llama3.2  # Recommended
```

**Powerful Machine? (16GB+ RAM)**
```bash
ollama pull mistral
```

**Want Speed Over Quality?**
```bash
ollama pull tinyllama
```

**Need Best Quality?**
```bash
ollama pull mistral
```

## Comparison with Cloud Providers

| Feature | Ollama | Claude | OpenRouter |
|---------|--------|--------|------------|
| Cost | Free | $0.27/1K | $0.01-0.27/1K |
| Privacy | 100% Local | Cloud | Cloud |
| Speed | Fast* | Very Fast | Fast |
| Quality | Good | Excellent | Varies |
| Offline | ✅ Yes | ❌ No | ❌ No |
| Setup | Medium | Easy | Easy |

*After initial model load

## Best Practices

### 1. Model Management

```bash
# Keep only models you use
ollama list
ollama rm unused-model

# Update models periodically
ollama pull llama3.2
```

### 2. Resource Management

- Close Ollama when not using Bamboozled
- Use smaller models for testing
- Upgrade to larger models for production

### 3. Development Workflow

```bash
# Development: Fast model
LOCAL_MODEL_NAME=llama3.2:1b

# Testing: Balanced
LOCAL_MODEL_NAME=llama3.2

# Production: Quality
LOCAL_MODEL_NAME=mistral
```

## Monitoring

### Check Ollama Status

```bash
# List running models
curl http://localhost:11434/api/ps

# View logs (macOS)
tail -f ~/Library/Logs/Ollama/server.log

# View logs (Linux)
journalctl -u ollama -f
```

### Performance Metrics

Track in backend logs:
- Response times
- Validation accuracy
- Fallback usage

## Migrating Between Providers

### From Cloud to Ollama

```bash
# 1. Install and setup Ollama
./setup-ollama.sh

# 2. Test it works
cd backend && npm run dev

# 3. Compare results with your cloud provider
```

### From Ollama to Cloud

```bash
# Edit .env
AI_PROVIDER=openrouter  # or claude
OPENROUTER_API_KEY=your-key

# Restart
cd backend && npm run dev
```

## Community Models

Explore community models at [https://ollama.ai/library](https://ollama.ai/library)

Popular choices:
- `llama3.2` - Meta's latest
- `mistral` - High quality
- `phi3` - Microsoft's efficient model
- `gemma` - Google's open model
- `qwen2` - Alibaba's multilingual model

## FAQ

**Q: Is Ollama really free?**
A: Yes! Completely free and open source.

**Q: How much disk space do I need?**
A: 1-4GB per model. Start with `llama3.2:1b` (1GB).

**Q: Can I use multiple models?**
A: Yes! Pull multiple models and switch via `.env`.

**Q: Does it work on Apple Silicon?**
A: Yes! Ollama has excellent M1/M2/M3 support.

**Q: What about Windows?**
A: Full Windows support available.

**Q: How fast is it?**
A: First load: 10-30s. After that: 1-3s per response.

**Q: Can I use Ollama with Docker?**
A: Yes! See Ollama docs for Docker setup.

## Resources

- 📖 [Ollama Documentation](https://github.com/ollama/ollama)
- 🤖 [Model Library](https://ollama.ai/library)
- 💬 [Discord Community](https://discord.gg/ollama)
- 🐛 [Report Issues](https://github.com/ollama/ollama/issues)

## What's Next?

- ✅ Ollama provider implemented
- ✅ Full test coverage
- ✅ Setup automation
- ⏳ GPU acceleration docs
- ⏳ Custom model fine-tuning
- ⏳ Multi-model ensembles

Happy local AI puzzling! 🧩✨
