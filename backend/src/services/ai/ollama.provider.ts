import { BaseAIProvider } from './provider.interface.js';
import type { AIValidationRequest, AIValidationResponse, AIResponseRequest, AIResponseResult } from '../../types/index.js';
import { getConfig } from '../../config/env.js';

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export class OllamaProvider extends BaseAIProvider {
  private baseUrl: string;
  private model: string;

  constructor() {
    super();
    const config = getConfig();
    this.baseUrl = config.LOCAL_MODEL_URL || 'http://localhost:11434';
    this.model = config.LOCAL_MODEL_NAME || 'llama3.2';

    // Remove trailing slash from baseUrl
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
  }

  /**
   * Check if Ollama is running and the model is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json() as { models: Array<{ name: string }> };
      const modelExists = data.models.some(m => m.name.includes(this.model));

      if (!modelExists) {
        console.warn(`⚠️  Model "${this.model}" not found in Ollama. Available models:`, data.models.map(m => m.name));
        console.warn(`   Run: ollama pull ${this.model}`);
      }

      return modelExists;
    } catch (error) {
      console.error('❌ Ollama health check failed:', error);
      console.error('   Make sure Ollama is running: ollama serve');
      return false;
    }
  }

  async validateAnswer(request: AIValidationRequest): Promise<AIValidationResponse> {
    try {
      const prompt = `${this.getAnswerValidationPrompt()}

Correct answer: "${request.correctAnswer}"
User's guess: "${request.userGuess}"

Respond with JSON only.`;

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: this.getAnswerValidationPrompt() },
            { role: 'user', content: prompt }
          ],
          stream: false,
          format: 'json'
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      const content = data.message.content;

      if (!content) {
        throw new Error('No content in Ollama response');
      }

      // Parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        // If JSON parsing fails, try to extract JSON from the content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse JSON from response');
        }
      }

      return {
        is_correct: parsed.is_correct || false,
        confidence: parsed.confidence || 0.5,
        reasoning: parsed.reasoning || 'Response parsed from local model'
      };
    } catch (error) {
      console.error('Ollama validation error:', error);
      // Fallback to exact match
      const isCorrect = request.correctAnswer.toLowerCase().trim() === request.userGuess.toLowerCase().trim();
      return {
        is_correct: isCorrect,
        confidence: isCorrect ? 1.0 : 0.0,
        reasoning: 'Fallback to exact match due to local model error'
      };
    }
  }

  async generateResponse(request: AIResponseRequest): Promise<AIResponseResult> {
    try {
      const systemPrompt = this.getMoodTierPrompt(request.moodTier, request.isCorrect);
      const context = `
Current context:
- User: ${request.userName || 'Player'}
- Streak: ${request.streak} weeks
- Total solves: ${request.totalSolves}
- Guess number: ${request.guessNumber}
- First place finishes: ${request.firstPlaceCount || 0}
- Answer was: ${request.isCorrect ? 'CORRECT' : 'INCORRECT'}

Generate an appropriate response matching your personality tier. Make it unique and natural.`;

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: context }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json() as OllamaResponse;
      const content = data.message.content;

      return { message: content || 'No response generated' };
    } catch (error) {
      console.error('Ollama response generation error:', error);
      return {
        message: request.isCorrect
          ? 'Correct! Well done!'
          : 'Not quite right. Try again!'
      };
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName?: string): Promise<boolean> {
    const model = modelName || this.model;

    try {
      console.log(`📥 Pulling model: ${model}...`);

      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: model, stream: false })
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.statusText}`);
      }

      console.log(`✅ Model ${model} pulled successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to pull model ${model}:`, error);
      return false;
    }
  }

  /**
   * List available models in Ollama
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to list models');
      }

      const data = await response.json() as { models: Array<{ name: string }> };
      return data.models.map(m => m.name);
    } catch (error) {
      console.error('Error listing models:', error);
      return [];
    }
  }
}
