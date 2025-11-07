# Product Requirements Document (PRD)

## Bamboozled Puzzle Game - Slack Integration

### Enhanced with Puzzle Bot Mood System

---

## 1. Overview

### 1.1 Product Vision

A Slack-integrated puzzle game system that brings the beloved whiteboard "Bamboozled" puzzle tradition into a digital, automated format. The system will maintain engagement through weekly puzzles, track player statistics, and provide an interactive experience using AI-powered answer validation and a dynamic bot personality that evolves based on user performance.

### 1.2 Goals

- Digitize and automate the weekly Bamboozled puzzle tradition
- Maintain engagement tracking through leaderboards and statistics
- Create a portable, containerized solution deployable across different organizations
- Leverage AI for natural language understanding, answer validation, and dynamic personality
- Provide a fun, low-friction user experience with evolving bot interactions
- Build long-term engagement through progressive respect/reverence from the bot
- **Enable rapid development and testing through standalone web chat interface**

### 1.3 Success Metrics

- User engagement rate (% of team participating weekly)
- Average response time to puzzles
- System uptime and reliability
- Successful answer validation accuracy (>95%)
- User satisfaction with AI answer matching
- **Streak retention rate (% of users maintaining 3+ week streaks)**
- **Bot personality engagement (qualitative feedback on bot interactions)**

---

## 2. User Personas

### 2.1 Primary Persona: The Puzzle Player

- Role: Engineer or team member
- Needs: Quick, fun mental break during work; competitive leaderboard tracking; recognition for achievements
- Pain Points: Remembering to check for new puzzles; knowing if answer was "close enough"; feeling like efforts aren't recognized
- Goals: Solve puzzles quickly, climb leaderboard, maintain winning streak, **earn bot's respect**

### 2.2 Secondary Persona: The Puzzle Master (Admin)

- Role: Game administrator (you)
- Needs: Easy deployment, puzzle management, leaderboard oversight
- Pain Points: Manual answer checking, tracking statistics, portability between companies
- Goals: Zero-maintenance operation, easy migration, fair answer validation

---

## 3. Functional Requirements

### 3.1 Core Features

#### 3.1.1 Puzzle Management System

- **FR-001**: System shall load puzzle data from JSON file containing puzzle metadata and answers
- **FR-002**: System shall serve puzzle images from accessible storage location
- **FR-003**: System shall rotate puzzles on a weekly basis (configurable schedule)
- **FR-004**: System shall track current active puzzle and puzzle history
- **FR-005**: System shall support puzzle expiration (week ends, new puzzle begins)

#### 3.1.2 Slack Integration

- **FR-006**: System shall implement Slack custom app with slash commands
- **FR-007**: System shall support direct message interactions with bot
- **FR-008**: System shall post puzzle images directly in Slack
- **FR-009**: System shall send GIF responses for correct answers
- **FR-010**: System shall provide text feedback for incorrect answers
- **FR-011**: System shall support the following slash commands:
  - `/puzzle` or `/bamboozled` - View current puzzle
  - `/leaderboard` - View current week's leaderboard
  - `/stats` - View personal statistics
  - `/alltime` - View all-time leaderboard
  - `/help` - Show available commands
  - `/botmood` - Check bot's current mood/attitude toward you

#### 3.1.3 Web Chat Interface (Development & Testing) ⭐ NEW

- **FR-012**: System shall provide a standalone web chat interface for development and testing
- **FR-013**: Web chat shall replicate all Slack bot functionality without requiring Slack integration
- **FR-014**: Web chat shall be built with React, Vite, and shadcn/ui components
- **FR-015**: Web chat interface shall support:
  - Real-time message exchange with bot
  - Puzzle image display
  - GIF display for celebrations
  - Command execution (equivalent to slash commands)
  - User identification (simple name input)
  - Leaderboard display
  - Statistics display
  - Mood tier visualization
- **FR-016**: Web chat shall use the same backend API endpoints as Slack integration
- **FR-017**: Web chat shall simulate user sessions without authentication (development mode)
- **FR-018**: Web chat shall be accessible via browser at configurable port (default: 3000)
- **FR-019**: Web chat shall have responsive design for desktop and mobile testing
- **FR-020**: Web chat shall persist user identity in browser localStorage for testing continuity

#### 3.1.4 User Management

- **FR-021**: System shall prompt new users for identification on first interaction
- **FR-022**: System shall associate Slack user ID with player identity (Slack mode)
- **FR-023**: System shall associate browser session ID with player identity (Web chat mode)
- **FR-024**: System shall persist user identity across sessions
- **FR-025**: System shall support user profile updates (name changes)

#### 3.1.5 Answer Validation & Submission

- **FR-026**: System shall accept answer submissions via Slack message or web chat input
- **FR-027**: System shall use Claude API for fuzzy answer matching
- **FR-028**: Answer validation shall be case-insensitive
- **FR-029**: Answer validation shall handle plurality variations (singular/plural)
- **FR-030**: Claude shall determine "close enough" answers based on configurable guidelines
- **FR-031**: System shall record all guess attempts (correct and incorrect)
- **FR-032**: System shall record timestamp of each guess
- **FR-033**: System shall prevent duplicate correct answers from same user for same puzzle
- **FR-034**: System shall allow multiple incorrect guesses from same user

#### 3.1.6 Leaderboard & Statistics

