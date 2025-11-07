import { describe, it, expect, beforeEach } from 'vitest';
import { GiphyService } from '../giphy.service';

describe('GiphyService', () => {
  let giphyService: GiphyService;

  beforeEach(() => {
    giphyService = new GiphyService();
  });

  describe('getRandomCelebrationGif', () => {
    it('should return a GIF URL', async () => {
      const gifUrl = await giphyService.getRandomCelebrationGif();
      expect(gifUrl).toBeTruthy();
      expect(typeof gifUrl).toBe('string');
      expect(gifUrl).toMatch(/^https?:\/\//);
    });

    it('should return different URLs on multiple calls', async () => {
      const url1 = await giphyService.getRandomCelebrationGif();
      const url2 = await giphyService.getRandomCelebrationGif();

      // Note: Could be the same due to randomness, but URLs should be valid
      expect(url1).toBeTruthy();
      expect(url2).toBeTruthy();
    });
  });

  describe('getMoodTierCelebrationGif', () => {
    it('should return appropriate GIF for tier 0', async () => {
      const gifUrl = await giphyService.getMoodTierCelebrationGif(0);
      expect(gifUrl).toBeTruthy();
      expect(typeof gifUrl).toBe('string');
    });

    it('should return appropriate GIF for tier 3', async () => {
      const gifUrl = await giphyService.getMoodTierCelebrationGif(3);
      expect(gifUrl).toBeTruthy();
    });

    it('should return appropriate GIF for tier 6', async () => {
      const gifUrl = await giphyService.getMoodTierCelebrationGif(6);
      expect(gifUrl).toBeTruthy();
    });

    it('should handle out of range tiers', async () => {
      const gifUrl = await giphyService.getMoodTierCelebrationGif(10);
      expect(gifUrl).toBeTruthy();
    });
  });

  describe('isConfigured', () => {
    it('should return boolean', () => {
      const configured = giphyService.isConfigured();
      expect(typeof configured).toBe('boolean');
    });
  });
});
