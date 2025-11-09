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
}

