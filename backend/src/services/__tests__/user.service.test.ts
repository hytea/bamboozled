import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserService } from '../user.service';
import { UserRepository } from '../../db/repositories/user.repository';
import type { User } from '../../types';

vi.mock('../../db/repositories/user.repository');

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: any;

  const mockUser: User = {
    user_id: 'user-1',
    display_name: 'Test User',
    mood_tier: 0,
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserRepository = {
      findBySlackUserId: vi.fn(),
      findByDisplayName: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMoodTier: vi.fn(),
      getAll: vi.fn()
    };

    vi.mocked(UserRepository).mockImplementation(() => mockUserRepository);
    userService = new UserService();
  });

  describe('getOrCreateUserBySlackId', () => {
    it('should return existing user', async () => {
      mockUserRepository.findBySlackUserId.mockResolvedValue(mockUser);

      const result = await userService.getOrCreateUserBySlackId('slack-123', 'Test User');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findBySlackUserId).toHaveBeenCalledWith('slack-123');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should create new user if not exists', async () => {
      mockUserRepository.findBySlackUserId.mockResolvedValue(undefined);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await userService.getOrCreateUserBySlackId('slack-123', 'Test User');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        slack_user_id: 'slack-123',
        display_name: 'Test User',
        mood_tier: 0
      });
    });
  });

  describe('getOrCreateUserByDisplayName', () => {
    it('should return existing user', async () => {
      mockUserRepository.findByDisplayName.mockResolvedValue(mockUser);

      const result = await userService.getOrCreateUserByDisplayName('Test User');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findByDisplayName).toHaveBeenCalledWith('Test User');
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should create new user if not exists', async () => {
      mockUserRepository.findByDisplayName.mockResolvedValue(undefined);
      mockUserRepository.create.mockResolvedValue(mockUser);

      const result = await userService.getOrCreateUserByDisplayName('Test User');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        slack_user_id: null,
        display_name: 'Test User',
        mood_tier: 0
      });
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1');
    });

    it('should return undefined when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(undefined);

      const result = await userService.getUserById('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('updateDisplayName', () => {
    it('should update user display name', async () => {
      const updatedUser = { ...mockUser, display_name: 'New Name' };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateDisplayName('user-1', 'New Name');

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { display_name: 'New Name' });
    });
  });

  describe('updateMoodTier', () => {
    it('should update user mood tier', async () => {
      const updatedUser = { ...mockUser, mood_tier: 2 };
      mockUserRepository.updateMoodTier.mockResolvedValue(updatedUser);

      const result = await userService.updateMoodTier('user-1', 2);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.updateMoodTier).toHaveBeenCalledWith('user-1', 2);
    });
  });

  describe('getAllUsers', () => {
    it('should return all users', async () => {
      const users = [mockUser];
      mockUserRepository.getAll.mockResolvedValue(users);

      const result = await userService.getAllUsers();

      expect(result).toEqual(users);
      expect(mockUserRepository.getAll).toHaveBeenCalled();
    });
  });

  describe('isDisplayNameAvailable', () => {
    it('should return true when display name is available', async () => {
      mockUserRepository.findByDisplayName.mockResolvedValue(undefined);

      const result = await userService.isDisplayNameAvailable('Available Name');

      expect(result).toBe(true);
    });

    it('should return false when display name is taken', async () => {
      mockUserRepository.findByDisplayName.mockResolvedValue(mockUser);

      const result = await userService.isDisplayNameAvailable('Test User');

      expect(result).toBe(false);
    });

    it('should return true when display name belongs to excluded user', async () => {
      mockUserRepository.findByDisplayName.mockResolvedValue(mockUser);

      const result = await userService.isDisplayNameAvailable('Test User', 'user-1');

      expect(result).toBe(true);
    });

    it('should return false when display name belongs to different user', async () => {
      mockUserRepository.findByDisplayName.mockResolvedValue(mockUser);

      const result = await userService.isDisplayNameAvailable('Test User', 'user-2');

      expect(result).toBe(false);
    });
  });
});
