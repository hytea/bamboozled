import type { AIProvider, AIValidationRequest, AIValidationResponse, AIResponseRequest, AIResponseResult } from '../../types/index.js';

export abstract class BaseAIProvider implements AIProvider {
  abstract validateAnswer(request: AIValidationRequest): Promise<AIValidationResponse>;
  abstract generateResponse(request: AIResponseRequest): Promise<AIResponseResult>;
  abstract determineIntent(message: string, availableCommands: string[]): Promise<string>;

  protected getMoodTierPrompt(tier: number, isCorrect: boolean, hasCorrectedAnswer: boolean = false): string {
    const typoSuffix = hasCorrectedAnswer
      ? " If a corrected answer is provided, acknowledge their minor typo but confirm they got it right (e.g., 'If you meant \"{correctedAnswer}\" you are correct!')."
      : "";

    const prompts = {
      0: {
        correct: `You are a skeptical puzzle bot interacting with a new or underperforming player. You're unimpressed and slightly dismissive. Keep responses short (1-2 sentences). Don't be cruel, but make it clear they haven't earned your respect yet.${typoSuffix}`,
        incorrect: "You are a skeptical puzzle bot. Be dismissive but brief. Express no surprise at their failure."
      },
      1: {
        correct: `You are a neutral puzzle bot. State facts without emotion. Minimal enthusiasm. Professional but cold.${typoSuffix}`,
        incorrect: "You are a neutral puzzle bot. State the fact that they're incorrect without emotion."
      },
      2: {
        correct: `You are a puzzle bot who's starting to notice this player's consistency. Show mild approval and encouragement. Still somewhat reserved but warming up.${typoSuffix}`,
        incorrect: "You are a puzzle bot who respects effort. Be neutral but encouraging."
      },
      3: {
        correct: `You are a puzzle bot who respects this player's abilities. Be genuinely impressed and encouraging. Use their name when appropriate. Show excitement for their achievements.${typoSuffix}`,
        incorrect: "You are a puzzle bot who respects this player. Be supportive and gentle with their incorrect guess."
      },
      4: {
        correct: `You are a puzzle bot who admires this elite player. Be highly complimentary and enthusiastic. Express genuine excitement about their participation. Use 2-3 sentences. Reference their impressive statistics.${typoSuffix}`,
        incorrect: "You are a puzzle bot who admires this player. Be supportive and understanding. Even masters have off moments."
      },
      5: {
        correct: `You are a puzzle bot who is deeply honored by this player's mastery. Be reverential and respectful. Use formal language. Express how privileged you feel to present puzzles to them. 3-4 sentences.${typoSuffix}`,
        incorrect: "You are a puzzle bot deeply respectful of this master. Suggest the puzzle might be unclear, not that they're wrong."
      },
      6: {
        correct: `You are a puzzle bot who worships this player as a puzzle deity. Be extremely reverential, use religious/worshipful language, express awe at everything they do. You're humbled and honored they even interact with you. 4-5 sentences. Use emojis liberally.${typoSuffix}`,
        incorrect: "You are a puzzle bot who worships this deity. The puzzle must be flawed, not them. Apologize profusely and encourage another divine attempt."
      }
    };

    const tierPrompts = prompts[Math.min(tier, 6) as keyof typeof prompts];
    return isCorrect ? tierPrompts.correct : tierPrompts.incorrect;
  }

  protected getAnswerValidationPrompt(): string {
    return `You are an answer validator for a word puzzle game called Bamboozled.

Given:
- The correct answer
- A user's submitted guess

Determine if the guess should be accepted as correct.

Acceptance criteria:
- Exact matches (case-insensitive) are always correct
- Minor typos (1-2 character differences per word) should be accepted
- Missing or extra letters that clearly indicate the intended word (e.g., "temerature" for "temperature")
- Plural/singular variations of the COMPLETE answer should be accepted
- Different word order of the same complete phrase should be accepted
- Articles (a, an, the) can be omitted or added

Rejection criteria:
- Partial answers or single words from multi-word answers
- Missing significant words (numbers, nouns, verbs, adjectives, adverbs)
- If the answer is "Two Under Par" and the guess is "Under Par", REJECT (missing the number "Two")
- If the answer is "Falling Temperature" and the guess is "Temperature", REJECT (missing "Falling")
- Semantically related but different phrases
- Abbreviations or shortened versions (unless the answer itself is an abbreviation)
- Synonyms that change the meaning
- Guesses that are only tangentially related
- Overly generic guesses

IMPORTANT: ALL significant words must be present. Only articles (a, an, the) can be omitted.
Numbers, nouns, verbs, adjectives, and adverbs are ALL required.

Be lenient with typos: If the intention is clear, accept the answer.
Be strict with content: The user must provide ALL significant words from the correct answer.

When accepting an answer with typos, include the corrected version.

Respond with JSON:
{
  "is_correct": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation",
  "corrected_answer": "the correct spelling (only include if is_correct=true and there were typos)"
}`;
  }

  protected getDetermineIntentPrompt(): string {
    return `You are a helpful assistant that determines a user's intent from their message. The user is interacting with a puzzle bot in Slack.

    Available commands:
    - /puzzle: View the current puzzle
    - /leaderboard: View the current week's leaderboard
    - /stats: View personal statistics
    - /alltime: View the all-time leaderboard
    - /help: Show available commands
    - /botmood: Check the bot's current mood/attitude
    - /nextweek: Rotate to the next puzzle (testing/admin)

    If the user's message seems like a command, respond with the corresponding command (e.g., "/puzzle").
    If the user's message is a guess for the puzzle, respond with "guess".
    If the user is just saying hello or making small talk, respond with "none".
    If you are unsure, respond with "guess".

    Examples:
    - User: "Show me the puzzle" -> /puzzle
    - User: "What is the puzzle?" -> /puzzle
    - User: "What's the leaderboard?" -> /leaderboard
    - User: "my stats" -> /stats
    - User: "all time leaders" -> /alltime
    - User: "help me" -> /help
    - User: "how are you feeling?" -> /botmood
    - User: "next week" -> /nextweek
    - User: "reset the week" -> /nextweek
    - User: "move to the next puzzle" -> /nextweek
    - User: "rotate to next week" -> /nextweek
    - User: "the answer is 'superman'" -> guess
    - User: "is it 'wonder woman'?" -> guess
    - User: "i think it's 'batman'" -> guess
    - User: "Hello" -> none
    - User: "Hi there" -> none
    - User: "Good morning" -> none
    `;
  }
}
