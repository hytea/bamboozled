import { GeneratedPuzzleRepository } from '../db/repositories/generated-puzzle.repository.js';
import { ClaudeProvider } from './ai/claude.provider.js';
import type { GeneratedPuzzle } from '../db/schema.js';

interface PuzzleGenerationRequest {
  userId: string;
  theme?: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

interface GeneratedPuzzleResponse {
  concept: string;
  answer: string;
  visualDescription: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export class PuzzleGeneratorService {
  private repository: GeneratedPuzzleRepository;
  private aiProvider: ClaudeProvider;

  constructor() {
    this.repository = new GeneratedPuzzleRepository();
    this.aiProvider = new ClaudeProvider();
  }

  /**
   * Generate a new Bamboozle-style puzzle using AI
   */
  async generatePuzzle(request: PuzzleGenerationRequest): Promise<GeneratedPuzzle> {
    // Get AI-generated puzzle concept
    const generatedPuzzle = await this.callAIForPuzzleGeneration(
      request.theme,
      request.difficulty || 'MEDIUM'
    );

    // Save to database with PENDING status
    const savedPuzzle = await this.repository.create({
      puzzle_concept: generatedPuzzle.concept,
      answer: generatedPuzzle.answer,
      visual_description: generatedPuzzle.visualDescription,
      difficulty: generatedPuzzle.difficulty,
      status: 'PENDING',
      generated_by: request.userId,
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      theme: request.theme || null,
    });

    return savedPuzzle;
  }

  /**
   * Call Claude AI to generate a Bamboozle puzzle
   */
  private async callAIForPuzzleGeneration(
    theme?: string,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'
  ): Promise<GeneratedPuzzleResponse> {
    const prompt = this.buildGenerationPrompt(theme, difficulty);

    const message = await (this.aiProvider as any).client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      system: `You are a creative puzzle designer for "Bamboozled", a visual word puzzle game.
Your task is to create clever, creative visual word puzzles (also known as rebus puzzles) where the answer is represented through creative text layout, typography, or visual wordplay.

Respond ONLY with valid JSON matching this exact format:
{
  "concept": "Brief description of the puzzle idea",
  "answer": "The answer phrase",
  "visualDescription": "Detailed description of how to display the answer visually",
  "difficulty": "EASY" | "MEDIUM" | "HARD"
}`,
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from response (might be wrapped in markdown)
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    const response = JSON.parse(jsonText);

    return {
      concept: response.concept,
      answer: response.answer,
      visualDescription: response.visualDescription,
      difficulty: response.difficulty || difficulty,
    };
  }

  /**
   * Build the AI prompt for puzzle generation
   */
  private buildGenerationPrompt(theme?: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM'): string {
    let prompt = `Create a NEW Bamboozle visual word puzzle. Study these examples first:

EXAMPLES:
1. Answer: "Falling Temperature"
   Visual: The word "temperature" displayed vertically, falling downward

2. Answer: "Head in the Sand"
   Visual: The word "head" embedded/buried inside the word "SAND"

3. Answer: "Two Under Par"
   Visual: The number "2" positioned below the word "PAR"

4. Answer: "Overseas"
   Visual: The letter "C" positioned above the word "SEAS"

5. Answer: "Man Overboard"
   Visual: The word "MAN" positioned above the word "BOARD"

6. Answer: "Split Second"
   Visual: The word "SECOND" split into "SEC" and "OND"

DIFFICULTY LEVEL: ${difficulty}
${difficulty === 'EASY' ? '- Use simple, common phrases\n- Visual representation should be straightforward' : ''}
${difficulty === 'MEDIUM' ? '- Use moderately common phrases\n- Visual representation can be clever but not obscure' : ''}
${difficulty === 'HARD' ? '- Use less common phrases or idioms\n- Visual representation can be very creative and challenging' : ''}

${theme ? `THEME: ${theme}\n- The puzzle should relate to: ${theme}` : ''}

Now create a completely NEW and ORIGINAL puzzle:
- Answer should be a common phrase, idiom, or compound word
- Visual description must explain EXACTLY how to display it (placement, orientation, formatting)
- Be creative and unique - don't copy the examples!
- Ensure the visual representation clearly connects to the answer

Respond with JSON only.`;

    return prompt;
  }

  /**
   * Get pending puzzles for admin review
   */
  async getPendingPuzzles(): Promise<GeneratedPuzzle[]> {
    return this.repository.findPendingPuzzles();
  }

  /**
   * Get approved puzzles
   */
  async getApprovedPuzzles(): Promise<GeneratedPuzzle[]> {
    return this.repository.findApprovedPuzzles();
  }

  /**
   * Get user's generated puzzles
   */
  async getUserPuzzles(userId: string): Promise<GeneratedPuzzle[]> {
    return this.repository.findByUser(userId);
  }

  /**
   * Approve a generated puzzle
   */
  async approvePuzzle(puzzleId: string, reviewerId: string): Promise<GeneratedPuzzle> {
    return this.repository.approve(puzzleId, reviewerId);
  }

  /**
   * Reject a generated puzzle
   */
  async rejectPuzzle(puzzleId: string, reviewerId: string, reason: string): Promise<GeneratedPuzzle> {
    return this.repository.reject(puzzleId, reviewerId, reason);
  }

  /**
   * Get generation statistics
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    return this.repository.getStats();
  }
}
