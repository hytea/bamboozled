import { BaseAIProvider } from './provider.interface.js';
import type { AIValidationRequest, AIValidationResponse, AIResponseRequest, AIResponseResult } from '../../types/index.js';
import { getConfig } from '../../config/env.js';

export class OpenRouterProvider extends BaseAIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    super();
    const config = getConfig();
    this.apiKey = config.OPENROUTER_API_KEY || config.AI_API_KEY || '';
    this.model = config.OPENROUTER_MODEL;

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY or AI_API_KEY required for OpenRouter provider');
    }
  }

  async validateAnswer(request: AIValidationRequest): Promise<AIValidationResponse> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/bamboozled-puzzle',
          'X-Title': 'Bamboozled Puzzle Game'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: this.getAnswerValidationPrompt() },
            { role: 'user', content: `Correct answer: "${request.correctAnswer}"\nUser's guess: "${request.userGuess}"\n\nRespond with JSON only.` }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenRouter response');
      }

      const parsed = JSON.parse(content);
      return {
        is_correct: parsed.is_correct,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        corrected_answer: parsed.corrected_answer
      };
    } catch (error) {
      console.error('OpenRouter validation error:', error);
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

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/bamboozled-puzzle',
          'X-Title': 'Bamboozled Puzzle Game'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const content = data.choices[0]?.message?.content;

      return { message: content || 'No response generated' };
    } catch (error) {
      console.error('OpenRouter response generation error:', error);
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
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/bamboozled-puzzle',
          'X-Title': 'Bamboozled Puzzle Game'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      const intent = data.choices[0]?.message?.content.trim();

      if (availableCommands.includes(intent) || intent === 'guess' || intent === 'none') {
        return intent;
      }

      return 'guess';
    } catch (error) {
      console.error('OpenRouter intent determination error:', error);
      return 'guess';
    }
  }
}

