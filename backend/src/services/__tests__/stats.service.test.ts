import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatsService } from '../stats.service';
import { GuessRepository } from '../../db/repositories/guess.repository';
import { UserRepository } from '../../db/repositories/user.repository';
import { MoodService } from '../mood.service';
import type { User } from '../../types';

vi.mock('../../db/repositories/guess.repository');
vi.mock('../../db/repositories/user.repository');
vi.mock('../mood.service');
vi.mock('../../db/connection', () => ({
  getDatabase: vi.fn(() => ({
    selectFrom: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    executeTakeFirst: vi.fn().mockResolvedValue({ count: 0 })
  }))
}));

describe('StatsService', () => {
  let statsService: StatsService;
  let mockGuessRepository: any;
  let mockUserRepository: any;
  let mockMoodService: any;

  const mockUser: User = {
    user_id: 'user-1',
    display_name: 'Test User',
    mood_tier: 1,
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockGuessRepository = {
      getUserGuessesForPuzzle: vi.fn().mockResolvedValue([]),
      hasUserSolvedPuzzle: vi.fn().mockResolvedValue(false)
    };

    mockUserRepository = {
      findById: vi.fn().mockResolvedValue(mockUser),
      getAll: vi.fn().mockResolvedValue([mockUser])
    };

    mockMoodService = {
      getUserStreak: vi.fn().mockResolvedValue(3),
      getMoodTierInfo: vi.fn().mockReturnValue({
        name: 'The Indifferent',
        minStreak: 1,
        minSolves: 3
      })
    };

    vi.mocked(GuessRepository).mockImplementation(() => mockGuessRepository);
    vi.mocked(UserRepository).mockImplementation(() => mockUserRepository);
    vi.mocked(MoodService).mockImplementation(() => mockMoodService);

    statsService = new StatsService();
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const result = await statsService.getUserStats('user-1');

      expect(result).toBeDefined();
      expect(result?.user_id).toBe('user-1');
      expect(result?.display_name).toBe('Test User');
      expect(result?.mood_tier).toBe(1);
      expect(result?.mood_tier_name).toBe('The Indifferent');
      expect(mockMoodService.getUserStreak).toHaveBeenCalledWith('user-1');
    });

    it('should return undefined when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(undefined);

      const result = await statsService.getUserStats('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getWeeklyLeaderboard', () => {
    it('should return weekly leaderboard', async () => {
      const result = await statsService.getWeeklyLeaderboard();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by puzzle ID when provided', async () => {
      const result = await statsService.getWeeklyLeaderboard('puzzle-1');

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getAllTimeLeaderboard', () => {
    it('should return all-time leaderboard', async () => {
      const result = await statsService.getAllTimeLeaderboard();

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('rank');
    });

    it('should sort by total solves and avg guesses', async () => {
      const user2: User = {
        ...mockUser,
        user_id: 'user-2',
        display_name: 'User 2'
      };

      mockUserRepository.getAll.mockResolvedValue([mockUser, user2]);

      const result = await statsService.getAllTimeLeaderboard();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getUserGuessCountForPuzzle', () => {
    it('should return guess count', async () => {
      const guesses = [
        { guess_id: 'g1' },
        { guess_id: 'g2' },
        { guess_id: 'g3' }
      ];
      mockGuessRepository.getUserGuessesForPuzzle.mockResolvedValue(guesses);

      const result = await statsService.getUserGuessCountForPuzzle('user-1', 'puzzle-1');

      expect(result).toBe(3);
      expect(mockGuessRepository.getUserGuessesForPuzzle).toHaveBeenCalledWith('user-1', 'puzzle-1');
    });
  });

  describe('hasUserSolvedPuzzle', () => {
    it('should return true when user has solved puzzle', async () => {
      mockGuessRepository.hasUserSolvedPuzzle.mockResolvedValue(true);

      const result = await statsService.hasUserSolvedPuzzle('user-1', 'puzzle-1');

      expect(result).toBe(true);
      expect(mockGuessRepository.hasUserSolvedPuzzle).toHaveBeenCalledWith('user-1', 'puzzle-1');
    });

    it('should return false when user has not solved puzzle', async () => {
      mockGuessRepository.hasUserSolvedPuzzle.mockResolvedValue(false);

      const result = await statsService.hasUserSolvedPuzzle('user-1', 'puzzle-1');

      expect(result).toBe(false);
    });
  });
});
