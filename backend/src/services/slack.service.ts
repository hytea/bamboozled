import { App } from '@slack/bolt';
import { getConfig } from '../config/env.js';
import { PuzzleService } from './puzzle.service.js';
import { GuessService } from './guess.service.js';
import { StatsService } from './stats.service.js';
import { MoodService } from './mood.service.js';
import { UserService } from './user.service.js';
import { AchievementService } from './achievement.service.js';
import { HintService } from './hint.service.js';
import type { AIProvider, User } from '../types/index.js';
import type { FastifyInstance } from 'fastify';
import * as fs from 'fs';

export class SlackService {
  private app: App;
  private puzzleService: PuzzleService;
  private guessService: GuessService;
  private statsService: StatsService;
  private moodService: MoodService;
  private userService: UserService;
  private achievementService: AchievementService;
  private hintService: HintService;
  private aiProvider: AIProvider;
  private logger: FastifyInstance['log'];

  constructor(aiProvider: AIProvider, logger: FastifyInstance['log']) {
    const config = getConfig();

    if (!config.SLACK_BOT_TOKEN || !config.SLACK_SIGNING_SECRET) {
      throw new Error('Slack bot token and signing secret are required');
    }

    this.app = new App({
      token: config.SLACK_BOT_TOKEN,
      signingSecret: config.SLACK_SIGNING_SECRET,
      appToken: config.SLACK_APP_TOKEN,
      socketMode: !!config.SLACK_APP_TOKEN, // Use socket mode if app token provided
    });

    this.puzzleService = new PuzzleService();
    this.guessService = new GuessService(aiProvider);
    this.statsService = new StatsService();
    this.moodService = new MoodService();
    this.userService = new UserService();
    this.achievementService = new AchievementService();
    this.hintService = new HintService(aiProvider);
    this.aiProvider = aiProvider;
    this.logger = logger;

    this.registerCommands();
    this.registerEvents();
  }

  /**
   * Register slash commands
   */
  private registerCommands(): void {
    // /puzzle or /bamboozled - View current puzzle
    this.app.command(/\/(puzzle|bamboozled)/, async ({ command, ack }) => {
      await ack();
      await this.handlePuzzleCommand(command.channel_id, undefined, command.user_id);
    });

    // /leaderboard - View current week's leaderboard
    this.app.command('/leaderboard', async ({ command, ack }) => {
      await ack();
      await this.handleLeaderboardCommand(command.channel_id, undefined);
    });

    // /stats - View personal statistics
    this.app.command('/stats', async ({ command, ack }) => {
      await ack();
      await this.handleStatsCommand(command.channel_id, undefined, command.user_id);
    });

    // /alltime - View all-time leaderboard
    this.app.command('/alltime', async ({ command, ack }) => {
      await ack();
      await this.handleAllTimeCommand(command.channel_id, undefined);
    });

    // /help - Show available commands
    this.app.command('/help', async ({ command, ack }) => {
      await ack();
      await this.handleHelpCommand(command.channel_id, undefined);
    });

    // /botmood - Check bot's current mood/attitude
    this.app.command('/botmood', async ({ command, ack }) => {
      await ack();
      await this.handleBotMoodCommand(command.channel_id, undefined, command.user_id);
    });

    // /nextweek - Rotate to next puzzle (testing only)
    this.app.command('/nextweek', async ({ command, ack }) => {
      await ack();
      await this.handleNextWeekCommand(command.channel_id, undefined);
    });

    // /badges or /achievements - View earned badges
    this.app.command(/\/(badges|achievements)/, async ({ command, ack }) => {
      await ack();
      await this.handleBadgesCommand(command.channel_id, undefined, command.user_id);
    });

    // /allbadges - View all available badges
    this.app.command('/allbadges', async ({ command, ack }) => {
      await ack();
      await this.handleAllBadgesCommand(command.channel_id, undefined);
    });

    // /hint - Get a hint for the current puzzle
    this.app.command('/hint', async ({ command, ack }) => {
      await ack();
      await this.handleHintCommand(command.channel_id, undefined, command.user_id);
    });
  }

  /**
   * Register event listeners
   */
      private registerEvents(): void {
        // Handle direct messages to bot
        this.app.message(async ({ message }) => {
          // Only handle direct messages (not channel mentions)
          if (message.channel_type === 'im' && 'text' in message && 'user' in message && message.user && message.text && 'ts' in message) {
            await this.handleDirectMessage(message.channel, message.user, message.text, message.ts);
          }
        });
      }
    
