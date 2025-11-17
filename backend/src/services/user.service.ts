import { UserRepository } from '../db/repositories/user.repository.js';
import type { User } from '../types/index.js';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get or create user by Slack user ID
   * Used when interacting via Slack
   */
  async getOrCreateUser(userId: string, displayName: string): Promise<User> {
    let user = await this.userRepository.findById(userId);

    if (!user) {
      user = await this.userRepository.create({
        user_id: userId,
        display_name: displayName,
        mood_tier: 0,
        best_streak: 0
      });
    }

    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | undefined> {
    return this.userRepository.findById(userId);
  }

  /**
   * Update user display name
   */
  async updateDisplayName(userId: string, displayName: string): Promise<User> {
    return this.userRepository.update(userId, { display_name: displayName });
  }

  /**
   * Update user mood tier
   */
  async updateMoodTier(userId: string, newTier: number): Promise<User> {
    return this.userRepository.updateMoodTier(userId, newTier);
  }

  /**
   * Get all users
   */
  async getAllUsers(): Promise<User[]> {
    return this.userRepository.getAll();
  }

  /**
   * Get or create user by Slack user ID
   */
  async getOrCreateUserBySlackId(slackUserId: string, displayName: string): Promise<User> {
    let user = await this.userRepository.findBySlackUserId(slackUserId);

    if (!user) {
      const userId = `slack_${slackUserId}`;
      user = await this.userRepository.create({
        user_id: userId,
        slack_user_id: slackUserId,
        display_name: displayName,
        mood_tier: 0,
        best_streak: 0
      });
    }

    return user;
  }

  /**
   * Get or create user by display name
   */
  async getOrCreateUserByDisplayName(displayName: string): Promise<User> {
    let user = await this.userRepository.findByDisplayName(displayName);

    if (!user) {
      const userId = `web_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      user = await this.userRepository.create({
        user_id: userId,
        slack_user_id: null,
        display_name: displayName,
        mood_tier: 0,
        best_streak: 0
      });
    }

    return user;
  }

  /**
   * Check if display name is available
   */
  async isDisplayNameAvailable(displayName: string): Promise<boolean> {
    const user = await this.userRepository.findByDisplayName(displayName);
    return !user;
  }
}

