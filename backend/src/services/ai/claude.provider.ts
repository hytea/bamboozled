import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './provider.interface.js';
import type { AIValidationRequest, AIValidationResponse, AIResponseRequest, AIResponseResult } from '../../types/index.js';
import { getConfig } from '../../config/env.js';

export class ClaudeProvider extends BaseAIProvider {
  private client: Anthropic;

  constructor() {
    super();
    const config = getConfig();
    const apiKey = config.ANTHROPIC_API_KEY || config.AI_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY or AI_API_KEY required for Claude provider');
    }

    this.client = new Anthropic({ apiKey });
  }

  async validateAnswer(request: AIValidationRequest): Promise<AIValidationResponse> {
    try {
      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: `${this.getAnswerValidationPrompt()}

Correct answer: "${request.correctAnswer}"
User's guess: "${request.userGuess}"

Respond with JSON only.`
        }],
        system: this.getAnswerValidationPrompt()
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const response = JSON.parse(content.text);
      return {
        is_correct: response.is_correct,
        confidence: response.confidence,
        reasoning: response.reasoning,
        corrected_answer: response.corrected_answer
      };
    } catch (error) {
      console.error('Claude validation error:', error);
      // Fallback to exact match
      const isCorrect = request.correctAnswer.toLowerCase().trim() === request.userGuess.toLowerCase().trim();
      return {
        is_correct: isCorrect,
        confidence: isCorrect ? 1.0 : 0.0,
        reasoning: 'Fallback to exact match due to API error'
      };
    }
  }

  async generateResponse(request: AIResponseRequest): Promise<AIResponseResult> {
    try {
      const systemPrompt = this.getMoodTierPrompt(request.moodTier, request.isCorrect, !!request.correctedAnswer);

      let context = `
Current context:
- User: ${request.userName || 'Player'}
- Streak: ${request.streak} weeks
- Total solves: ${request.totalSolves}
- Guess number: ${request.guessNumber}
- First place finishes: ${request.firstPlaceCount || 0}
- Answer was: ${request.isCorrect ? 'CORRECT' : 'INCORRECT'}`;

      if (request.correctedAnswer) {
        context += `
- User had a minor typo. Corrected answer: "${request.correctedAnswer}"
- Acknowledge the typo but confirm they got it right`;
      }

      context += '\n\nGenerate an appropriate response matching your personality tier. Make it unique and natural.';

      const message = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: context
        }],
        system: systemPrompt
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return { message: content.text };
    } catch (error) {
      console.error('Claude response generation error:', error);
      return {
        message: request.isCorrect
          ? 'Correct!'
          : 'Not quite. Try again!'
      };
    }
  }

  async determineIntent(message: string, availableCommands: string[]): Promise<string> {
    const systemPrompt = this.getDetermineIntentPrompt();

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 32,
        messages: [{
          role: 'user',
          content: message
        }],
        system: systemPrompt
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const intent = content.text.trim();
      if (availableCommands.includes(intent) || intent === 'guess' || intent === 'none') {
        return intent;
      }

      return 'guess';
    } catch (error) {
      console.error('Claude intent determination error:', error);
      return 'guess';
    }
  }
}