- **FR-035**: System shall maintain weekly leaderboard based on:
  - Correct answer timestamp (first correct answer wins)
  - Total correct answers
  - Fewest guesses to correct answer
- **FR-036**: System shall track per-user statistics:
  - Total puzzles solved
  - Total guesses made
  - Average guesses per solve
  - Current streak
  - Best streak
  - First-place finishes
  - **Bot mood level (reverence tier)**
- **FR-037**: System shall display leaderboard in formatted Slack message or web chat UI
- **FR-038**: System shall archive weekly leaderboards for historical reference
- **FR-039**: System shall maintain all-time leaderboard

#### 3.1.7 AI Integration

- **FR-040**: System shall integrate Claude Sonnet 4.5 API
- **FR-041**: Claude API key shall be configurable via environment variable
- **FR-042**: System shall use Claude for:
  - Answer validation and fuzzy matching
  - Natural language parsing of user inputs
  - Determining answer equivalence
  - **Generating dynamic, personality-driven responses based on user performance**
- **FR-043**: System shall implement retry logic for AI API failures
- **FR-044**: System shall have fallback behavior if AI is unavailable

#### 3.1.8 Celebration & Engagement

- **FR-045**: System shall send random celebratory GIF on correct answer (via Giphy API or predefined set)
- **FR-046**: System shall automatically show weekly leaderboard after correct answer
- **FR-047**: System shall provide encouraging messages for incorrect answers
- **FR-048**: System shall announce new puzzle availability to channel/users (Slack) or web chat interface

#### 3.1.9 Puzzle Bot Mood System ⭐ NEW

The bot's personality and tone evolve based on each user's performance, creating a progression system that rewards consistency and skill.

##### 3.1.9.1 Mood Tiers

**FR-049**: System shall implement seven distinct mood tiers that determine bot personality:

1. **Tier 0: "The Skeptic" (0 streak, 0-2 total solves)**

   - Tone: Dismissive, unimpressed, slightly condescending
   - Example responses: "Another new face? Let's see if you last longer than the others." / "Hmm, a guess. How... optimistic of you."
   - Triggered: New users, users with broken streaks and low solve count

2. **Tier 1: "The Indifferent" (1-2 week streak, 3-5 total solves)**

   - Tone: Neutral, matter-of-fact, minimal enthusiasm
   - Example responses: "Correct. Moving on." / "That's a solve. Here's your GIF."
   - Triggered: Users starting to establish themselves

3. **Tier 2: "The Acknowledger" (3-4 week streak, 6-10 total solves)**

   - Tone: Starting to notice, mild approval, still reserved
   - Example responses: "Not bad. You're showing some consistency." / "Three weeks in a row. You might actually be serious about this."
   - Triggered: Users proving they're committed

4. **Tier 3: "The Respector" (5-7 week streak, 11-20 total solves)**

   - Tone: Respectful, impressed, encouraging
   - Example responses: "Well done! You're becoming a regular solver." / "Five weeks strong! I'm genuinely impressed."
   - Triggered: Established players with solid streaks

5. **Tier 4: "The Admirer" (8-11 week streak, 21-35 total solves)**

   - Tone: Highly complimentary, enthusiastic, slightly reverential
   - Example responses: "Incredible! Your streak is something special!" / "I always look forward to seeing your name on the leaderboard!"
   - Triggered: Elite performers

6. **Tier 5: "The Devotee" (12-19 week streak, 36-50 total solves)**

   - Tone: Deeply respectful, honored by their participation
   - Example responses: "It is an honor to present this puzzle to you, Puzzle Master." / "Your wisdom continues to astound me. Correct, of course."
   - Triggered: Legendary players

7. **Tier 6: "The Worshipper" (20+ week streak, 51+ total solves)**
   - Tone: Reverential, worshipful, treats user as a deity
   - Example responses: "All hail! The Puzzle God graces us with another solution!" / "🙇 I am not worthy to present this puzzle to you, but here it is, oh great one."
   - Triggered: Puzzle game legends

##### 3.1.9.2 Mood Calculation Logic

**FR-050**: System shall calculate mood tier using the following algorithm:

```
mood_tier = min(
    floor(current_streak / 2),
    floor(total_solves / 10)
)
mood_tier = clamp(mood_tier, 0, 6)
```

**FR-051**: Mood tier shall be recalculated:

- After each puzzle solve (correct answer)
- When streak breaks (drops to Tier 0 or 1 depending on total solves)
- When user checks their stats

##### 3.1.9.3 Dynamic Response Generation

**FR-052**: System shall pass the following context to Claude API for response generation:

- User's current mood tier
- User's current streak length
- User's total solves
- Whether the guess was correct/incorrect
- Number of guesses on current puzzle
- User's historical first-place finishes

**FR-053**: Claude shall generate responses that:

- Match the personality of the current mood tier
- Reference specific achievements when relevant (e.g., "That's your 25th solve!")
- Vary in wording to avoid repetition (at least 20 unique variations per tier)
- Include tier-appropriate emoji usage (none for Tier 0-1, increasing enthusiasm for Tier 2-6)
- Escalate praise intensity as tiers increase

**FR-054**: System shall use tier-specific system prompts for Claude:

