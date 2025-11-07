# OpenRouter AI Provider Guide

OpenRouter is **already fully implemented** in Bamboozled! This guide shows you how to use it.

## What is OpenRouter?

[OpenRouter](https://openrouter.ai/) is a unified API that gives you access to multiple AI models through a single endpoint. Benefits include:

- 🎯 **Access multiple models** - Claude, GPT-4, Llama, Mistral, and more
- 💰 **Cost-effective** - Often cheaper than direct API access
- 🔄 **Easy switching** - Change models without changing code
- 📊 **Transparent pricing** - Pay only for what you use

## Quick Start

### 1. Get Your OpenRouter API Key

1. Go to [https://openrouter.ai/](https://openrouter.ai/)
2. Sign up for a free account
3. Navigate to **Keys** section
4. Create a new API key
5. Copy your key (starts with `sk-or-...`)

### 2. Configure Your Environment

Edit your `.env` file:

```bash
# Set provider to openrouter
AI_PROVIDER=openrouter

# Add your OpenRouter API key
OPENROUTER_API_KEY=sk-or-your-key-here

# Choose your model (optional - defaults to Claude Sonnet 4.5)
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
```

### 3. Start the Backend

```bash
cd backend
npm run dev
```

That's it! Your bot will now use OpenRouter for AI responses. ✅

## Available Models

OpenRouter supports many models. Here are some popular options:

### High Performance (Recommended)
```bash
# Claude Sonnet 4.5 (default - best balance of speed/quality)
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5

# Claude Opus 4 (highest quality)
OPENROUTER_MODEL=anthropic/claude-opus-4

# GPT-4 Turbo
OPENROUTER_MODEL=openai/gpt-4-turbo
```

### Cost-Effective
```bash
# Claude Haiku (fast and cheap)
OPENROUTER_MODEL=anthropic/claude-haiku-4

# GPT-3.5 Turbo
OPENROUTER_MODEL=openai/gpt-3.5-turbo

# Mistral Small
OPENROUTER_MODEL=mistralai/mistral-small
```

### Open Source
```bash
# Llama 3.3 70B
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct

# Qwen 2.5 72B
OPENROUTER_MODEL=qwen/qwen-2.5-72b-instruct
```

See full model list at: https://openrouter.ai/models

## Cost Comparison

Example costs per 1M tokens (as of Nov 2024):

| Model | Input | Output | Best For |
|-------|-------|--------|----------|
| Claude Sonnet 4.5 | $3 | $15 | Balanced performance |
| Claude Haiku 4 | $0.25 | $1.25 | High volume, speed |
| GPT-4 Turbo | $10 | $30 | Maximum quality |
| Llama 3.3 70B | $0.88 | $0.88 | Open source, cheap |

💡 **Tip**: Start with Claude Haiku for testing, upgrade to Sonnet for production.

## Implementation Details

### Provider Architecture

```typescript
// backend/src/services/ai/openrouter.provider.ts
export class OpenRouterProvider extends BaseAIProvider {
  async validateAnswer(request: AIValidationRequest): Promise<AIValidationResponse>
  async generateResponse(request: AIResponseRequest): Promise<AIResponseResult>
}
```

### Features

- ✅ **Answer Validation** - Fuzzy matching with AI intelligence
- ✅ **Personality Generation** - 7-tier mood system responses
- ✅ **Error Handling** - Automatic fallback to exact match
- ✅ **Rate Limiting** - Graceful handling of API limits
- ✅ **Cost Tracking** - Headers for usage monitoring

### API Headers

The implementation includes proper headers for tracking:

```typescript
headers: {
  'Authorization': `Bearer ${apiKey}`,
  'HTTP-Referer': 'https://github.com/bamboozled-puzzle',
  'X-Title': 'Bamboozled Puzzle Game'
}
```

## Testing

Run the comprehensive test suite:

```bash
cd backend
npm test openrouter.provider.test.ts
```

Test coverage includes:
- ✅ Answer validation (correct/incorrect)
- ✅ Response generation (all mood tiers)
- ✅ Error handling and fallbacks
- ✅ API request formatting
- ✅ User context injection

## Switching Between Providers

Change providers anytime by updating `.env`:

### Use Claude Direct
```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-your-key
```

### Use OpenRouter
```bash
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-your-key
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
```

### Use Local Model (Coming Soon)
```bash
AI_PROVIDER=local
LOCAL_MODEL_URL=http://localhost:11434
```

No code changes needed! Just restart the backend.

## Monitoring Usage

### Check Your OpenRouter Dashboard

1. Visit [https://openrouter.ai/activity](https://openrouter.ai/activity)
2. View real-time API usage
3. Track costs per model
4. Set spending limits

### Add Credits

OpenRouter uses a prepaid credit system:
- Minimum top-up: $5
- Credits never expire
- Automatic low-balance notifications

## Troubleshooting

### Error: "OPENROUTER_API_KEY required"

**Solution**: Add your API key to `.env`
```bash
OPENROUTER_API_KEY=sk-or-your-actual-key
```

### Error: "Rate limit exceeded"

**Solutions**:
1. Add credits to your OpenRouter account
2. Switch to a cheaper model temporarily
3. The system will fallback to exact match validation

### Error: "Model not found"

**Solution**: Check model name at https://openrouter.ai/models
```bash
# Make sure model ID is correct
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5
```

### Slow Responses

**Solutions**:
1. Switch to a faster model (Claude Haiku, GPT-3.5)
2. Check OpenRouter status page
3. Verify your internet connection

## Best Practices

### 1. Model Selection

```bash
# Development: Use cheaper models
OPENROUTER_MODEL=anthropic/claude-haiku-4

# Production: Use balanced models
OPENROUTER_MODEL=anthropic/claude-sonnet-4.5

# Special events: Use premium models
OPENROUTER_MODEL=anthropic/claude-opus-4
```

### 2. Cost Management

- Set spending limits in OpenRouter dashboard
- Monitor usage in Activity tab
- Use haiku for high-volume testing

### 3. Error Handling

The provider automatically falls back to exact match if:
- API is unavailable
- Rate limits exceeded
- Network errors occur

### 4. Testing

```bash
# Test with a specific model
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct npm run dev
```

## Advanced Configuration

### Custom Headers

Edit `backend/src/services/ai/openrouter.provider.ts`:

```typescript
headers: {
  'Authorization': `Bearer ${this.apiKey}`,
  'HTTP-Referer': 'https://your-site.com',
  'X-Title': 'Your App Name',
  // Add custom headers for tracking
  'X-User-ID': userId
}
```

### Request Parameters

Modify the API call to add parameters:

```typescript
body: JSON.stringify({
  model: this.model,
  messages: [...],
  // Add optional parameters
  temperature: 0.7,
  max_tokens: 1024,
  top_p: 0.9
})
```

## Resources

- 📖 [OpenRouter Documentation](https://openrouter.ai/docs)
- 🤖 [Available Models](https://openrouter.ai/models)
- 💰 [Pricing Calculator](https://openrouter.ai/models)
- 📊 [Activity Dashboard](https://openrouter.ai/activity)
- 💬 [Discord Community](https://discord.gg/openrouter)

## Support

Having issues? Check:
1. This guide's troubleshooting section
2. OpenRouter documentation
3. Backend logs: `cd backend && npm run dev`
4. Test suite: `cd backend && npm test`

## What's Next?

- ✅ OpenRouter is implemented
- ✅ Test suite created
- ⏳ Local model provider (Ollama) - coming soon
- ⏳ Custom model fine-tuning support
- ⏳ Multi-provider load balancing

Happy puzzling! 🧩✨
