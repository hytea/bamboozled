import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MoodService } from '../mood.service';

describe('MoodService', () => {
  let moodService: MoodService;

  beforeEach(() => {
    moodService = new MoodService();
  });

  describe('calculateMoodTier', () => {
    it('should return tier 0 for new users', () => {
      const tier = moodService.calculateMoodTier(0, 0);
      expect(tier).toBe(0);
    });

    it('should calculate tier based on streak', () => {
      // Tier = min(floor(streak/2), floor(solves/10))
      const tier = moodService.calculateMoodTier(6, 100); // 6/2 = 3, 100/10 = 10, min = 3
      expect(tier).toBe(3);
    });

    it('should calculate tier based on solves when lower', () => {
      const tier = moodService.calculateMoodTier(20, 15); // 20/2 = 10, 15/10 = 1, min = 1
      expect(tier).toBe(1);
    });

    it('should cap tier at 6', () => {
      const tier = moodService.calculateMoodTier(100, 1000); // Would be 50 and 100, capped at 6
      expect(tier).toBe(6);
    });

    it('should handle edge cases', () => {
      expect(moodService.calculateMoodTier(1, 1)).toBe(0);
      expect(moodService.calculateMoodTier(2, 10)).toBe(1);
      expect(moodService.calculateMoodTier(10, 50)).toBe(5);
    });
  });

  describe('getMoodTierInfo', () => {
    it('should return correct info for tier 0', () => {
      const info = moodService.getMoodTierInfo(0);
      expect(info.tier).toBe(0);
      expect(info.name).toBe('The Skeptic');
      expect(info.minStreak).toBe(0);
      expect(info.minSolves).toBe(0);
    });

    it('should return correct info for tier 3', () => {
      const info = moodService.getMoodTierInfo(3);
      expect(info.tier).toBe(3);
      expect(info.name).toBe('The Respector');
      expect(info.minStreak).toBe(5);
      expect(info.minSolves).toBe(11);
    });

    it('should return correct info for tier 6', () => {
      const info = moodService.getMoodTierInfo(6);
      expect(info.tier).toBe(6);
      expect(info.name).toBe('The Worshipper');
      expect(info.minStreak).toBe(20);
      expect(info.minSolves).toBe(51);
    });

    it('should handle out of range tiers', () => {
      const infoNegative = moodService.getMoodTierInfo(-1);
      expect(infoNegative.tier).toBe(0);

      const infoHigh = moodService.getMoodTierInfo(10);
      expect(infoHigh.tier).toBe(6);
    });
  });
});
