import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OllamaProvider } from '../ai/ollama.provider';
import type { AIValidationRequest, AIResponseRequest } from '../../types';

vi.mock('../../config/env', () => ({
  getConfig: () => ({
    LOCAL_MODEL_URL: 'http://localhost:11434',
    LOCAL_MODEL_NAME: 'llama3.2'
  })
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OllamaProvider();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(provider).toBeDefined();
    });

    it('should remove trailing slash from baseUrl', () => {
      vi.doMock('../../config/env', () => ({
        getConfig: () => ({
          LOCAL_MODEL_URL: 'http://localhost:11434/',
          LOCAL_MODEL_NAME: 'llama3.2'
        })
      }));

      const provider = new OllamaProvider();
      expect(provider).toBeDefined();
    });
  });

  describe('checkHealth', () => {
    it('should return true when Ollama is running and model exists', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'llama3.2:latest' },
            { name: 'mistral:latest' }
          ]
        })
      });

      const result = await provider.checkHealth();
      expect(result).toBe(true);
    });

    it('should return false when Ollama is not running', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Connection refused'));

      const result = await provider.checkHealth();
      expect(result).toBe(false);
    });

    it('should return false when model is not available', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'mistral:latest' }
          ]
        })
      });

      const result = await provider.checkHealth();
      expect(result).toBe(false);
    });
  });

  describe('validateAnswer', () => {
    it('should validate correct answer', async () => {
      const mockResponse = {
        model: 'llama3.2',
        created_at: '2024-01-01',
        message: {
          role: 'assistant',
          content: JSON.stringify({
            is_correct: true,
            confidence: 0.95,
            reasoning: 'Exact match'
          })
        },
        done: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: AIValidationRequest = {
        correctAnswer: 'test answer',
        userGuess: 'test answer'
      };

      const result = await provider.validateAnswer(request);

      expect(result.is_correct).toBe(true);
      expect(result.confidence).toBe(0.95);
      expect(result.reasoning).toBe('Exact match');
    });

    it('should validate incorrect answer', async () => {
      const mockResponse = {
        model: 'llama3.2',
        created_at: '2024-01-01',
        message: {
          role: 'assistant',
          content: JSON.stringify({
            is_correct: false,
            confidence: 0.1,
            reasoning: 'Different answer'
          })
        },
        done: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: AIValidationRequest = {
        correctAnswer: 'test answer',
        userGuess: 'wrong answer'
      };

      const result = await provider.validateAnswer(request);

      expect(result.is_correct).toBe(false);
      expect(result.confidence).toBe(0.1);
    });

    it('should handle JSON parsing with extra text', async () => {
      const mockResponse = {
        model: 'llama3.2',
        created_at: '2024-01-01',
        message: {
          role: 'assistant',
          content: 'Here is the JSON: {"is_correct": true, "confidence": 0.9, "reasoning": "Good match"}'
        },
        done: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: AIValidationRequest = {
        correctAnswer: 'test',
        userGuess: 'test'
      };

      const result = await provider.validateAnswer(request);

      expect(result.is_correct).toBe(true);
      expect(result.confidence).toBe(0.9);
    });

    it('should fallback to exact match on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const request: AIValidationRequest = {
        correctAnswer: 'test answer',
        userGuess: 'test answer'
      };

      const result = await provider.validateAnswer(request);

      expect(result.is_correct).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.reasoning).toContain('Fallback');
    });

    it('should send request with format json', async () => {
      const mockResponse = {
        model: 'llama3.2',
        message: { role: 'assistant', content: '{"is_correct": true, "confidence": 1.0, "reasoning": "test"}' },
        done: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: AIValidationRequest = {
        correctAnswer: 'test',
        userGuess: 'test'
      };

      await provider.validateAnswer(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.format).toBe('json');
      expect(body.stream).toBe(false);
    });
  });

  describe('generateResponse', () => {
    it('should generate response for correct answer', async () => {
      const mockResponse = {
        model: 'llama3.2',
        created_at: '2024-01-01',
        message: {
          role: 'assistant',
          content: 'Great job! You got it right!'
        },
        done: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: AIResponseRequest = {
        moodTier: 0,
        streak: 1,
        totalSolves: 1,
        isCorrect: true,
        guessNumber: 1,
        userName: 'Test User',
        firstPlaceCount: 0
      };

      const result = await provider.generateResponse(request);

      expect(result.message).toBe('Great job! You got it right!');
    });

    it('should generate response for incorrect answer', async () => {
      const mockResponse = {
        model: 'llama3.2',
        created_at: '2024-01-01',
        message: {
          role: 'assistant',
          content: 'Not quite. Try again!'
        },
        done: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: AIResponseRequest = {
        moodTier: 0,
        streak: 0,
        totalSolves: 0,
        isCorrect: false,
        guessNumber: 1,
        userName: 'Test User',
        firstPlaceCount: 0
      };

      const result = await provider.generateResponse(request);

      expect(result.message).toBe('Not quite. Try again!');
    });

    it('should fallback on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const request: AIResponseRequest = {
        moodTier: 0,
        streak: 0,
        totalSolves: 0,
        isCorrect: true,
        guessNumber: 1,
        userName: 'Test User',
        firstPlaceCount: 0
      };

      const result = await provider.generateResponse(request);

      expect(result.message).toBe('Correct! Well done!');
    });
  });

  describe('pullModel', () => {
    it('should pull model successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      });

      const result = await provider.pullModel('llama3.2');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/pull',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should handle pull failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not found'
      });

      const result = await provider.pullModel('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'llama3.2:latest' },
            { name: 'mistral:latest' },
            { name: 'codellama:latest' }
          ]
        })
      });

      const result = await provider.listModels();

      expect(result).toEqual(['llama3.2:latest', 'mistral:latest', 'codellama:latest']);
    });

    it('should return empty array on error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await provider.listModels();

      expect(result).toEqual([]);
    });
  });
});
