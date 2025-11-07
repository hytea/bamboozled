import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PuzzleService } from '../puzzle.service';
import { PuzzleRepository } from '../../db/repositories/puzzle.repository';
import type { Puzzle } from '../../types';

vi.mock('../../db/repositories/puzzle.repository');
vi.mock('../../config/env', () => ({
  getConfig: () => ({
    PUZZLE_DATA_PATH: './test-data/puzzle-data.json',
    PUZZLE_IMAGES_PATH: './test-data/images'
  })
}));
vi.mock('fs');
vi.mock('path');

describe('PuzzleService', () => {
  let puzzleService: PuzzleService;
  let mockPuzzleRepository: any;

  const mockPuzzle: Puzzle = {
    puzzle_id: 'puzzle-1',
    puzzle_key: 'test-puzzle',
    answer: 'test answer',
    image_path: 'test.png',
    week_start_date: new Date().toISOString(),
    week_end_date: new Date().toISOString(),
    is_active: 1,
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPuzzleRepository = {
      getActivePuzzle: vi.fn(),
      findById: vi.fn(),
      findByKey: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      setActivePuzzle: vi.fn(),
      getAll: vi.fn()
    };

    vi.mocked(PuzzleRepository).mockImplementation(() => mockPuzzleRepository);
    puzzleService = new PuzzleService();
  });

  describe('getActivePuzzle', () => {
    it('should return the active puzzle', async () => {
      mockPuzzleRepository.getActivePuzzle.mockResolvedValue(mockPuzzle);

      const result = await puzzleService.getActivePuzzle();

      expect(result).toEqual(mockPuzzle);
      expect(mockPuzzleRepository.getActivePuzzle).toHaveBeenCalled();
    });

    it('should return undefined when no active puzzle', async () => {
      mockPuzzleRepository.getActivePuzzle.mockResolvedValue(undefined);

      const result = await puzzleService.getActivePuzzle();

      expect(result).toBeUndefined();
    });
  });

  describe('getPuzzleById', () => {
    it('should return puzzle by ID', async () => {
      mockPuzzleRepository.findById.mockResolvedValue(mockPuzzle);

      const result = await puzzleService.getPuzzleById('puzzle-1');

      expect(result).toEqual(mockPuzzle);
      expect(mockPuzzleRepository.findById).toHaveBeenCalledWith('puzzle-1');
    });
  });

  describe('getPuzzleByKey', () => {
    it('should return puzzle by key', async () => {
      mockPuzzleRepository.findByKey.mockResolvedValue(mockPuzzle);

      const result = await puzzleService.getPuzzleByKey('test-puzzle');

      expect(result).toEqual(mockPuzzle);
      expect(mockPuzzleRepository.findByKey).toHaveBeenCalledWith('test-puzzle');
    });
  });

  describe('activatePuzzle', () => {
    it('should activate puzzle by key', async () => {
      mockPuzzleRepository.findByKey.mockResolvedValue(mockPuzzle);
      mockPuzzleRepository.update.mockResolvedValue(mockPuzzle);

      const result = await puzzleService.activatePuzzle('test-puzzle');

      expect(mockPuzzleRepository.setActivePuzzle).toHaveBeenCalledWith('puzzle-1');
      expect(mockPuzzleRepository.update).toHaveBeenCalled();
      expect(result).toEqual(mockPuzzle);
    });

    it('should throw error when puzzle not found', async () => {
      mockPuzzleRepository.findByKey.mockResolvedValue(undefined);

      await expect(puzzleService.activatePuzzle('non-existent')).rejects.toThrow('Puzzle not found');
    });
  });

  describe('activatePuzzleById', () => {
    it('should activate puzzle by ID', async () => {
      await puzzleService.activatePuzzleById('puzzle-1');

      expect(mockPuzzleRepository.setActivePuzzle).toHaveBeenCalledWith('puzzle-1');
      expect(mockPuzzleRepository.update).toHaveBeenCalled();
    });
  });

  describe('getAllPuzzles', () => {
    it('should return all puzzles', async () => {
      const puzzles = [mockPuzzle];
      mockPuzzleRepository.getAll.mockResolvedValue(puzzles);

      const result = await puzzleService.getAllPuzzles();

      expect(result).toEqual(puzzles);
      expect(mockPuzzleRepository.getAll).toHaveBeenCalled();
    });
  });

  describe('rotateToNextPuzzle', () => {
    it('should activate first puzzle when no active puzzle', async () => {
      const puzzles = [mockPuzzle];
      mockPuzzleRepository.getAll.mockResolvedValue(puzzles);
      mockPuzzleRepository.getActivePuzzle.mockResolvedValue(undefined);

      const result = await puzzleService.rotateToNextPuzzle();

      expect(mockPuzzleRepository.setActivePuzzle).toHaveBeenCalledWith('puzzle-1');
      expect(result).toEqual(puzzles[0]);
    });

    it('should rotate to next puzzle', async () => {
      const puzzle2: Puzzle = { ...mockPuzzle, puzzle_id: 'puzzle-2', puzzle_key: 'puzzle-2' };
      const puzzles = [mockPuzzle, puzzle2];

      mockPuzzleRepository.getAll.mockResolvedValue(puzzles);
      mockPuzzleRepository.getActivePuzzle.mockResolvedValue(mockPuzzle);

      await puzzleService.rotateToNextPuzzle();

      expect(mockPuzzleRepository.setActivePuzzle).toHaveBeenCalledWith('puzzle-2');
    });

    it('should wrap around to first puzzle', async () => {
      const puzzle2: Puzzle = { ...mockPuzzle, puzzle_id: 'puzzle-2', puzzle_key: 'puzzle-2' };
      const puzzles = [mockPuzzle, puzzle2];

      mockPuzzleRepository.getAll.mockResolvedValue(puzzles);
      mockPuzzleRepository.getActivePuzzle.mockResolvedValue(puzzle2);

      await puzzleService.rotateToNextPuzzle();

      expect(mockPuzzleRepository.setActivePuzzle).toHaveBeenCalledWith('puzzle-1');
    });
  });
});
