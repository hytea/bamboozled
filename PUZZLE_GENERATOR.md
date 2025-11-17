# AI Puzzle Generator Feature

## Overview

The Bamboozled bot now includes an **AI-Powered Puzzle Generator** that uses Claude AI to create brand new Bamboozle-style visual word puzzles on demand!

## How It Works

1. **Users generate puzzles** - Anyone can request the bot to generate a creative new puzzle
2. **AI creates the concept** - Claude analyzes existing puzzles and generates original ideas
3. **Admin reviews** - Generated puzzles go into a review queue
4. **Approved puzzles** - Once approved, puzzles can be used in future rotations

## Available Commands

### For Everyone

#### `/generate [theme]`
Generate a new AI puzzle. Optionally provide a theme.

**Examples:**
```
/generate
/generate halloween
/generate sports
/generate holidays
```

**Response:**
- Shows the generated puzzle concept, answer, and visual description
- Provides a unique puzzle ID for tracking
- Status starts as "Pending admin review"

#### `/mypuzzles`
View all puzzles you've generated and their approval status.

**Response:**
- List of your puzzles with status indicators:
  - ✅ Approved
  - ❌ Rejected
  - ⏳ Pending
- Shows up to 10 most recent puzzles

### For Admins

#### `/review`
View all pending puzzles that need review.

**Response:**
- List of up to 5 pending puzzles
- Shows concept, visual description, and puzzle ID
- Includes statistics (total, approved, rejected, pending)

#### `/approve <puzzle_id>`
Approve a generated puzzle.

**Example:**
```
/approve 123e4567-e89b-12d3-a456-426614174000
```

**Response:**
- Confirmation that puzzle was approved
- Puzzle can now be used in rotations

#### `/reject <puzzle_id> <reason>`
Reject a generated puzzle with a reason.

**Example:**
```
/reject 123e4567-e89b-12d3-a456-426614174000 Too obscure, not family-friendly
```

**Response:**
- Confirmation that puzzle was rejected
- Reason is saved for reference

## Database Structure

### `generated_puzzles` Table

- `generated_puzzle_id` - Unique identifier
- `puzzle_concept` - Brief description of the puzzle idea
- `answer` - The answer phrase
- `visual_description` - How the answer should be displayed visually
- `difficulty` - EASY, MEDIUM, or HARD
- `status` - PENDING, APPROVED, or REJECTED
- `generated_by` - User who requested generation
- `reviewed_by` - Admin who reviewed
- `created_at` - Timestamp of generation
- `reviewed_at` - Timestamp of review
- `rejection_reason` - If rejected, why
- `theme` - Optional theme

## AI Generation Process

The bot uses Claude Sonnet 4.5 to generate puzzles by:

1. **Analyzing examples** - Studies existing Bamboozle puzzles to understand the format
2. **Creating concepts** - Generates original puzzle ideas using creative wordplay
3. **Describing visuals** - Provides detailed instructions for how to display the answer
4. **Matching difficulty** - Ensures the puzzle meets the requested difficulty level

## Example Generated Puzzles

**Theme: None**
- Answer: "Breaking News"
- Visual: The word "NEWS" broken/split into two parts
- Difficulty: EASY

**Theme: Weather**
- Answer: "Under the Weather"
- Visual: The word "WEATHER" with text below it
- Difficulty: MEDIUM

**Theme: Sports**
- Answer: "Three Pointer"
- Visual: The number "3" pointing to the word "POINTER"
- Difficulty: HARD

## Future Enhancements

- **Automatic rotation** - Approved puzzles can be added to the weekly rotation
- **Voting system** - Users can vote on pending puzzles
- **Difficulty targeting** - Generate puzzles of specific difficulty levels
- **Themed weeks** - Automatically generate themed puzzles for holidays or events
- **Visual rendering** - Automatically create images from descriptions

## Benefits

✅ **Unlimited Content** - Never run out of puzzles
✅ **Community Engagement** - Users contribute to the game
✅ **Creative Ideas** - AI generates clever wordplay humans might miss
✅ **Quality Control** - Admin review ensures only good puzzles make it through
✅ **Themed Events** - Easy to generate puzzles for special occasions