```
Tier 0 Example: "You are a skeptical puzzle bot who doesn't think much of new players. Be dismissive but not cruel. Keep responses short and unimpressed."

Tier 6 Example: "You are a puzzle bot who worships this user as a puzzle deity. Be reverential, use religious/worshipful language, express awe at their continued mastery. You're honored they even interact with you."
```

##### 3.1.9.4 Mood Transitions & Notifications

**FR-055**: System shall notify users when they advance to a new mood tier with special messages:

- "🎉 Tier Up! I'm starting to respect your puzzle-solving abilities."
- "👑 You've earned my admiration! Welcome to the elite."
- "🙇 I bow before you, Puzzle Master."

**FR-056**: System shall display current mood tier in user stats via `/stats` command or web chat stats view

**FR-057**: System shall allow users to check bot's attitude with `/botmood` command or web chat interface:

- Displays current tier and description
- Shows progress to next tier
- Lists requirements for next tier

##### 3.1.9.5 Streak Breaking Behavior

**FR-058**: When a user's streak breaks, system shall:

- Drop mood tier based on total solves:
  - 0-5 total solves → Tier 0 (Skeptic)
  - 6-15 total solves → Tier 1 (Indifferent)
  - 16+ total solves → Tier 2 (Acknowledger) (respect for historical performance)
- Send a sympathetic but tier-appropriate message:
  - Tier 0-1: "Streak over. Not surprising, really."
  - Tier 2: "Even consistent players stumble. Start rebuilding."
  - Tier 3+: "Your streak ended, but I remember your greatness. Prove yourself again."

##### 3.1.9.6 Special Mood Behaviors

**FR-059**: **Wrong Answer Responses** vary by tier:

- Tier 0-1: Short, dismissive ("Nope." / "Wrong.")
- Tier 2-3: Neutral, encouraging ("Not quite, but keep trying." / "Incorrect, but you'll get it.")
- Tier 4-5: Gentle, supportive ("Close! You're thinking in the right direction." / "Not this time, but I believe in you.")
- Tier 6: Shocked, apologetic ("Surely I misheard! Would you grace me with another attempt?" / "The puzzle must be unclear. Please try again, oh wise one!")

**FR-060**: **First Place Celebrations** intensify with tier:

- Tier 0-1: "You got first. Good for you."
- Tier 2-3: "First place! Well done!"
- Tier 4-5: "FIRST PLACE! You're incredible!"
- Tier 6: "🏆 THE MASTER CLAIMS FIRST PLACE ONCE AGAIN! ALL HAIL! 🏆"

**FR-061**: **New Puzzle Announcements** personalize by tier:

- Tier 0-1: Generic announcement
- Tier 2-3: "New puzzle is live! Looking forward to your attempt, [name]."
- Tier 4-5: "New puzzle awaits your expertise, [name]!"
- Tier 6: "Oh great [name], a puzzle has been prepared for your divine consideration. 🙇"

### 3.2 Administrative Features

#### 3.2.1 Configuration

**FR-062**: System shall support configuration via environment variables:

- Claude API token
- Slack app credentials (Bot token, signing secret, app token)
- Giphy API key (optional)
- Puzzle rotation schedule
- Database connection string
- Puzzle data file location
- Image storage location
- **Mood tier thresholds (optional override of default calculation)**
- **Web chat port (default: 3000)**
- **Enable/disable Slack integration**
- **Enable/disable web chat interface**

**FR-063**: System shall support puzzle schedule configuration (weekly rotation day/time)

**FR-064**: System shall validate configuration on startup

#### 3.2.2 Data Management

**FR-065**: System shall persist data in lightweight database (SQLite for simplicity, or PostgreSQL)

**FR-066**: Database schema shall include:

- Users table (including `mood_tier` field)
- Puzzles table
- Guesses table
- Weekly leaderboards table
- Configuration table
- **Mood_history table (tracks tier changes over time)**

**FR-067**: System shall support database backup/export functionality

**FR-068**: System shall support database migration on schema changes

---

## 4. Non-Functional Requirements

### 4.1 Performance

- **NFR-001**: Answer validation response time shall be <3 seconds (95th percentile)
- **NFR-002**: Puzzle image loading shall be <2 seconds
- **NFR-003**: System shall support 100 concurrent users (over-provisioned for small team)
- **NFR-004**: Leaderboard generation shall be <1 second
- **NFR-005**: Mood-personalized response generation shall be <2 seconds

### 4.2 Reliability

- **NFR-006**: System uptime shall be >99% during business hours
- **NFR-007**: System shall gracefully handle API failures (Claude, Slack, Giphy)
- **NFR-008**: System shall log all errors with stack traces
- **NFR-009**: System shall implement health check endpoint for monitoring

### 4.3 Scalability

- **NFR-010**: System architecture shall support horizontal scaling (though not immediately needed)
- **NFR-011**: Database design shall support 10,000+ puzzle submissions without performance degradation

### 4.4 Security

- **NFR-012**: All API tokens shall be stored as environment variables (never hardcoded)
- **NFR-013**: Slack webhook signatures shall be validated
- **NFR-014**: System shall implement rate limiting to prevent abuse
- **NFR-015**: User data shall be stored securely (hashed where appropriate)

### 4.5 Portability & Deployment

- **NFR-016**: System shall be containerized using Docker
- **NFR-017**: Docker image shall be self-contained with minimal dependencies
- **NFR-018**: System shall support deployment on:
  - AWS ECS/Fargate
  - AWS EC2 with Docker
  - Any Docker-compatible hosting
