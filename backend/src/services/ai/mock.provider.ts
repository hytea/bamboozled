import type { AIProvider, AIValidationRequest, AIValidationResponse, AIResponseRequest, AIResponseResult } from '../../types/index.js';

/**
 * Mock AI Provider for testing
 * Provides simple rule-based validation without external dependencies
 */
export class MockAIProvider implements AIProvider {
  async validateAnswer(request: AIValidationRequest): Promise<AIValidationResponse> {
    const correct = request.correctAnswer.toLowerCase().trim();
    const guess = request.userGuess.toLowerCase().trim();

    // Exact match
    if (correct === guess) {
      return {
        is_correct: true,
        confidence: 1.0,
        reasoning: 'Exact match'
      };
    }

    // Simple typo tolerance (Levenshtein distance <= 2)
    const distance = this.levenshteinDistance(correct, guess);
    if (distance <= 2 && guess.length >= 3) {
      return {
        is_correct: true,
        confidence: 0.9,
        reasoning: 'Minor typo detected',
        corrected_answer: request.correctAnswer
      };
    }

    return {
      is_correct: false,
      confidence: 1.0,
      reasoning: 'Answer does not match'
    };
  }

  async generateResponse(request: AIResponseRequest): Promise<AIResponseResult> {
    if (request.isCorrect) {
      const messages = [
        `Correct! Well done.`,
        `That's right!`,
        `Excellent guess!`,
        `You got it!`
      ];

      if (request.correctedAnswer) {
        return {
          message: `${messages[request.guessNumber % messages.length]} (You meant: ${request.correctedAnswer})`
        };
      }

      return {
        message: messages[request.guessNumber % messages.length]
      };
    } else {
      const messages = [
        `Not quite. Try again!`,
        `That's incorrect. Keep trying!`,
        `Wrong answer, but don't give up!`,
        `Not the right answer. Give it another shot!`
      ];

      return {
        message: messages[request.guessNumber % messages.length]
      };
    }
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  async determineIntent(message: string, availableCommands: string[]): Promise<string> {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('puzzle')) {
      return '/puzzle';
    }
    if (lowerMessage.includes('leaderboard')) {
      return '/leaderboard';
    }
    if (lowerMessage.includes('stats')) {
      return '/stats';
    }
    if (lowerMessage.includes('alltime')) {
      return '/alltime';
    }
    if (lowerMessage.includes('help')) {
      return '/help';
    }
    if (lowerMessage.includes('mood')) {
      return '/botmood';
    }
    if (lowerMessage.startsWith('hello') || lowerMessage.startsWith('hi')) {
      return 'none';
    }

    return 'guess';
  }
}

