import { PuzzleService } from './puzzle.service.js';
import { StatsService } from './stats.service.js';
import { createDatabase } from '../db/connection.js';

export class SchedulerService {
  private puzzleService: PuzzleService;
  private statsService: StatsService;
  private schedulerInterval: NodeJS.Timeout | null = null;

  // Check every hour for puzzle rotation
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  constructor() {
    this.puzzleService = new PuzzleService();
    this.statsService = new StatsService();
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDatabase(): Promise<void> {
    try {
      await createDatabase();
    } catch (error) {
      // Database already initialized, ignore
    }
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.schedulerInterval) {
      console.log('⚠️  Scheduler already running');
      return;
    }

    console.log('⏰ Starting puzzle rotation scheduler...');
    console.log(`   Checking every ${this.CHECK_INTERVAL_MS / 1000 / 60} minutes`);

    // Check immediately on start
    this.checkAndRotatePuzzle().catch(err => {
      console.error('❌ Error during puzzle rotation check:', err);
    });

    // Then check periodically
    this.schedulerInterval = setInterval(() => {
      this.checkAndRotatePuzzle().catch(err => {
        console.error('❌ Error during puzzle rotation check:', err);
      });
    }, this.CHECK_INTERVAL_MS);

    console.log('✅ Scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log('⏹️  Scheduler stopped');
    }
  }

  /**
   * Check if current puzzle's week has ended and rotate if needed
   */
  async checkAndRotatePuzzle(): Promise<void> {
    await this.ensureDatabase();

    const activePuzzle = await this.puzzleService.getActivePuzzle();

    if (!activePuzzle) {
      console.log('⚠️  No active puzzle found during rotation check');
      return;
    }

    const now = new Date();
    const weekEnd = new Date(activePuzzle.week_end_date);

    // Check if week has ended
    if (now < weekEnd) {
      const timeRemaining = weekEnd.getTime() - now.getTime();
      const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
      console.log(`⏰ Current puzzle: ${activePuzzle.puzzle_key} (${hoursRemaining}h remaining)`);
      return;
    }

    console.log(`🔄 Week ended for puzzle ${activePuzzle.puzzle_key}. Rotating to next puzzle...`);

    // Persist the leaderboard for the ending puzzle
    try {
      await this.statsService.persistWeeklyLeaderboard(
        activePuzzle.puzzle_id,
        activePuzzle.week_start_date as unknown as string
      );
      console.log('✅ Leaderboard persisted');
    } catch (error) {
      console.error('❌ Failed to persist leaderboard:', error);
    }

    // Rotate to next puzzle
    const nextPuzzle = await this.puzzleService.rotateToNextPuzzle();

    if (nextPuzzle) {
      console.log(`✅ Rotated to next puzzle: ${nextPuzzle.puzzle_key}`);
      console.log(`   Week: ${new Date(nextPuzzle.week_start_date).toISOString()} - ${new Date(nextPuzzle.week_end_date).toISOString()}`);
    } else {
      console.log('⚠️  No next puzzle available');
    }
  }

  /**
   * Manually trigger rotation (for testing or admin purposes)
   */
  async manualRotate(): Promise<void> {
    await this.ensureDatabase();

    console.log('🔄 Manual puzzle rotation triggered...');
    const activePuzzle = await this.puzzleService.getActivePuzzle();

    if (activePuzzle) {
      // Persist current leaderboard
      await this.statsService.persistWeeklyLeaderboard(
        activePuzzle.puzzle_id,
        activePuzzle.week_start_date as unknown as string
      );
    }

    // Rotate to next puzzle
    const nextPuzzle = await this.puzzleService.rotateToNextPuzzle();

    if (nextPuzzle) {
      console.log(`✅ Manually rotated to: ${nextPuzzle.puzzle_key}`);
    }
  }
}