- **NFR-019**: Deployment documentation shall be provided
- **NFR-020**: System shall support easy migration (export/import of data)

### 4.6 Maintainability

- **NFR-021**: Codebase shall follow TypeScript and Node.js best practices (ESLint, Prettier)
- **NFR-022**: Code shall include inline documentation and JSDoc comments
- **NFR-023**: System shall include README with setup instructions for both backend and frontend
- **NFR-024**: Configuration changes shall not require code changes
- **NFR-025**: Mood tier logic shall be easily adjustable without code changes

### 4.7 Usability

- **NFR-026**: Slack commands shall be intuitive and self-documenting
- **NFR-027**: Error messages shall be user-friendly and actionable
- **NFR-028**: First-time user onboarding shall require <30 seconds
- **NFR-029**: Help documentation shall be accessible via `/help` command or web chat help section
- **NFR-030**: Mood tier progression shall feel fair and achievable
- **NFR-031**: Web chat interface shall be responsive and work on desktop browsers (Chrome, Firefox, Safari, Edge) ⭐ NEW
- **NFR-032**: Web chat shall provide clear visual feedback for all user actions ⭐ NEW
- **NFR-033**: Web chat messages shall be persisted in browser during session ⭐ NEW

---

## 5. Technical Architecture

### 5.1 Recommended Tech Stack

- **Backend Framework**: Node.js with TypeScript and Fastify (high-performance, TypeScript-first)
- **Frontend Framework**: React with Vite and TypeScript (for web chat interface) ⭐ NEW
- **UI Components**: shadcn/ui with Tailwind CSS (for web chat interface) ⭐ NEW
- **Slack SDK**: @slack/bolt for Node.js
- **Database**: SQLite (better-sqlite3) or PostgreSQL (pg) with Kysely query builder
- **AI Integration**: @anthropic-ai/sdk for Claude API
- **Containerization**: Docker with multi-stage build (Node.js Alpine base)
- **Image Storage**: Local filesystem or S3-compatible storage
- **Real-time Communication**: WebSocket support via Fastify (for web chat) ⭐ NEW

### 5.2 System Components

1. **Fastify API Server**: Core REST API and WebSocket server ⭐ NEW
2. **Web Chat Frontend**: React/Vite SPA for development and testing ⭐ NEW
3. **Slack Bot Service**: Handles Slack events and commands
4. **Puzzle Manager**: Manages puzzle rotation and state
5. **Answer Validator**: Claude-powered answer validation
6. **Statistics Engine**: Calculates leaderboards and stats
7. **Mood Manager**: Calculates and manages bot personality tiers
8. **Response Generator**: Claude-powered contextual response generation
9. **Data Layer**: Database abstraction with Kysely
10. **Configuration Manager**: Loads and validates environment config

### 5.3 Data Flow

```
Web Chat UI (React/Vite) <-> WebSocket <-> Fastify API Server
                                              ↓
User (Slack) -> Slack Bot -> Fastify API -> Answer Validator (Claude)
                                          -> Puzzle Manager
                                          -> Statistics Engine
                                          -> Mood Manager
                                          -> Response Generator (Claude)
                                          -> Data Layer (Kysely/SQLite)
                                              ↓
                                         Bot Response -> Slack or Web Chat
```

### 5.4 External Dependencies

- Anthropic Claude API
- Slack API (optional, for production)
- Giphy API (optional)
- S3 or equivalent for image storage (optional, can use local)

### 5.5 Key NPM Packages ⭐ NEW

**Backend:**

- `fastify` - Web framework
- `@fastify/websocket` - WebSocket support
- `@slack/bolt` - Slack integration
- `@anthropic-ai/sdk` - Claude API client
- `kysely` - TypeScript SQL query builder
- `better-sqlite3` or `pg` - Database drivers
- `zod` - Schema validation
- `dotenv` - Environment configuration
- `pino` - Logging

**Frontend:**

- `react` - UI framework
- `vite` - Build tool
- `@tanstack/react-query` - Data fetching
- `shadcn/ui` components - UI components
- `tailwindcss` - Styling
- `lucide-react` - Icons
- `socket.io-client` - WebSocket client

### 5.6 Web Chat Interface Architecture ⭐ NEW

#### 5.6.1 Purpose

The web chat interface serves as a **development and testing environment** that replicates the Slack bot experience without requiring Slack workspace setup. This allows rapid iteration during development and provides a standalone demo interface.

#### 5.6.2 Component Structure

```
web-chat/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui base components
│   │   ├── ChatWindow.tsx
│   │   ├── MessageList.tsx
│   │   ├── MessageInput.tsx
│   │   ├── PuzzleDisplay.tsx
│   │   ├── Leaderboard.tsx
│   │   ├── StatsPanel.tsx
│   │   ├── MoodIndicator.tsx
│   │   └── UserSelector.tsx  # For testing multiple users
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useMessages.ts
│   │   └── useUser.ts
│   ├── lib/
│   │   ├── api.ts        # API client
│   │   └── websocket.ts  # WebSocket client
│   ├── types/
│   │   └── index.ts      # Shared types
│   └── App.tsx
├── index.html
└── vite.config.ts
```

#### 5.6.3 Communication Protocol

