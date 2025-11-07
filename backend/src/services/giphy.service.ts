import { getConfig } from '../config/env.js';

interface GiphyResponse {
  data: {
    id: string;
    url: string;
    images: {
      original: {
        url: string;
      };
      downsized: {
        url: string;
      };
    };
  };
}

export class GiphyService {
  private apiKey: string | undefined;
  private baseUrl = 'https://api.giphy.com/v1/gifs';

  // Fallback celebration GIFs if Giphy API is not configured
  private fallbackGifs = [
    'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif', // Celebrate
    'https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/giphy.gif', // Success
    'https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif', // Awesome
    'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif', // Party
    'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif', // Yes!
    'https://media.giphy.com/media/xTiN0CNHgoRf1Ha7CM/giphy.gif', // Winning
    'https://media.giphy.com/media/3ohA2ZD9EkeK2AyfdK/giphy.gif', // Celebration
    'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif', // High Five
  ];

  constructor() {
    const config = getConfig();
    this.apiKey = config.GIPHY_API_KEY;
  }

  /**
   * Get a random celebration GIF
   */
  async getRandomCelebrationGif(): Promise<string> {
    // If no API key, use fallback GIFs
    if (!this.apiKey) {
      return this.getRandomFallbackGif();
    }

    try {
      const searchTerms = [
        'celebration',
        'success',
        'winner',
        'congratulations',
        'awesome',
        'excellent',
        'party',
        'yay'
      ];

      const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

      const response = await fetch(
        `${this.baseUrl}/random?api_key=${this.apiKey}&tag=${randomTerm}&rating=g`
      );

      if (!response.ok) {
        throw new Error(`Giphy API error: ${response.statusText}`);
      }

      const data = (await response.json()) as GiphyResponse;

      // Return downsized version for faster loading
      return data.data.images.downsized.url;
    } catch (error) {
      console.error('Error fetching Giphy GIF:', error);
      return this.getRandomFallbackGif();
    }
  }

  /**
   * Get a mood-tier appropriate celebration GIF
   */
  async getMoodTierCelebrationGif(moodTier: number): Promise<string> {
    if (!this.apiKey) {
      return this.getRandomFallbackGif();
    }

    try {
      // Different search terms based on mood tier intensity
      const tierSearchTerms: Record<number, string[]> = {
        0: ['nice', 'ok', 'good job'],
        1: ['good', 'correct', 'nice work'],
        2: ['great', 'well done', 'nice'],
        3: ['excellent', 'impressive', 'amazing'],
        4: ['spectacular', 'incredible', 'outstanding'],
        5: ['legendary', 'epic', 'magnificent'],
        6: ['godlike', 'divine', 'supreme', 'ultimate']
      };

      const terms = tierSearchTerms[Math.min(moodTier, 6)] || tierSearchTerms[2];
      const randomTerm = terms[Math.floor(Math.random() * terms.length)];

      const response = await fetch(
        `${this.baseUrl}/random?api_key=${this.apiKey}&tag=${randomTerm}&rating=g`
      );

      if (!response.ok) {
        throw new Error(`Giphy API error: ${response.statusText}`);
      }

      const data = (await response.json()) as GiphyResponse;
      return data.data.images.downsized.url;
    } catch (error) {
      console.error('Error fetching mood-tier GIF:', error);
      return this.getRandomFallbackGif();
    }
  }

  /**
   * Get a random fallback GIF when Giphy is not available
   */
  private getRandomFallbackGif(): string {
    return this.fallbackGifs[Math.floor(Math.random() * this.fallbackGifs.length)];
  }

  /**
   * Check if Giphy API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
