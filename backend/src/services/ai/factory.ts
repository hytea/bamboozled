import type { AIProvider } from '../../types/index.js';
import { ClaudeProvider } from './claude.provider.js';
import { OpenRouterProvider } from './openrouter.provider.js';
import { OllamaProvider } from './ollama.provider.js';
import { getConfig } from '../../config/env.js';

export async function createAIProvider(): Promise<AIProvider> {
  const config = getConfig();

  switch (config.AI_PROVIDER) {
    case 'claude':
      return new ClaudeProvider();
    case 'openrouter':
      return new OpenRouterProvider();
    case 'local': {
      const provider = new OllamaProvider();
      const isHealthy = await provider.checkHealth();
      if (!isHealthy) {
        console.warn('⚠️  Ollama is not running or model is not available');
        console.warn('   Install: https://ollama.ai/download');
        console.warn(`   Then run: ollama pull ${config.LOCAL_MODEL_NAME}`);
      }
      return provider;
    }
    default:
      throw new Error(`Unknown AI provider: ${config.AI_PROVIDER}`);
  }
}