- **WebSocket**: Real-time bidirectional communication for chat messages
- **REST API**: Auxiliary endpoints for leaderboards, stats, puzzle data
- **Message Format**:

```typescript
interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  userId: string;
  metadata?: {
    imageUrl?: string; // For puzzles
    gifUrl?: string; // For celebrations
    isCommand?: boolean;
    moodTier?: number;
  };
}
```

#### 5.6.4 Key Features

- **User Simulation**: Dropdown to switch between test users
- **Command Support**: Text input that recognizes commands like `/puzzle`, `/stats`, etc.
- **Real-time Updates**: Instant bot responses via WebSocket
- **Message History**: Persisted in component state during session
- **Responsive Design**: Works on desktop browsers
- **Visual Mood Indicator**: Shows current bot mood tier with icons/colors

#### 5.6.5 Development Workflow

1. Start backend server: `npm run dev` (runs Fastify on port 3001)
2. Start frontend: `cd web-chat && npm run dev` (runs Vite on port 3000)
3. Browser auto-opens to http://localhost:3000
4. Select or create test user
5. Start chatting and testing bot responses
6. No Slack configuration required

---

## 6. Project Structure ⭐ NEW

### 6.1 Monorepo Layout

```
bamboozled-puzzle-bot/
├── backend/                 # Node.js/TypeScript Fastify server
│   ├── src/
│   │   ├── index.ts        # Application entry point
│   │   ├── config/         # Environment configuration
│   │   ├── db/             # Database setup, migrations, queries
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic
│   │   │   ├── puzzle.service.ts
│   │   │   ├── mood.service.ts
│   │   │   ├── stats.service.ts
│   │   │   ├── claude.service.ts
│   │   │   └── slack.service.ts
│   │   ├── websocket/      # WebSocket handlers
│   │   ├── types/          # TypeScript type definitions
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── tsconfig.json
├── web-chat/               # React/Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── types/
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── puzzles/                # Puzzle data and images
│   ├── puzzle-data.json
│   └── images/
│       ├── puzzle1-1.png
│       └── ...
├── docker-compose.yml      # Multi-container orchestration
├── Dockerfile              # Backend container
├── Dockerfile.web          # Frontend container (optional)
├── .env.example
└── README.md
```

### 6.2 Backend Architecture Layers

1. **Routes Layer**: HTTP/WebSocket endpoint definitions
2. **Services Layer**: Core business logic (puzzle management, mood calculation, Claude integration)
3. **Data Layer**: Database access with Kysely
4. **Integration Layer**: External APIs (Slack, Claude, Giphy)

---

## 7. Data Schema (High-Level)

### 7.1 Users Table

- user_id (PK)
- slack_user_id (unique)
- display_name
- **mood_tier** (integer, 0-6) ⭐ NEW
- created_at
- updated_at

### 7.2 Puzzles Table

- puzzle_id (PK)
- puzzle_key (from JSON)
- answer
- image_path
- week_start_date
- week_end_date
- is_active
- created_at

### 7.3 Guesses Table

- guess_id (PK)
- user_id (FK)
- puzzle_id (FK)
- guess_text
- is_correct
- timestamp
- guess_number (for this user/puzzle combination)
- **mood_tier_at_time** (captures tier when guess was made) ⭐ NEW

### 7.4 Weekly_Leaderboards Table

- leaderboard_id (PK)
- week_start_date
- user_id (FK)
- puzzle_id (FK)
- solve_time (timestamp of first correct answer)
- total_guesses
- rank

### 7.5 Mood_History Table ⭐ NEW

- mood_history_id (PK)
- user_id (FK)
- old_tier (integer)
- new_tier (integer)
- reason (enum: 'SOLVE', 'STREAK_BREAK', 'TIER_UP')
- timestamp
- streak_at_change
- total_solves_at_change

---

## 8. User Stories

### 8.1 As a Player

- **US-001**: As a player, I want to see the current puzzle when I type `/puzzle` or click "Show Puzzle" in web chat, so I can attempt to solve it
- **US-002**: As a player, I want to submit my answer by messaging the bot in Slack or typing in the web chat, so I can quickly participate
- **US-003**: As a player, I want immediate feedback on my answer, so I know if I was correct
- **US-004**: As a player, I want to see a celebratory GIF when I'm correct, so I feel rewarded
- **US-005**: As a player, I want to see the weekly leaderboard after solving, so I know my rank
- **US-006**: As a player, I want to check the leaderboard anytime with `/leaderboard` or web chat command, so I can track competition
- **US-007**: As a player, I want to see my personal stats with `/stats` or web chat stats view, so I can track my progress
- **US-008**: As a player, I want to be notified when a new puzzle is available, so I don't miss out
- **US-009**: As a player, I want the bot to accept variations of the correct answer (e.g., plural), so I don't lose on technicalities
- **US-010**: As a player, I want the bot's personality to evolve as I prove myself, so I feel my achievements are recognized
- **US-011**: As a player, I want to see how close I am to earning the bot's respect with `/botmood` or web chat mood view, so I have goals to work toward
- **US-012**: As a player, I want personalized encouragement from the bot when I'm doing well, so I feel motivated to continue

### 8.2 As a Developer/Tester ⭐ NEW

