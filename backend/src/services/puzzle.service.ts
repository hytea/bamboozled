import { PuzzleRepository } from '../db/repositories/puzzle.repository.js';
import type { Puzzle } from '../types/index.js';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from '../config/env.js';

interface PuzzlePageData {
  pageNumber: number;
  pageUrl: string;
  answerUrl: string;
  puzzleImageName: string[];
  answers: string[];
}

export class PuzzleService {
  private puzzleRepository: PuzzleRepository;

  constructor() {
    this.puzzleRepository = new PuzzleRepository();
  }

  /**
   * Get the currently active puzzle
   */
  async getActivePuzzle(): Promise<Puzzle | undefined> {
    return this.puzzleRepository.getActivePuzzle();
  }

  /**
   * Get puzzle by ID
   */
  async getPuzzleById(puzzleId: string): Promise<Puzzle | undefined> {
    return this.puzzleRepository.findById(puzzleId);
  }

  /**
   * Get puzzle by key
   */
  async getPuzzleByKey(puzzleKey: string): Promise<Puzzle | undefined> {
    return this.puzzleRepository.findByKey(puzzleKey);
  }

  /**
   * Load puzzles from JSON file and populate database
   */
  async loadPuzzlesFromFile(): Promise<void> {
    const config = getConfig();
    const puzzleDataPath = config.PUZZLE_DATA_PATH;

    if (!fs.existsSync(puzzleDataPath)) {
      console.warn(`⚠️  Puzzle data file not found: ${puzzleDataPath}`);
      return;
    }

    const fileContent = fs.readFileSync(puzzleDataPath, 'utf-8');
    const pagesData: PuzzlePageData[] = JSON.parse(fileContent);

    let totalPuzzles = 0;

    for (const page of pagesData) {
      // Each page has multiple puzzles (typically 6)
      for (let i = 0; i < page.puzzleImageName.length; i++) {
        const imageName = page.puzzleImageName[i];
        const answerText = page.answers[i];

        // Extract answer without the number prefix (e.g., "1. Falling Temperature" -> "Falling Temperature")
        const answer = answerText.replace(/^\d+\.\s*/, '').trim();

        // Create puzzle key from image name without extension (e.g., "puzzle1-1.png" -> "puzzle1-1")
        const puzzleKey = imageName.replace(/\.png$/, '');

        // Check if puzzle already exists
        const existing = await this.puzzleRepository.findByKey(puzzleKey);

        if (!existing) {
          // Create new puzzle (inactive by default)
          await this.puzzleRepository.create({
            puzzle_key: puzzleKey,
            answer: answer,
            image_path: imageName,
            week_start_date: new Date().toISOString(),
            week_end_date: new Date().toISOString(),
            is_active: 0
          });
          totalPuzzles++;
        }
      }
    }

    console.log(`✅ Loaded ${totalPuzzles} puzzles from ${pagesData.length} pages in ${puzzleDataPath}`);
  }

  /**
   * Activate a puzzle by key
   */
  async activatePuzzle(puzzleKey: string): Promise<Puzzle> {
    const puzzle = await this.puzzleRepository.findByKey(puzzleKey);

    if (!puzzle) {
      throw new Error(`Puzzle not found: ${puzzleKey}`);
    }

    await this.puzzleRepository.setActivePuzzle(puzzle.puzzle_id);

    // Update week dates
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return this.puzzleRepository.update(puzzle.puzzle_id, {
      week_start_date: now.toISOString(),
      week_end_date: weekEnd.toISOString(),
      is_active: 1
    });
  }

  /**
   * Activate a puzzle by ID
   */
  async activatePuzzleById(puzzleId: string): Promise<void> {
    await this.puzzleRepository.setActivePuzzle(puzzleId);

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    await this.puzzleRepository.update(puzzleId, {
      week_start_date: now.toISOString(),
      week_end_date: weekEnd.toISOString(),
      is_active: 1
    });
  }

  /**
   * Get puzzle image path
   */
  getPuzzleImagePath(puzzle: Puzzle): string {
    const config = getConfig();
    return path.join(config.PUZZLE_IMAGES_PATH, puzzle.image_path);
  }

  /**
   * Check if puzzle image exists
   */
  puzzleImageExists(puzzle: Puzzle): boolean {
    const imagePath = this.getPuzzleImagePath(puzzle);
    return fs.existsSync(imagePath);
  }

  /**
   * Get all puzzles
   */
  async getAllPuzzles(): Promise<Puzzle[]> {
    return this.puzzleRepository.getAll();
  }

  /**
   * Rotate to next puzzle
   * This would be called by a scheduler (e.g., weekly cron job)
   */
  async rotateToNextPuzzle(): Promise<Puzzle | undefined> {
    const allPuzzles = await this.getAllPuzzles();
    const currentPuzzle = await this.getActivePuzzle();

    if (!currentPuzzle) {
      // No active puzzle, activate the first one
      if (allPuzzles.length > 0) {
        await this.activatePuzzleById(allPuzzles[0].puzzle_id);
        return allPuzzles[0];
      }
      return undefined;
    }

    // Find current puzzle index
    const currentIndex = allPuzzles.findIndex(p => p.puzzle_id === currentPuzzle.puzzle_id);

    // Get next puzzle (wrap around to start if at end)
    const nextIndex = (currentIndex + 1) % allPuzzles.length;
    const nextPuzzle = allPuzzles[nextIndex];

    await this.activatePuzzleById(nextPuzzle.puzzle_id);
    return nextPuzzle;
  }
}
