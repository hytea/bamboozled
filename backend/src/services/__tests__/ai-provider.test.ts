import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeProvider } from '../ai/claude.provider';
import { OpenRouterProvider } from '../ai/openrouter.provider';
import { BaseAIProvider } from '../ai/provider.interface';

describe('AI Providers', () => {
  describe('BaseAIProvider', () => {
    it('should have correct mood tier prompts', () => {
      class TestProvider extends BaseAIProvider {
        async validateAnswer() {
          return { is_correct: true, confidence: 1.0, reasoning: 'test' };
        }
        async generateResponse() {
          return { message: 'test' };
        }
      }

      const provider = new TestProvider();

      // Test that we can call the protected method via a test wrapper
      const tier0Prompt = (provider as any).getMoodTierPrompt(0, true);
      expect(tier0Prompt).toContain('skeptical');

      const tier6Prompt = (provider as any).getMoodTierPrompt(6, true);
      expect(tier6Prompt).toContain('worship');
    });
  });

  describe('ClaudeProvider', () => {
    it('should require API key', () => {
      // This will fail if no API key is configured, which is expected in test env
      expect(() => {
        const provider = new ClaudeProvider();
      }).toThrow();
    });
  });

  describe('OpenRouterProvider', () => {
    it('should require API key', () => {
      // This will fail if no API key is configured, which is expected in test env
      expect(() => {
        const provider = new OpenRouterProvider();
      }).toThrow();
    });
  });
});