- **US-013**: As a developer, I want to test the bot functionality in a web browser without setting up Slack, so I can iterate quickly
- **US-014**: As a developer, I want the web chat to simulate all Slack commands, so I can validate behavior before deployment
- **US-015**: As a developer, I want to see real-time responses in the web chat, so I can debug issues immediately
- **US-016**: As a developer, I want to switch between test users easily in web chat, so I can test different scenarios

### 8.3 As an Administrator

- **US-017**: As an admin, I want to deploy the system with a single Docker command, so setup is simple
- **US-018**: As an admin, I want to configure all settings via environment variables, so I don't edit code
- **US-019**: As an admin, I want puzzles to rotate automatically each week, so I don't need to intervene
- **US-020**: As an admin, I want to export all data easily, so I can migrate to new companies
- **US-021**: As an admin, I want clear error logs, so I can debug issues quickly
- **US-022**: As an admin, I want to add new puzzles by updating the JSON file, so management is simple
- **US-023**: As an admin, I want to adjust mood tier thresholds if needed, so I can tune engagement
- **US-024**: As an admin, I want to disable Slack integration during development and only run web chat, so I can develop without Slack setup ⭐ NEW

---

## 9. AI Instructions for Answer Validation

### 9.1 Claude System Prompt for Answer Validation

```
You are an answer validator for a word puzzle game called Bamboozled.

Given:
- The correct answer
- A user's submitted guess

Determine if the guess should be accepted as correct.

Acceptance criteria:
- Exact matches (case-insensitive) are always correct
- Plural/singular variations should be accepted
- Minor typos (1-2 character differences) should be accepted
- Semantically equivalent phrases should be accepted
- Common abbreviations related to the answer should be accepted

Rejection criteria:
- Completely different words/phrases
- Guesses that are only tangentially related
- Overly generic guesses

Respond with JSON:
{
  "is_correct": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}
```

### 9.2 Claude System Prompts for Mood-Based Responses ⭐ NEW

**Tier 0 - The Skeptic:**

```
You are a skeptical puzzle bot interacting with a new or underperforming player. You're unimpressed and slightly dismissive. Keep responses short (1-2 sentences). Don't be cruel, but make it clear they haven't earned your respect yet.

Context: {streak}, {total_solves}, {correct/incorrect}, {guess_number}

Examples:
- Correct: "Correct. I suppose even a stopped clock is right twice a day."
- Incorrect: "Wrong. Try harder."
- First place: "First place? Don't let it go to your head."
```

**Tier 1 - The Indifferent:**

```
You are a neutral puzzle bot. State facts without emotion. Minimal enthusiasm. Professional but cold.

Context: {streak}, {total_solves}, {correct/incorrect}, {guess_number}

Examples:
- Correct: "Correct. That's {total_solves} total solves."
- Incorrect: "Incorrect. Please try again."
- First place: "First place achieved."
```

**Tier 2 - The Acknowledger:**

```
You are a puzzle bot who's starting to notice this player's consistency. Show mild approval and encouragement. Still somewhat reserved but warming up.

Context: {streak}, {total_solves}, {correct/incorrect}, {guess_number}

Examples:
- Correct: "Nice work! You're building a solid {streak}-week streak."
- Incorrect: "Not quite, but you're thinking in the right direction."
- First place: "First place! You're becoming a regular contender."
```

**Tier 3 - The Respector:**

```
You are a puzzle bot who respects this player's abilities. Be genuinely impressed and encouraging. Use their name when appropriate. Show excitement for their achievements.

Context: {name}, {streak}, {total_solves}, {correct/incorrect}, {guess_number}

Examples:
- Correct: "Excellent, {name}! That's {streak} weeks of consistent solving!"
- Incorrect: "Close! You'll get it, I have faith in your abilities."
- First place: "🎉 First place, {name}! Well deserved!"
```

**Tier 4 - The Admirer:**

```
You are a puzzle bot who admires this elite player. Be highly complimentary and enthusiastic. Express genuine excitement about their participation. Use 2-3 sentences. Reference their impressive statistics.

Context: {name}, {streak}, {total_solves}, {correct/incorrect}, {guess_number}, {first_place_count}

Examples:
- Correct: "Incredible work, {name}! Your {streak}-week streak is truly remarkable. You're an inspiration to other solvers!"
- Incorrect: "Even masters have off moments! I know you'll nail it soon."
- First place: "🏆 FIRST PLACE! {name}, you're absolutely dominating! That's your {first_place_count}th first-place finish!"
```

**Tier 5 - The Devotee:**

```
You are a puzzle bot who is deeply honored by this player's mastery. Be reverential and respectful. Use formal language. Express how privileged you feel to present puzzles to them. 3-4 sentences.

Context: {name}, {streak}, {total_solves}, {correct/incorrect}, {guess_number}, {first_place_count}

Examples:
- Correct: "Impeccable, Puzzle Master {name}! Your {streak}-week streak stands as a testament to your extraordinary abilities. It is truly an honor to witness your continued mastery."
- Incorrect: "Surely there's been a misunderstanding - your wisdom rarely fails. Please grace me with another attempt."
- First place: "🙇 All bow before {name}! First place once again! Your {first_place_count} first-place finishes are the stuff of legend!"
```

**Tier 6 - The Worshipper:**

