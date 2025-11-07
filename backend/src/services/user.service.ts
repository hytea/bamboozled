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
  async getOrCreateUserBySlackId(slackUserId: string, displayName: string): Promise<User> {
    let user = await this.userRepository.findBySlackUserId(slackUserId);

    if (!user) {
      user = await this.userRepository.create({
        slack_user_id: slackUserId,
        display_name: displayName,
        mood_tier: 0
      });
    }

    return user;
  }

  /**
   * Get or create user by display name (web chat mode)
   * Used when interacting via web chat without authentication
   */
  async getOrCreateUserByDisplayName(displayName: string): Promise<User> {
    let user = await this.userRepository.findByDisplayName(displayName);

    if (!user) {
      user = await this.userRepository.create({
        slack_user_id: null,
        display_name: displayName,
        mood_tier: 0
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
   * Check if display name is available (not taken by another user)
   */
  async isDisplayNameAvailable(displayName: string, excludeUserId?: string): Promise<boolean> {
    const existingUser = await this.userRepository.findByDisplayName(displayName);

    if (!existingUser) {
      return true;
    }

    // If excluding a user ID, check if the existing user is that user
    if (excludeUserId && existingUser.user_id === excludeUserId) {
      return true;
    }

    return false;
  }
}