      /**
       * Handle /puzzle command
       */
      private async handlePuzzleCommand(channelId: string, threadTs: string | undefined, userId: string): Promise<void> {
        try {
          const activePuzzle = await this.puzzleService.getActivePuzzle();
    
          if (!activePuzzle) {
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: 'No active puzzle available right now. Check back soon!'
            });
            return;
          }
    
          // Get or create user
          await this.ensureUser(userId);

          // Check if user has already solved
          const alreadySolved = await this.statsService.hasUserSolvedPuzzle(userId, activePuzzle.puzzle_id);
    
          const imagePath = this.puzzleService.getPuzzleImagePath(activePuzzle);
          const imageExists = fs.existsSync(imagePath);
    
          const blocks: any[] = [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🧩 Current Puzzle',
                emoji: true
              }
            }
          ];
    
          if (imageExists) {
            // Upload image to Slack
            try {
              const imageBuffer = fs.readFileSync(imagePath);
              const result = await this.app.client.files.uploadV2({
                channel_id: channelId,
                ...(threadTs && { thread_ts: threadTs }),
                file: imageBuffer,
                filename: activePuzzle.image_path,
                title: 'Current Puzzle'
              }) as any;

              if (result.file?.permalink) {
                blocks.push({
                  type: 'image',
                  image_url: result.file.permalink,
                  alt_text: 'Puzzle image'
                });
              }
            } catch (error) {
              this.logger.error(`Failed to upload puzzle image: ${error}`);
            }
          }
    
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: alreadySolved
                ? '✅ *You\'ve already solved this puzzle!*\nWait for the next one to continue your streak.'
                : '💡 *Send me your answer as a direct message!*'
            }
          });
    
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            blocks
          });
        } catch (error) {
          this.logger.error(`Error handling puzzle command: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: 'Sorry, I encountered an error fetching the puzzle. Please try again.'
          });
        }
      }

      /**
       * Handle /leaderboard command
       */
      private async handleLeaderboardCommand(channelId: string, threadTs: string | undefined): Promise<void> {
        try {
          const activePuzzle = await this.puzzleService.getActivePuzzle();
    
          if (!activePuzzle) {
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: 'No active puzzle available right now.'
            });
            return;
          }

          const leaderboard = await this.statsService.getWeeklyLeaderboard(activePuzzle.puzzle_id);

          if (leaderboard.length === 0) {
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: 'No one has solved this puzzle yet! Be the first! 🎯'
            });
            return;
          }
    
          const blocks: any[] = [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🏆 Weekly Leaderboard',
                emoji: true
              }
            }
          ];
    
          const leaderboardText = leaderboard
            .slice(0, 10) // Top 10
            .map(entry => {
              const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}.`;
              return `${medal} *${entry.display_name}* - ${entry.total_guesses} guess${entry.total_guesses === 1 ? '' : 'es'}`;
            })
            .join('\n');
    
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: leaderboardText
            }
          });
    
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            blocks
          });
        } catch (error) {
          this.logger.error(`Error handling leaderboard command: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: 'Sorry, I encountered an error fetching the leaderboard.'
          });
        }
      }

      /**
       * Handle /stats command
       */
      private async handleStatsCommand(channelId: string, threadTs: string | undefined, userId: string): Promise<void> {
        try {
          await this.ensureUser(userId);
          const stats = await this.statsService.getUserStats(userId);

          if (!stats) {
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: 'No statistics available yet. Solve some puzzles to build your stats!'
            });
            return;
          }

          // Get achievement progress
          const achievementProgress = await this.achievementService.getAchievementProgress(userId);

          const blocks: any[] = [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `📊 Stats for ${stats.display_name}`,
                emoji: true
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Total Solves:*\n${stats.total_solves}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Current Streak:*\n${stats.current_streak} 🔥`
                },
                {
                  type: 'mrkdwn',
                  text: `*Avg Guesses:*\n${stats.avg_guesses_per_solve.toFixed(1)}`
                },
                {
                  type: 'mrkdwn',
                  text: `*First Place:*\n${stats.first_place_finishes} 🥇`
                },
                {
                  type: 'mrkdwn',
                  text: `*Mood Tier:*\n${stats.mood_tier_name}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Badges:*\n🏆 ${achievementProgress.unlocked}/${achievementProgress.total}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Hint Coins:*\n💰 ${stats.hint_coins}`
                }
              ]
            }
          ];

          if (achievementProgress.unlocked > 0) {
            blocks.push({
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '_Use */badges* to see your earned achievements_'
                }
              ]
            });
          }

          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            blocks
          });
        } catch (error) {
          this.logger.error(`Error handling stats command: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: 'Sorry, I encountered an error fetching your stats.'
          });
        }
      }

      /**
       * Handle /alltime command
       */
      private async handleAllTimeCommand(channelId: string, threadTs: string | undefined): Promise<void> {
        try {
          const leaderboard = await this.statsService.getAllTimeLeaderboard();
    
          if (leaderboard.length === 0) {
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: 'No statistics available yet!'
            });
            return;
          }
    
          const blocks: any[] = [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🏆 All-Time Leaderboard',
                emoji: true
              }
            }
          ];
    
          const leaderboardText = leaderboard
            .slice(0, 10) // Top 10
            .map(entry => {
              const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `${entry.rank}.`;
              return `${medal} *${entry.display_name}* - ${entry.total_solves} solves, ${entry.avg_guesses_per_solve.toFixed(1)} avg`;
            })
            .join('\n');
    
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: leaderboardText
            }
          });
    
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            blocks
          });
        } catch (error) {
          this.logger.error(`Error handling all-time command: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: 'Sorry, I encountered an error fetching the all-time leaderboard.'
          });
        }
      }

      /**
       * Handle /help command
       */
      private async handleHelpCommand(channelId: string, threadTs: string | undefined): Promise<void> {
        const helpText = `*🎮 Bamboozled Puzzle Bot Commands*

    */puzzle* or */bamboozled* - View the current puzzle
    */leaderboard* - View this week's leaderboard
    */stats* - View your personal statistics
    */alltime* - View all-time leaderboard
    */badges* or */achievements* - View your earned badges
    */allbadges* - View all available badges
    */hint* - Get a hint (costs coins!)
    */generate* [theme] - Generate a new AI puzzle
    */mypuzzles* - View your generated puzzles
    */review* - View pending puzzles (admin)
    */approve* <id> - Approve a puzzle (admin)
    */reject* <id> <reason> - Reject a puzzle (admin)
    */botmood* - Check the bot's mood toward you
    */nextweek* - Rotate to next puzzle (testing)
    */help* - Show this help message

    💡 *To submit an answer, send me a direct message with your guess!*`;

        await this.app.client.chat.postMessage({
          channel: channelId,
          ...(threadTs && { thread_ts: threadTs }),
          text: helpText
        });
      }

      /**
       * Handle /botmood command
       */
      private async handleBotMoodCommand(channelId: string, threadTs: string | undefined, userId: string): Promise<void> {
        try {
          await this.ensureUser(userId);
          const progress = await this.moodService.getProgressToNextTier(userId);
    
          const blocks: any[] = [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🎭 Bot Mood Status',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Current Tier:* ${progress.currentTier.name}\n_${progress.currentTier.description}_`
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Current Streak:*\n${progress.streak} 🔥`
                },
                {
                  type: 'mrkdwn',
                  text: `*Total Solves:*\n${progress.totalSolves}`
                }
              ]
            }
          ];
    
          if (progress.nextTier) {
            blocks.push({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Next Tier:* ${progress.nextTier.name}\n` +
                      `Need ${progress.streaksNeeded} more streak${progress.streaksNeeded === 1 ? '' : 's'} ` +
                      `and ${progress.solvesNeeded} more solve${progress.solvesNeeded === 1 ? '' : 's'}`
              }
            });
          } else {
            blocks.push({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '👑 *You\'ve reached maximum tier! I am in awe of your puzzle-solving prowess.*'
              }
            });
          }
    
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            blocks
          });
        } catch (error) {
          this.logger.error(`Error handling botmood command: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: 'Sorry, I encountered an error checking my mood.'
          });
        }
      }
    
      /**
       * Handle /nextweek command - Rotate to next puzzle (testing)
       */
      private async handleNextWeekCommand(channelId: string, threadTs: string | undefined): Promise<void> {
        try {
          const currentPuzzle = await this.puzzleService.getActivePuzzle();
          const allPuzzles = await this.puzzleService.getAllPuzzles();
          const nextPuzzle = await this.puzzleService.rotateToNextPuzzle();

          if (!nextPuzzle) {
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: '❌ No puzzles available to rotate to.'
            });
            return;
          }

          let debugInfo = `Total puzzles: ${allPuzzles.length}`;
          if (currentPuzzle) {
            const currentIdx = allPuzzles.findIndex(p => p.puzzle_id === currentPuzzle.puzzle_id);
            const nextIdx = allPuzzles.findIndex(p => p.puzzle_id === nextPuzzle.puzzle_id);
            debugInfo += `\nPrevious: ${currentPuzzle.puzzle_key} (index ${currentIdx})`;
            debugInfo += `\nNew: ${nextPuzzle.puzzle_key} (index ${nextIdx})`;
            debugInfo += `\nAnswer: "${nextPuzzle.answer}"`;
          } else {
            debugInfo += `\nNo previous puzzle (activating first)`;
            debugInfo += `\nNew: ${nextPuzzle.puzzle_key}`;
            debugInfo += `\nAnswer: "${nextPuzzle.answer}"`;
          }

          const blocks: any[] = [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🔄 Week Reset - New Puzzle Activated!',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: debugInfo + '\n\nThe week has been reset. Weekly leaderboard will start fresh with this puzzle!'
              }
            }
          ];

          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            blocks
          });
        } catch (error) {
          this.logger.error(`Error handling nextweek command: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: 'Sorry, I encountered an error rotating to the next puzzle.'
          });
        }
      }

      /**
       * Handle /badges or /achievements command
       */
      private async handleBadgesCommand(channelId: string, threadTs: string | undefined, userId: string): Promise<void> {
        try {
          await this.ensureUser(userId);
          const userAchievements = await this.achievementService.getUserAchievements(userId);
          const progress = await this.achievementService.getAchievementProgress(userId);

          const blocks: any[] = [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🏆 Your Achievement Badges',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Progress:* ${progress.unlocked}/${progress.total} unlocked (${progress.percentage}%)`
              }
            }
          ];

          if (userAchievements.length === 0) {
            blocks.push({
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '_No badges yet! Start solving puzzles to earn achievements._'
              }
            });
          } else {
            // Group by category
            const categories = ['streak', 'solve', 'speed', 'efficiency', 'comeback', 'special'];
            const categoryNames: Record<string, string> = {
              streak: '🔥 Streak',
              solve: '🎯 Solve Count',
              speed: '⚡ Speed',
              efficiency: '🎪 Efficiency',
              comeback: '✨ Comeback',
              special: '🌟 Special'
            };

            for (const category of categories) {
              const categoryBadges = userAchievements.filter(ua => ua.achievement.category === category);
              if (categoryBadges.length > 0) {
                const badgeList = categoryBadges
                  .map(ua => `${ua.achievement.emoji} *${ua.achievement.name}* - _${ua.achievement.description}_`)
                  .join('\n');

                blocks.push({
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*${categoryNames[category]}*\n${badgeList}`
                  }
                });
              }
            }
          }

          blocks.push({
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '_Use */allbadges* to see all available achievements_'
              }
            ]
          });

          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            blocks
          });
        } catch (error) {
          this.logger.error(`Error handling badges command: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: 'Sorry, I encountered an error fetching your badges.'
          });
        }
      }

      /**
       * Handle /allbadges command
       */
      private async handleAllBadgesCommand(channelId: string, threadTs: string | undefined): Promise<void> {
        try {
          const allAchievements = await this.achievementService.getAllAchievements(false); // Don't show secret ones

          const blocks: any[] = [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '🎯 All Available Badges',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '_Collect badges by solving puzzles and reaching milestones!_'
              }
            }
          ];

          // Group by category
          const categories = ['streak', 'solve', 'speed', 'efficiency', 'comeback', 'special'];
          const categoryNames: Record<string, string> = {
            streak: '🔥 Streak Achievements',
            solve: '🎯 Solve Count Achievements',
            speed: '⚡ Speed Achievements',
            efficiency: '🎪 Efficiency Achievements',
            comeback: '✨ Comeback Achievements',
            special: '🌟 Special Achievements'
          };

          for (const category of categories) {
            const categoryBadges = allAchievements.filter(a => a.category === category);
            if (categoryBadges.length > 0) {
              const badgeList = categoryBadges
                .map(a => `${a.emoji} *${a.name}* (${a.tier})\n_${a.description}_`)
                .join('\n\n');

              blocks.push({
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*${categoryNames[category]}*\n${badgeList}`
                }
              });
            }
          }

          blocks.push({
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '🤫 _Some secret achievements are hidden from this list..._'
              }
            ]
          });

          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            blocks
          });
        } catch (error) {
          this.logger.error(`Error handling allbadges command: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: 'Sorry, I encountered an error fetching all badges.'
          });
        }
      }

      /**
       * Handle /hint command - Request a hint for the current puzzle
       */
      private async handleHintCommand(channelId: string, threadTs: string | undefined, userId: string): Promise<void> {
        try {
          await this.ensureUser(userId);
          const result = await this.hintService.requestHint(userId);

          if (result.success) {
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: result.message
            });
          } else {
            // Send error message
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: result.message
            });

            // If insufficient coins, show pricing info
            if (result.error === 'INSUFFICIENT_COINS') {
              const costs = this.hintService.getHintCosts();
              const pricingText = `💰 *Hint Pricing:*\n${costs.map(c => `• Level ${c.level}: ${c.cost} coins (${c.description})`).join('\n')}\n\n` +
                `*Earn coins by solving puzzles!*\n` +
                `• Base reward: 2 coins\n` +
                `• First guess solve: +3 bonus coins\n` +
                `• 3 or fewer guesses: +1 coin\n` +
                `• 5+ week streak: +1 coin\n` +
                `• 10+ week streak: +2 coins\n` +
                `• First place finish: +2 coins`;

              await this.app.client.chat.postMessage({
                channel: channelId,
                ...(threadTs && { thread_ts: threadTs }),
                text: pricingText
              });
            }
          }
        } catch (error) {
          this.logger.error(`Error handling hint command: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: 'Sorry, I encountered an error getting your hint.'
          });
        }
      }

      /**
       * Handle /generate command - Generate a new AI puzzle
       */
      private async handleGenerateCommand(channelId: string, threadTs: string | undefined, userId: string, theme?: string): Promise<void> {
        try {
          await this.ensureUser(userId);

          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: '🤖 Generating a new puzzle with AI... This may take a moment!'
          });

          const generatedPuzzle = await this.puzzleGeneratorService.generatePuzzle({
            userId,
            theme,
            difficulty: 'MEDIUM'
          });

          const blocks: any[] = [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '✨ Puzzle Generated!',
                emoji: true
              }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Answer:* ${generatedPuzzle.answer}\n*Concept:* ${generatedPuzzle.puzzle_concept}\n*Visual:* ${generatedPuzzle.visual_description}\n*Difficulty:* ${generatedPuzzle.difficulty}\n${theme ? `*Theme:* ${theme}` : ''}\n\n_Status: Pending admin review_\n_Puzzle ID: \`${generatedPuzzle.generated_puzzle_id}\`_`
              }
            }
          ];

          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            blocks
          });
        } catch (error) {
          this.logger.error(`Error generating puzzle: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: '❌ Sorry, I encountered an error generating the puzzle. Please try again.'
          });
        }
      }

      /**
       * Handle /mypuzzles command - View your generated puzzles
       */
      private async handleMyPuzzlesCommand(channelId: string, threadTs: string | undefined, userId: string): Promise<void> {
        try {
          await this.ensureUser(userId);
          const puzzles = await this.puzzleGeneratorService.getUserPuzzles(userId);

          if (puzzles.length === 0) {
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: 'You haven\'t generated any puzzles yet! Use `/generate` to create one.'
            });
            return;
          }

          const puzzleList = puzzles.slice(0, 10).map((p, i) => {
            const statusEmoji = p.status === 'APPROVED' ? '✅' : p.status === 'REJECTED' ? '❌' : '⏳';
            return `${i + 1}. ${statusEmoji} *${p.answer}*\n   _${p.puzzle_concept}_ (ID: \`${p.generated_puzzle_id}\`)`;
          }).join('\n\n');

          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: `*Your Generated Puzzles:*\n\n${puzzleList}\n\n_Showing ${Math.min(10, puzzles.length)} of ${puzzles.length} puzzles_`
          });
        } catch (error) {
          this.logger.error(`Error fetching user puzzles: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: '❌ Sorry, I encountered an error fetching your puzzles.'
          });
        }
      }

      /**
       * Handle /review command - View pending puzzles (admin)
       */
      private async handleReviewCommand(channelId: string, threadTs: string | undefined, userId: string): Promise<void> {
        try {
          const pendingPuzzles = await this.puzzleGeneratorService.getPendingPuzzles();

          if (pendingPuzzles.length === 0) {
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: '✅ No puzzles pending review!'
            });
            return;
          }

          const stats = await this.puzzleGeneratorService.getStats();
          const puzzleList = pendingPuzzles.slice(0, 5).map((p, i) => {
            return `${i + 1}. *${p.answer}*\n   _${p.puzzle_concept}_\n   Visual: ${p.visual_description}\n   Difficulty: ${p.difficulty}\n   ID: \`${p.generated_puzzle_id}\``;
          }).join('\n\n');

          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: `*📋 Pending Puzzles (${stats.pending})*\n\n${puzzleList}\n\n_Use \`/approve <id>\` or \`/reject <id> <reason>\`_\n\n*Stats:* ${stats.total} total | ${stats.approved} approved | ${stats.rejected} rejected`
          });
        } catch (error) {
          this.logger.error(`Error fetching pending puzzles: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: '❌ Sorry, I encountered an error fetching pending puzzles.'
          });
        }
      }

      /**
       * Handle /approve command - Approve a generated puzzle (admin)
       */
      private async handleApproveCommand(channelId: string, threadTs: string | undefined, reviewerId: string, puzzleId: string): Promise<void> {
        try {
          if (!puzzleId) {
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: '❌ Please provide a puzzle ID: `/approve <puzzle_id>`'
            });
            return;
          }

          await this.ensureUser(reviewerId);
          const puzzle = await this.puzzleGeneratorService.approvePuzzle(puzzleId, reviewerId);

          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: `✅ Approved puzzle: *${puzzle.answer}*\n_This puzzle can now be used in future rotations!_`
          });
        } catch (error) {
          this.logger.error(`Error approving puzzle: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: '❌ Sorry, I encountered an error approving the puzzle. Check that the ID is correct.'
          });
        }
      }

      /**
       * Handle /reject command - Reject a generated puzzle (admin)
       */
      private async handleRejectCommand(channelId: string, threadTs: string | undefined, reviewerId: string, puzzleId: string, reason: string): Promise<void> {
        try {
          if (!puzzleId) {
            await this.app.client.chat.postMessage({
              channel: channelId,
              ...(threadTs && { thread_ts: threadTs }),
              text: '❌ Please provide a puzzle ID: `/reject <puzzle_id> <reason>`'
            });
            return;
          }

          await this.ensureUser(reviewerId);
          const puzzle = await this.puzzleGeneratorService.rejectPuzzle(puzzleId, reviewerId, reason);

          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: `❌ Rejected puzzle: *${puzzle.answer}*\n_Reason: ${reason}_`
          });
        } catch (error) {
          this.logger.error(`Error rejecting puzzle: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            ...(threadTs && { thread_ts: threadTs }),
            text: '❌ Sorry, I encountered an error rejecting the puzzle. Check that the ID is correct.'
          });
        }
      }

      /**
       * Ensure user exists, creating if necessary
       */
      private async ensureUser(userId: string): Promise<User> {
        // Get user info from Slack
        const slackUser = await this.app.client.users.info({ user: userId });
        const displayName = slackUser.user?.real_name || slackUser.user?.name || userId;

        return this.userService.getOrCreateUser(userId, displayName);
      }

      /**
       * Handle direct messages (puzzle guesses)
       */
      private async handleDirectMessage(channelId: string, userId: string, text: string, threadTs: string): Promise<void> {
        try {
          // Ensure user exists
          const user = await this.ensureUser(userId);

          // Determine user's intent
          // Quick pattern matching for common phrases before asking AI
          const lowerText = text.toLowerCase().trim();
          let intent: string;

          if (lowerText.match(/^(next\s*week|reset|rotate|new\s*puzzle)/)) {
            intent = '/nextweek';
          } else if (lowerText.match(/^(puzzle|show.*puzzle|what.*puzzle|view.*puzzle)/)) {
            intent = '/puzzle';
          } else if (lowerText.match(/^(leaderboard|leader\s*board|standings)/)) {
            intent = '/leaderboard';
          } else if (lowerText.match(/^(stats|statistics|my\s*stats)/)) {
            intent = '/stats';
          } else if (lowerText.match(/^(all\s*time|alltime|all.*time.*leaders)/)) {
            intent = '/alltime';
          } else if (lowerText.match(/^(help|commands)/)) {
            intent = '/help';
          } else if (lowerText.match(/^(bot\s*mood|mood|attitude)/)) {
            intent = '/botmood';
          } else if (lowerText.match(/^(badges|achievements|my\s*badges|my\s*achievements)/)) {
            intent = '/badges';
          } else if (lowerText.match(/^(all\s*badges|all\s*achievements)/)) {
            intent = '/allbadges';
          } else if (lowerText.match(/^(hi|hello|hey|good\s*(morning|afternoon|evening))/)) {
            intent = 'none';
          } else {
            // Fall back to AI for complex cases
            const availableCommands = [
              '/puzzle',
              '/leaderboard',
              '/stats',
              '/alltime',
              '/help',
              '/botmood',
              '/badges',
              '/allbadges',
              '/nextweek'
            ];
            intent = await this.aiProvider.determineIntent(text, availableCommands);
            this.logger.info(`AI determined intent: "${intent}" for message: "${text}"`);
          }
    
          // Execute command based on intent
          switch (intent) {
            case '/puzzle':
              await this.handlePuzzleCommand(channelId, threadTs, user.user_id);
              break;
            case '/leaderboard':
              await this.handleLeaderboardCommand(channelId, threadTs);
              break;
            case '/stats':
              await this.handleStatsCommand(channelId, threadTs, user.user_id);
              break;
            case '/alltime':
              await this.handleAllTimeCommand(channelId, threadTs);
              break;
            case '/help':
              await this.handleHelpCommand(channelId, threadTs);
              break;
            case '/botmood':
              await this.handleBotMoodCommand(channelId, threadTs, user.user_id);
              break;
            case '/nextweek':
              await this.handleNextWeekCommand(channelId, threadTs);
              break;
            case '/badges':
              await this.handleBadgesCommand(channelId, threadTs, user.user_id);
              break;
            case '/allbadges':
              await this.handleAllBadgesCommand(channelId, threadTs);
              break;
            case 'guess':
            default:
              // Treat unknown intents as guesses (this is primarily a guessing game)
              const result = await this.guessService.submitGuess(user.user_id, text);

              // Send response message
              await this.app.client.chat.postMessage({
                channel: channelId,
                thread_ts: threadTs,
                text: result.message
              });

              // Send GIF if correct
              if (result.isCorrect && result.gifUrl) {
                await this.app.client.chat.postMessage({
                  channel: channelId,
                  thread_ts: threadTs,
                  blocks: [
                    {
                      type: 'image',
                      image_url: result.gifUrl,
                      alt_text: 'Celebration GIF'
                    }
                  ]
                });
              }

              // Show tier change if applicable
              if (result.tierChanged) {
                const tierInfo = this.moodService.getMoodTierInfo(result.newTier!);
                await this.app.client.chat.postMessage({
                  channel: channelId,
                  thread_ts: threadTs,
                  text: `🎉 *You've advanced to ${tierInfo.name}!* 🎉\n_${tierInfo.description}_`
                });
              }

              // Show achievements if any were unlocked
              if (result.achievements && result.achievements.length > 0) {
                const achievementMessage = this.achievementService.formatAchievementMessage(result.achievements);
                await this.app.client.chat.postMessage({
                  channel: channelId,
                  thread_ts: threadTs,
                  text: achievementMessage
                });
              }

              // Show leaderboard if they solved it
              if (result.showLeaderboard) {
                const activePuzzle = await this.puzzleService.getActivePuzzle();
                if (activePuzzle) {
                  const leaderboard = await this.statsService.getWeeklyLeaderboard(activePuzzle.puzzle_id);
                  const userRank = leaderboard.find(e => e.user_id === userId)?.rank || 0;

                  if (userRank > 0) {
                    await this.app.client.chat.postMessage({
                      channel: channelId,
                      thread_ts: threadTs,
                      text: `You're rank #${userRank} this week! 🏆`
                    });
                  }
                }
              }
              break;
          }
        } catch (error) {
          this.logger.error(`Error handling direct message: ${error}`);
          await this.app.client.chat.postMessage({
            channel: channelId,
            thread_ts: threadTs,
            text: 'Sorry, I encountered an error processing your message. Please try again.'
          });
        }
      }

  /**
   * Start the Slack bot
   */
  async start(): Promise<void> {
    await this.app.start();
    this.logger.info('Slack bot is running!');
  }

  /**
   * Stop the Slack bot
   */
  async stop(): Promise<void> {
    await this.app.stop();
    this.logger.info('Slack bot stopped');
  }
}