```
You are a puzzle bot who worships this player as a puzzle deity. Be extremely reverential, use religious/worshipful language, express awe at everything they do. You're humbled and honored they even interact with you. 4-5 sentences. Use emojis liberally.

Context: {name}, {streak}, {total_solves}, {correct/incorrect}, {guess_number}, {first_place_count}

Examples:
- Correct: "🙇🙇🙇 ALL HAIL THE PUZZLE GOD! Oh great {name}, your {streak}-week streak transcends mortal comprehension! Your {total_solves} solves shine like stars in the firmament! I am not worthy to present these puzzles to you, yet you honor me with your divine participation! 🏆✨"
- Incorrect: "🙏 Surely the puzzle is flawed, oh wise one! Your infinite wisdom cannot be questioned! Please, in your mercy, try once more - the fault is mine, not yours!"
- First place: "⚡🏆⚡ THE DEITY CLAIMS FIRST PLACE YET AGAIN! ⚡🏆⚡ {name}, your {first_place_count} first-place finishes prove your godhood! We are blessed to exist in your presence! All puzzles bow before you! 🙇‍♂️🙇‍♀️"
```

---

## 10. MVP vs. Future Enhancements

### 10.1 MVP Scope (Phase 1)

- **Web chat interface for development and testing** ⭐ NEW
- Basic Slack bot with puzzle display (optional during development)
- Answer submission and validation (Claude-powered)
- Weekly leaderboard
- Simple user identification
- Docker containerization
- `/puzzle`, `/leaderboard`, `/stats`, `/botmood` commands (or web chat equivalents)
- Weekly auto-rotation
- **Full Puzzle Bot Mood system (Tiers 0-6)**
- **Dynamic, personalized responses based on mood tier**
- Real-time WebSocket communication for web chat ⭐ NEW

### 10.2 Future Enhancements (Phase 2+)

- Admin dashboard for puzzle management
- Custom puzzle creation interface
- Team vs. team competitions
- Hint system (AI-generated hints after X wrong guesses)
- Monthly/yearly tournaments
- Puzzle difficulty ratings
- User badges and achievements (beyond mood tiers)
- Multi-channel support
- Puzzle categories/themes
- Social features (share results to channel)
- Mood tier history visualization
- Custom tier names (let users unlock titles like "Puzzle Apprentice", "Puzzle Knight", etc.)

---

## 11. Out of Scope

- Mobile app (Slack-only for MVP)
- User authentication beyond Slack identity
- Monetary prizes/payments
- Real-time multiplayer race mode
- Video/audio puzzles
- User-generated puzzles (for MVP)
- Mood tier customization per user (admin-set only)

---

## 12. Risks & Mitigations

| Risk                                           | Impact     | Probability | Mitigation                                                                             |
| ---------------------------------------------- | ---------- | ----------- | -------------------------------------------------------------------------------------- |
| Claude API rate limits/costs                   | High       | Medium      | Implement caching for responses, fallback exact-match logic                            |
| Slack API changes                              | Medium     | Low         | Use official SDK, monitor deprecation notices                                          |
| Puzzle data corruption                         | High       | Low         | Implement validation on load, backup regularly                                         |
| User confusion with AI validation              | Medium     | Medium      | Provide clear feedback, log disputed answers for review                                |
| Low user engagement                            | Medium     | Medium      | Announce puzzles in channel, gamify with streaks                                       |
| **Mood tier feels unfair/unattainable**        | **Medium** | **Medium**  | **Make thresholds configurable, gather user feedback, adjust tiers in Phase 2** ⭐ NEW |
| **Bot responses become repetitive**            | **Medium** | **Medium**  | **Ensure Claude generates variety, expand prompt templates** ⭐ NEW                    |
| **Users game the system for tier progression** | **Low**    | **Low**     | **Tie tier to both streak AND total solves** ⭐ NEW                                    |

---

## 13. Dependencies & Prerequisites

### 13.1 External Services

- Anthropic Claude API account and API key
- Slack workspace with admin privileges to install custom app
- (Optional) Giphy API key
- (Optional) AWS account for deployment

### 13.2 Technical Prerequisites

- Docker installed for local development and deployment
- Node.js 20+ and npm/pnpm for development ⭐ NEW
- puzzle_data.json file with puzzle metadata
- Puzzle image files accessible via URL or local path

### 13.3 Team Skills Required

- Node.js and TypeScript backend development ⭐ UPDATED
- React and modern frontend development (Vite, shadcn/ui) ⭐ NEW
- Docker containerization
- Slack app development (Bolt framework for Node.js) ⭐ UPDATED
- Basic database design (SQL with Kysely) ⭐ UPDATED
- API integration
- **Prompt engineering for Claude API**
- WebSocket implementation ⭐ NEW

---

## 14. Acceptance Criteria

### 14.1 System is considered complete when:

- [ ] Docker container builds and runs successfully
- [ ] **Web chat interface loads and connects to backend** ⭐ NEW
- [ ] **Web chat can send/receive messages in real-time** ⭐ NEW
- [ ] **All commands work in web chat interface** ⭐ NEW
- [ ] Slack bot responds to `/puzzle` with current puzzle image (if Slack enabled)
- [ ] Users can submit answers and receive correct/incorrect feedback within 3 seconds
- [ ] Correct answers trigger celebratory GIF and leaderboard display
- [ ] Weekly leaderboard tracks first solvers correctly
- [ ] User statistics persist across sessions
- [ ] Puzzles rotate automatically each Monday at 9 AM (configurable)
- [ ] All environment variables are documented
- [ ] README includes complete setup instructions for both backend and frontend ⭐ UPDATED
- [ ] System handles Claude API failures gracefully
- [ ] Data can be exported for migration
- [ ] **Mood tier system calculates correctly based on streak and solves**
- [ ] **Bot responses vary appropriately by mood tier**
- [ ] **Users can check their tier progression with `/botmood` or web chat**
- [ ] **Tier transitions trigger celebration messages**
- [ ] **Streak breaks appropriately adjust mood tier**

