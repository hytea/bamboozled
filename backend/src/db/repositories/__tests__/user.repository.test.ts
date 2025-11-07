import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from '../user.repository';
import type { User } from '../../schema';

vi.mock('../../connection', () => ({
  getDatabase: vi.fn(() => ({
    insertInto: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returningAll: vi.fn().mockReturnThis(),
    executeTakeFirstOrThrow: vi.fn(),
    selectFrom: vi.fn().mockReturnThis(),
    selectAll: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    executeTakeFirst: vi.fn(),
    updateTable: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn()
  })),
  generateId: vi.fn(() => 'user-1')
}));

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockDb: any;

  const mockUser: User = {
    user_id: 'user-1',
    display_name: 'Test User',
    slack_user_id: null,
    mood_tier: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getDatabase } = await import('../../connection');
    mockDb = getDatabase();
    userRepository = new UserRepository();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      mockDb.executeTakeFirstOrThrow.mockResolvedValue(mockUser);

      const result = await userRepository.create({
        display_name: 'Test User',
        slack_user_id: null
      });

      expect(result).toEqual(mockUser);
      expect(mockDb.insertInto).toHaveBeenCalledWith('users');
      expect(mockDb.values).toHaveBeenCalled();
      expect(mockDb.returningAll).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      mockDb.executeTakeFirst.mockResolvedValue(mockUser);

      const result = await userRepository.findById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockDb.selectFrom).toHaveBeenCalledWith('users');
      expect(mockDb.where).toHaveBeenCalledWith('user_id', '=', 'user-1');
    });

    it('should return undefined when user not found', async () => {
      mockDb.executeTakeFirst.mockResolvedValue(undefined);

      const result = await userRepository.findById('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('findBySlackUserId', () => {
    it('should find user by Slack user ID', async () => {
      mockDb.executeTakeFirst.mockResolvedValue(mockUser);

      const result = await userRepository.findBySlackUserId('slack-123');

      expect(result).toEqual(mockUser);
      expect(mockDb.where).toHaveBeenCalledWith('slack_user_id', '=', 'slack-123');
    });
  });

  describe('findByDisplayName', () => {
    it('should find user by display name', async () => {
      mockDb.executeTakeFirst.mockResolvedValue(mockUser);

      const result = await userRepository.findByDisplayName('Test User');

      expect(result).toEqual(mockUser);
      expect(mockDb.where).toHaveBeenCalledWith('display_name', '=', 'Test User');
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const updatedUser = { ...mockUser, display_name: 'Updated Name' };
      mockDb.executeTakeFirstOrThrow.mockResolvedValue(updatedUser);

      const result = await userRepository.update('user-1', { display_name: 'Updated Name' });

      expect(result).toEqual(updatedUser);
      expect(mockDb.updateTable).toHaveBeenCalledWith('users');
      expect(mockDb.set).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalledWith('user_id', '=', 'user-1');
    });
  });

  describe('updateMoodTier', () => {
    it('should update user mood tier', async () => {
      const updatedUser = { ...mockUser, mood_tier: 2 };
      mockDb.executeTakeFirstOrThrow.mockResolvedValue(updatedUser);

      const result = await userRepository.updateMoodTier('user-1', 2);

      expect(result.mood_tier).toBe(2);
      expect(mockDb.updateTable).toHaveBeenCalledWith('users');
    });
  });

  describe('getAll', () => {
    it('should return all users', async () => {
      const users = [mockUser];
      mockDb.execute.mockResolvedValue(users);

      const result = await userRepository.getAll();

      expect(result).toEqual(users);
      expect(mockDb.selectFrom).toHaveBeenCalledWith('users');
    });
  });
});
