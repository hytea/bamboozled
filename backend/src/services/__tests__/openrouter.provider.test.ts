import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenRouterProvider } from '../ai/openrouter.provider';
import type { AIValidationRequest, AIResponseRequest } from '../../types';

vi.mock('../../config/env', () => ({
  getConfig: () => ({
    OPENROUTER_API_KEY: 'test-key',
    OPENROUTER_MODEL: 'anthropic/claude-sonnet-4.5',
    AI_API_KEY: 'test-key'
  })
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenRouterProvider();
  });

  describe('constructor', () => {
    it('should initialize with API key', () => {
      expect(provider).toBeDefined();
    });

    it('should throw error when API key is missing', () => {
      vi.resetModules();
      vi.doMock('../../config/env', () => ({
        getConfig: () => ({
          OPENROUTER_API_KEY: '',
          AI_API_KEY: '',
          OPENROUTER_MODEL: 'anthropic/claude-sonnet-4.5'
        })
      }));

      expect(() => new OpenRouterProvider()).toThrow('OPENROUTER_API_KEY or AI_API_KEY required');
    });
  });

  describe('validateAnswer', () => {
    it('should validate correct answer', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              is_correct: true,
              confidence: 0.95,
              reasoning: 'Exact match'
            })
          }
        }]
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
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/bamboozled-puzzle',
            'X-Title': 'Bamboozled Puzzle Game'
          })
        })
      );
    });

    it('should validate incorrect answer', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              is_correct: false,
              confidence: 0.1,
              reasoning: 'Different answer'
            })
          }
        }]
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

    it('should fallback to exact match on API error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API error'));

      const request: AIValidationRequest = {
        correctAnswer: 'test answer',
        userGuess: 'test answer'
      };

      const result = await provider.validateAnswer(request);

      expect(result.is_correct).toBe(true);
      expect(result.confidence).toBe(1.0);
      expect(result.reasoning).toContain('Fallback to exact match');
    });

    it('should handle API response errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Rate limit exceeded'
      });

      const request: AIValidationRequest = {
        correctAnswer: 'test answer',
        userGuess: 'wrong answer'
      };

      const result = await provider.validateAnswer(request);

      expect(result.is_correct).toBe(false);
      expect(result.reasoning).toContain('Fallback');
    });
  });

  describe('generateResponse', () => {
    it('should generate response for correct answer', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Great job! You got it right!'
          }
        }]
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
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST'
        })
      );
    });

    it('should generate response for incorrect answer', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Not quite. Try again!'
          }
        }]
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

    it('should handle different mood tiers', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Magnificent work, oh great master of puzzles!'
          }
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: AIResponseRequest = {
        moodTier: 6, // The Worshipper
        streak: 20,
        totalSolves: 60,
        isCorrect: true,
        guessNumber: 1,
        userName: 'Puzzle Master',
        firstPlaceCount: 15
      };

      const result = await provider.generateResponse(request);

      expect(result.message).toContain('Magnificent');
    });

    it('should fallback on API error', async () => {
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

      expect(result.message).toBe('Correct!');
    });

    it('should include user context in request', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Response with context'
          }
        }]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const request: AIResponseRequest = {
        moodTier: 3,
        streak: 5,
        totalSolves: 10,
        isCorrect: true,
        guessNumber: 2,
        userName: 'John Doe',
        firstPlaceCount: 3
      };

      await provider.generateResponse(request);

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);

      expect(body.messages[1].content).toContain('John Doe');
      expect(body.messages[1].content).toContain('5 weeks');
      expect(body.messages[1].content).toContain('10');
      expect(body.messages[1].content).toContain('3');
    });
  });
});