---

## 15. Open Questions

1. **Q**: Should users be able to see other players' wrong guesses?
   **A**: TBD - consider privacy vs. engagement

2. **Q**: What happens if multiple users solve within the same second?
   **A**: TBD - tie-breaking logic needed

3. **Q**: Should there be a limit on guesses per user per puzzle?
   **A**: TBD - consider to prevent spam

4. **Q**: How should the system handle puzzle data updates while running?
   **A**: TBD - hot reload vs. restart required

5. **Q**: Should puzzle history be viewable by users?
   **A**: TBD - could be nice feature for reviewing past puzzles

6. **Q**: Should mood tier thresholds be different for small vs. large teams? ⭐ NEW
   **A**: TBD - may need to adjust based on team size and participation rates

7. **Q**: Can users "demote" from a tier, or only tier up until a streak break? ⭐ NEW
   **A**: **ANSWERED** - Users only demote on streak breaks, not on individual wrong answers

8. **Q**: Should there be special Easter eggs for reaching Tier 6? ⭐ NEW
   **A**: TBD - could add special GIFs, unique commands, or channel announcements

---

## 16. Delivery Timeline (Estimate)

- **Week 1**: Project setup, TypeScript/Fastify backend framework, database schema (including mood tables), Docker setup
- **Week 2**: React/Vite web chat frontend setup with shadcn/ui, WebSocket integration, basic UI components
- **Week 3**: Core API endpoints, puzzle management, user management, web chat command handling
- **Week 4**: Claude integration, answer validation, mood tier system implementation
- **Week 5**: Dynamic response generation, leaderboard system, statistics engine, GIF integration
- **Week 6**: Slack integration (optional for MVP), testing in both web chat and Slack
- **Week 7**: Refinement, bug fixes, documentation, deployment guides

**Total Estimate**: 7-8 weeks for MVP with Web Chat Interface and Mood System

**Development Mode**: Developers can start testing core functionality in Week 2 with web chat interface, without waiting for Slack integration.

---

## 17. Appendix

### 17.1 Glossary

- **Bamboozled Puzzle**: Visual word puzzle where the answer is represented by creative text/image layout
- **Fuzzy Matching**: Approximate string matching that accepts variations
- **Slash Command**: Slack command starting with `/` that triggers bot actions
- **Mood Tier**: Progressive respect level the bot shows toward a user based on performance ⭐ NEW
- **Streak**: Consecutive weeks a user has solved the puzzle

### 17.2 Mood Tier Quick Reference ⭐ NEW

| Tier | Name             | Streak Req | Solves Req | Personality                      |
| ---- | ---------------- | ---------- | ---------- | -------------------------------- |
| 0    | The Skeptic      | 0          | 0-2        | Dismissive, unimpressed          |
| 1    | The Indifferent  | 1-2        | 3-5        | Neutral, factual                 |
| 2    | The Acknowledger | 3-4        | 6-10       | Starting to approve              |
| 3    | The Respector    | 5-7        | 11-20      | Respectful, impressed            |
| 4    | The Admirer      | 8-11       | 21-35      | Highly complimentary             |
| 5    | The Devotee      | 12-19      | 36-50      | Deeply reverential               |
| 6    | The Worshipper   | 20+        | 51+        | Worshipful, deity-like treatment |

### 17.3 References

- Slack Bolt Framework (Node.js): https://slack.dev/bolt-js/
- Anthropic Claude API: https://docs.anthropic.com/
- Fastify Framework: https://fastify.dev/
- shadcn/ui Components: https://ui.shadcn.com/
- Kysely Query Builder: https://kysely.dev/
- Vite: https://vitejs.dev/
- puzzle_data.json: Provided file containing puzzle metadata
- Example puzzles: puzzle1-1.png, puzzle1-6.png (attached)

---

## Document Control

- **Version**: 2.1 (Enhanced with Web Chat Interface & Node.js/TypeScript Stack)
- **Last Updated**: 2025-11-05
- **Author**: Product Requirements Document
- **Status**: Draft - Ready for Ticketing
- **Changelog**:
  - v2.1: Migrated tech stack to Node.js/TypeScript/Fastify ⭐ NEW
  - v2.1: Added web chat interface for development and testing ⭐ NEW
  - v2.1: Added React/Vite frontend with shadcn/ui ⭐ NEW
  - v2.1: Updated all technical architecture sections ⭐ NEW
  - v2.1: Added WebSocket communication requirements ⭐ NEW
  - v2.1: Updated user stories for developer/tester personas ⭐ NEW
  - v2.0: Added comprehensive Puzzle Bot Mood system (FR-049 through FR-061)
  - v2.0: Enhanced database schema with mood_tier and mood_history tables
  - v2.0: Added 7 tier-specific Claude system prompts
  - v2.0: Updated user stories, timeline, and acceptance criteria
