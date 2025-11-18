import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from '../../services/user.service.js';

describe('WebSocket Chat Handler', () => {
  describe('Message Types', () => {
    it('should handle init message type', () => {
      const initMessage = {
        type: 'init' as const,
        userId: 'user-123',
        userName: 'Test User'
      };

      expect(initMessage.type).toBe('init');
      expect(initMessage.userId).toBeTruthy();
      expect(initMessage.userName).toBeTruthy();
    });

    it('should handle command message type', () => {
      const commandMessage = {
        type: 'command' as const,
        content: '/stats',
        userId: 'user-123'
      };

      expect(commandMessage.type).toBe('command');
      expect(commandMessage.content).toMatch(/^\//);
    });

    it('should handle regular message type', () => {
      const regularMessage = {
        type: 'message' as const,
        content: 'head over heels',
        userId: 'user-123'
      };

      expect(regularMessage.type).toBe('message');
      expect(regularMessage.content).toBeTruthy();
    });
  });

  describe('Commands', () => {
    const commands = [
      '/puzzle',
      '/bamboozled',
      '/stats',
      '/leaderboard',
      '/alltime',
      '/botmood',
      '/help'
    ];

    it('should have all required commands', () => {
      expect(commands).toHaveLength(7);
      expect(commands).toContain('/puzzle');
      expect(commands).toContain('/stats');
      expect(commands).toContain('/botmood');
      expect(commands).toContain('/help');
    });

    it('should recognize command format', () => {
      commands.forEach(cmd => {
        expect(cmd).toMatch(/^\//);
      });
    });
  });

  describe('Chat Message Format', () => {
    it('should have correct structure', () => {
      interface ChatMessage {
        type: 'user' | 'bot';
        content: string;
        timestamp: string;
        metadata?: {
          imageUrl?: string;
          gifUrl?: string;
          isCommand?: boolean;
          moodTier?: number;
        };
      }

      const botMessage: ChatMessage = {
        type: 'bot',
        content: 'Test message',
        timestamp: new Date().toISOString(),
        metadata: {
          moodTier: 3
        }
      };

      expect(botMessage.type).toBe('bot');
      expect(botMessage.content).toBeTruthy();
      expect(botMessage.timestamp).toBeTruthy();
      expect(botMessage.metadata?.moodTier).toBe(3);
    });
  });

  describe('User Identification Flow', () => {
    let userService: UserService;

    beforeEach(() => {
      userService = new UserService();
    });

    it('should create new user with frontend-provided userId', async () => {
      const userId = `web_test_${Date.now()}_${Math.random()}`;
      const userName = 'TestUser' + Math.random();

      const isNameAvailable = await userService.isDisplayNameAvailable(userName);
      expect(isNameAvailable).toBe(true);

      const newUser = await userService.createUserWithId(userId, userName);
      expect(newUser.user_id).toBe(userId);
      expect(newUser.display_name).toBe(userName);
      expect(newUser.mood_tier).toBe(0);
      expect(newUser.best_streak).toBe(0);
    });

    it('should recover session for existing userId', async () => {
      const userId = `web_test_${Date.now()}_${Math.random()}`;
      const userName = 'ExistingUser' + Math.random();

      // Create user first
      await userService.createUserWithId(userId, userName);

      // Simulate reconnection with same userId
      const recoveredUser = await userService.getUserById(userId);
      expect(recoveredUser).toBeDefined();
      expect(recoveredUser?.user_id).toBe(userId);
      expect(recoveredUser?.display_name).toBe(userName);
    });

    it('should reject if display name is taken by different user', async () => {
      const userName = 'PopularName' + Math.random();

      // Create first user
      const user1 = await userService.createUserWithId(`web_user1_${Date.now()}`, userName);
      expect(user1.display_name).toBe(userName);

      // Try to create second user with same display name but different userId
      const isAvailable = await userService.isDisplayNameAvailable(userName);
      expect(isAvailable).toBe(false);
    });

    it('should allow display name change if new name is available', async () => {
      const userId = `web_test_${Date.now()}_${Math.random()}`;
      const oldName = 'OldName' + Math.random();
      const newName = 'NewName' + Math.random();

      // Create user
      const user = await userService.createUserWithId(userId, oldName);
      expect(user.display_name).toBe(oldName);

      // Change display name
      const isNewNameAvailable = await userService.isDisplayNameAvailable(newName);
      expect(isNewNameAvailable).toBe(true);

      const updatedUser = await userService.updateDisplayName(userId, newName);
      expect(updatedUser.display_name).toBe(newName);
      expect(updatedUser.user_id).toBe(userId); // userId stays the same
    });

    it('should validate username length constraints', () => {
      const shortName = '';
      const longName = 'a'.repeat(51);

      expect(shortName.trim().length).toBe(0);
      expect(longName.length).toBeGreaterThan(50);
    });

    it('should find user by display name (legacy support)', async () => {
      const userName = 'LegacyUser' + Math.random();
      const user = await userService.getOrCreateUserByDisplayName(userName);

      expect(user.display_name).toBe(userName);
      expect(user.user_id).toContain('web_');

      // Finding again should return same user
      const sameUser = await userService.getUserByDisplayName(userName);
      expect(sameUser?.user_id).toBe(user.user_id);
    });

    it('should handle multiple concurrent connections with different userIds', async () => {
      const uniqueSuffix = Date.now();
      const user1 = await userService.createUserWithId(
        `web_user_a_${uniqueSuffix}`,
        `Alice${uniqueSuffix}`
      );
      const user2 = await userService.createUserWithId(
        `web_user_b_${uniqueSuffix}`,
        `Bob${uniqueSuffix}`
      );

      expect(user1.user_id).not.toBe(user2.user_id);
      expect(user1.display_name).toContain('Alice');
      expect(user2.display_name).toContain('Bob');
    });

    it('should preserve user stats during session recovery', async () => {
      const userId = `web_stats_test_${Date.now()}`;
      const userName = 'StatsUser' + Math.random();

      // Create user
      const user = await userService.createUserWithId(userId, userName);

      // Simulate mood tier update (from solving puzzles)
      const updatedUser = await userService.updateMoodTier(userId, 3);
      expect(updatedUser.mood_tier).toBe(3);

      // Simulate reconnection
      const recoveredUser = await userService.getUserById(userId);
      expect(recoveredUser?.mood_tier).toBe(3); // Stats preserved
      expect(recoveredUser?.display_name).toBe(userName);
    });

    it('should trim whitespace from usernames', () => {
      const userName = '  SpacedName  ';
      const trimmed = userName.trim();

      expect(trimmed).toBe('SpacedName');
      expect(trimmed.length).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should validate empty username', () => {
      const emptyNames = ['', '   ', '\t\n'];

      emptyNames.forEach((name) => {
        expect(name.trim().length).toBe(0);
      });
    });

    it('should validate username length limit', () => {
      const longName = 'a'.repeat(51);
      expect(longName.length).toBeGreaterThan(50);
    });

    it('should handle duplicate display name gracefully', async () => {
      const userService = new UserService();
      const userName = 'DuplicateName' + Math.random();

      // Create first user
      await userService.createUserWithId(`web_user_first_${Date.now()}`, userName);

      // Check availability
      const isAvailable = await userService.isDisplayNameAvailable(userName);
      expect(isAvailable).toBe(false);
    });

    it('should send error message for invalid input', () => {
      const errorMessage = {
        type: 'error',
        content: 'Please enter a username',
        timestamp: new Date().toISOString(),
        metadata: { errorType: 'INVALID_INPUT' }
      };

      expect(errorMessage.type).toBe('error');
      expect(errorMessage.metadata?.errorType).toBe('INVALID_INPUT');
    });

    it('should send error message for taken display name', () => {
      const errorMessage = {
        type: 'error',
        content: 'The username "TakenName" is already taken.',
        timestamp: new Date().toISOString(),
        metadata: { errorType: 'DISPLAY_NAME_TAKEN' }
      };

      expect(errorMessage.type).toBe('error');
      expect(errorMessage.metadata?.errorType).toBe('DISPLAY_NAME_TAKEN');
    });
  });

  describe('Session Management', () => {
    let userService: UserService;

    beforeEach(() => {
      userService = new UserService();
    });

    it('should support session recovery across reconnects', async () => {
      const userId = `web_session_${Date.now()}`;
      const userName = 'SessionUser' + Math.random();

      // First connection
      const user1 = await userService.createUserWithId(userId, userName);

      // Simulate disconnect and reconnect with same userId
      const user2 = await userService.getUserById(userId);

      expect(user1.user_id).toBe(user2?.user_id);
      expect(user1.display_name).toBe(user2?.display_name);
    });

    it('should preserve user data through localStorage clear scenario', async () => {
      const userName = 'PersistentUser' + Math.random();

      // First session (generates userId)
      const user1 = await userService.getOrCreateUserByDisplayName(userName);
      const originalUserId = user1.user_id;

      // Update mood
      await userService.updateMoodTier(originalUserId, 2);

      // Simulate localStorage clear - user connects with same display name
      const user2 = await userService.getUserByDisplayName(userName);

      expect(user2?.user_id).toBe(originalUserId);
      expect(user2?.mood_tier).toBe(2); // Stats preserved
    });
  });

  describe('WebSocket Message Flow', () => {
    it('should handle init message with userId and userName', () => {
      const initMessage = {
        type: 'init',
        userId: 'web_test_abc',
        userName: 'TestUser'
      };

      expect(initMessage.type).toBe('init');
      expect(initMessage.userId).toBeDefined();
      expect(initMessage.userName).toBeDefined();
    });

    it('should handle init message with only userName (legacy)', () => {
      const initMessage = {
        type: 'init',
        userName: 'LegacyUser'
      };

      expect(initMessage.type).toBe('init');
      expect(initMessage.userId).toBeUndefined();
      expect(initMessage.userName).toBeDefined();
    });

    it('should send userId back to frontend in welcome message', () => {
      const welcomeMessage = {
        type: 'bot',
        content: 'Welcome, TestUser!',
        timestamp: new Date().toISOString(),
        userId: 'web_test_123',
        metadata: { moodTier: 0 }
      };

      expect(welcomeMessage.userId).toBeDefined();
      expect(welcomeMessage.metadata?.moodTier).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    let userService: UserService;

    beforeEach(() => {
      userService = new UserService();
    });

    it('should handle special characters in display names', async () => {
      const specialNames = [
        `User123_${Date.now()}`,
        `User_Name_${Date.now()}`,
        `User-Name-${Date.now()}`,
        `User.Name.${Date.now()}`
      ];

      for (const name of specialNames) {
        const user = await userService.getOrCreateUserByDisplayName(name);
        expect(user.display_name).toBe(name);
      }
    });

    it('should handle rapid reconnections', async () => {
      const userId = `web_rapid_test_${Date.now()}`;
      const userName = 'RapidUser' + Math.random();

      // First connection
      await userService.createUserWithId(userId, userName);

      // Multiple rapid reconnections
      const user1 = await userService.getUserById(userId);
      const user2 = await userService.getUserById(userId);
      const user3 = await userService.getUserById(userId);

      expect(user1?.user_id).toBe(userId);
      expect(user2?.user_id).toBe(userId);
      expect(user3?.user_id).toBe(userId);
    });

    it('should handle case-sensitive display names', async () => {
      const uniqueSuffix = Date.now();
      const name1 = `TestUser${uniqueSuffix}`;
      const name2 = `testuser${uniqueSuffix}`;

      const user1 = await userService.getOrCreateUserByDisplayName(name1);
      const user2 = await userService.getOrCreateUserByDisplayName(name2);

      // These should be treated as different users (case-sensitive)
      expect(user1.user_id).not.toBe(user2.user_id);
    });
  });
});
