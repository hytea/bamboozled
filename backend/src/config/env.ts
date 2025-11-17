import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (parent of backend/)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  // AI Provider
  AI_PROVIDER: z.enum(['claude', 'openrouter', 'local', 'mock']).default('claude'),
  AI_API_KEY: z.string().optional(),

  // Claude
  ANTHROPIC_API_KEY: z.string().optional(),

  // OpenRouter
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default('anthropic/claude-sonnet-4.5'),

  // Local Model (Ollama)
  LOCAL_MODEL_URL: z.string().default('http://localhost:11434'),
  LOCAL_MODEL_NAME: z.string().default('llama3.2'),

  // Server
  PORT: z.string().transform(Number).default('3001'),
  WEB_CHAT_PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_PATH: z.string().default('./data/bamboozled.db'),

  // Slack (optional)
  SLACK_BOT_TOKEN: z.string().optional(),
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_APP_TOKEN: z.string().optional(),
  ENABLE_SLACK: z.string().transform(v => v === 'true').default('false'),

  // Giphy
  GIPHY_API_KEY: z.string().optional(),

  // Puzzles
  PUZZLE_DATA_PATH: z.string().default('./puzzles/puzzle-data.json'),
  PUZZLE_IMAGES_PATH: z.string().default('./puzzles/images'),
  PUZZLE_ROTATION_DAY: z.string().transform(Number).default('1'),
  PUZZLE_ROTATION_HOUR: z.string().transform(Number).default('9'),

  // Features
  ENABLE_WEB_CHAT: z.string().transform(v => v === 'true').default('true'),
});

export type Env = z.infer<typeof envSchema>;

let config: Env;

export function loadConfig(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  config = result.data;

  // Validate AI provider configuration
  if (config.AI_PROVIDER === 'claude' && !config.ANTHROPIC_API_KEY && !config.AI_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY or AI_API_KEY required when using Claude provider');
    process.exit(1);
  }

  if (config.AI_PROVIDER === 'openrouter' && !config.OPENROUTER_API_KEY && !config.AI_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY or AI_API_KEY required when using OpenRouter provider');
    process.exit(1);
  }

  return config;
}

export function getConfig(): Env {
  if (!config) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return config;
}
