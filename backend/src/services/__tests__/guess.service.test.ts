import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GuessService } from '../guess.service';
import { GuessRepository } from '../../db/repositories/guess.repository';
import { PuzzleService } from '../puzzle.service';
import { UserService } from '../user.service';
import { MoodService } from '../mood.service';
import { StatsService } from '../stats.service';
import { GiphyService } from '../giphy.service';
import type { AIProvider } from '../../types';
import type { Puzzle, User } from '../../types';
import type { Guess } from '../../db/schema';

vi.mock('../../db/repositories/guess.repository');
vi.mock('../puzzle.service');
vi.mock('../user.service');
vi.mock('../mood.service');
vi.mock('../stats.service');
vi.mock('../giphy.service');

describe('GuessService', () => {
  let guessService: GuessService;
  let mockAIProvider: AIProvider;
  let mockGuessRepository: any;
  let mockPuzzleService: any;
  let mockUserService: any;
  let mockMoodService: any;
  let mockStatsService: any;
  let mockGiphyService: any;

  const mockPuzzle: Puzzle = {
    puzzle_id: 'puzzle-1',
    puzzle_key: 'test-puzzle',
    answer: 'test answer',
    image_path: 'test.png',
    week_start_date: new Date().toISOString(),
    week_end_date: new Date().toISOString(),
    is_active: 1,
    created_at: new Date().toISOString()
  };

  const mockUser: User = {
    user_id: 'user-1',
    display_name: 'Test User',
    mood_tier: 0,
    created_at: new Date().toISOString()
  };

  const mockGuess: Guess = {
    guess_id: 'guess-1',
    user_id: 'user-1',
    puzzle_id: 'puzzle-1',
    guess_text: 'test answer',
    is_correct: 1,
    guess_number: 1,
    mood_tier_at_time: 0,
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAIProvider = {
      validateAnswer: vi.fn().mockResolvedValue({
        is_correct: true,
        confidence: 1.0,
        reasoning: 'Correct answer'
      }),
      generateResponse: vi.fn().mockResolvedValue({
        message: 'Great job!'
      })
    };

    mockGuessRepository = {
      create: vi.fn().mockResolvedValue(mockGuess),
      getUserGuessesForPuzzle: vi.fn().mockResolvedValue([])
    };

    mockPuzzleService = {
      getActivePuzzle: vi.fn().mockResolvedValue(mockPuzzle)
    };

    mockUserService = {
      getUserById: vi.fn().mockResolvedValue(mockUser)
    };

    mockMoodService = {
      updateMoodTierAfterSolve: vi.fn().mockResolvedValue({
        tierChanged: false,
        oldTier: 0,
        newTier: 0
      })
    };

    mockStatsService = {
      hasUserSolvedPuzzle: vi.fn().mockResolvedValue(false),
      getUserStats: vi.fn().mockResolvedValue({
        current_streak: 0,
        total_solves: 0,
        first_place_finishes: 0
      })
    };

    mockGiphyService = {
      getMoodTierCelebrationGif: vi.fn().mockResolvedValue('https://giphy.com/test.gif')
    };

    vi.mocked(GuessRepository).mockImplementation(() => mockGuessRepository);
    vi.mocked(PuzzleService).mockImplementation(() => mockPuzzleService);
    vi.mocked(UserService).mockImplementation(() => mockUserService);
    vi.mocked(MoodService).mockImplementation(() => mockMoodService);
    vi.mocked(StatsService).mockImplementation(() => mockStatsService);
    vi.mocked(GiphyService).mockImplementation(() => mockGiphyService);

    guessService = new GuessService(mockAIProvider);
  });

  describe('submitGuess', () => {
    it('should submit correct guess and return success', async () => {
      const result = await guessService.submitGuess('user-1', 'test answer');

      expect(result.isCorrect).toBe(true);
      expect(result.message).toBe('Great job!');
      expect(result.guess).toEqual(mockGuess);
      expect(mockAIProvider.validateAnswer).toHaveBeenCalledWith({
        correctAnswer: 'test answer',
        userGuess: 'test answer'
      });
      expect(mockGuessRepository.create).toHaveBeenCalled();
    });

    it('should handle incorrect guess', async () => {
      mockAIProvider.validateAnswer = vi.fn().mockResolvedValue({
        is_correct: false,
        confidence: 0.3,
        reasoning: 'Incorrect'
      });

      const result = await guessService.submitGuess('user-1', 'wrong answer');

      expect(result.isCorrect).toBe(false);
      expect(mockGuessRepository.create).toHaveBeenCalled();
    });

    it('should prevent duplicate solves', async () => {
      mockStatsService.hasUserSolvedPuzzle.mockResolvedValue(true);

      const result = await guessService.submitGuess('user-1', 'test answer');

      expect(result.isCorrect).toBe(false);
      expect(result.message).toContain('already solved');
      expect(mockGuessRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when no active puzzle', async () => {
      mockPuzzleService.getActivePuzzle.mockResolvedValue(undefined);

      await expect(guessService.submitGuess('user-1', 'test')).rejects.toThrow('No active puzzle');
    });

    it('should throw error when user not found', async () => {
      mockUserService.getUserById.mockResolvedValue(undefined);

      await expect(guessService.submitGuess('user-1', 'test')).rejects.toThrow('User not found');
    });

    it('should handle mood tier changes', async () => {
      mockMoodService.updateMoodTierAfterSolve.mockResolvedValue({
        tierChanged: true,
        oldTier: 0,
        newTier: 1
      });

      const result = await guessService.submitGuess('user-1', 'test answer');

      expect(result.tierChanged).toBe(true);
      expect(result.oldTier).toBe(0);
      expect(result.newTier).toBe(1);
    });

    it('should fetch celebration GIF on correct answer', async () => {
      const result = await guessService.submitGuess('user-1', 'test answer');

      expect(result.gifUrl).toBe('https://giphy.com/test.gif');
      expect(mockGiphyService.getMoodTierCelebrationGif).toHaveBeenCalledWith(0);
    });

    it('should increment guess number for subsequent guesses', async () => {
      mockGuessRepository.getUserGuessesForPuzzle.mockResolvedValue([mockGuess]);

      await guessService.submitGuess('user-1', 'test answer');

      expect(mockGuessRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ guess_number: 2 })
      );
    });
  });

  describe('getUserGuessesForPuzzle', () => {
    it('should return user guesses for puzzle', async () => {
      const guesses = [mockGuess];
      mockGuessRepository.getUserGuessesForPuzzle.mockResolvedValue(guesses);

      const result = await guessService.getUserGuessesForPuzzle('user-1', 'puzzle-1');

      expect(result).toEqual(guesses);
      expect(mockGuessRepository.getUserGuessesForPuzzle).toHaveBeenCalledWith('user-1', 'puzzle-1');
    });
  });

  describe('getUserGuessesForActivePuzzle', () => {
    it('should return user guesses for active puzzle', async () => {
      const guesses = [mockGuess];
      mockGuessRepository.getUserGuessesForPuzzle.mockResolvedValue(guesses);

      const result = await guessService.getUserGuessesForActivePuzzle('user-1');

      expect(result).toEqual(guesses);
    });

    it('should return empty array when no active puzzle', async () => {
      mockPuzzleService.getActivePuzzle.mockResolvedValue(undefined);

      const result = await guessService.getUserGuessesForActivePuzzle('user-1');

      expect(result).toEqual([]);
    });
  });
});
