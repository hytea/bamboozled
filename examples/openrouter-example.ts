/**
 * OpenRouter Provider Usage Example
 *
 * This example shows how to use the OpenRouter AI provider
 * in the Bamboozled puzzle game.
 */

import { OpenRouterProvider } from '../backend/src/services/ai/openrouter.provider';
import type { AIValidationRequest, AIResponseRequest } from '../backend/src/types';

// Example 1: Initialize the provider
async function initializeProvider() {
  console.log('=== Initializing OpenRouter Provider ===');

  // Set environment variables first:
  // process.env.OPENROUTER_API_KEY = 'your-key-here';
  // process.env.OPENROUTER_MODEL = 'anthropic/claude-sonnet-4.5';

  const provider = new OpenRouterProvider();
  console.log('✅ Provider initialized');

  return provider;
}

// Example 2: Validate an answer
async function validateAnswerExample() {
  console.log('\n=== Answer Validation Example ===');

  const provider = new OpenRouterProvider();

  const request: AIValidationRequest = {
    correctAnswer: 'head over heels',
    userGuess: 'head over heals' // Typo - should still accept
  };

  const result = await provider.validateAnswer(request);

  console.log('Correct Answer:', request.correctAnswer);
  console.log('User Guess:', request.userGuess);
  console.log('Is Correct:', result.is_correct);
  console.log('Confidence:', result.confidence);
  console.log('Reasoning:', result.reasoning);
}

// Example 3: Generate response for different mood tiers
async function generateResponseExample() {
  console.log('\n=== Response Generation Example ===');

  const provider = new OpenRouterProvider();

  // Tier 0: The Skeptic (new player)
  const skepticRequest: AIResponseRequest = {
    moodTier: 0,
    streak: 0,
    totalSolves: 0,
    isCorrect: true,
    guessNumber: 3,
    userName: 'NewPlayer',
    firstPlaceCount: 0
  };

  const skepticResponse = await provider.generateResponse(skepticRequest);
  console.log('\n[Tier 0 - The Skeptic]');
  console.log(skepticResponse.message);

  // Tier 3: The Respector (consistent player)
  const respectorRequest: AIResponseRequest = {
    moodTier: 3,
    streak: 6,
    totalSolves: 15,
    isCorrect: true,
    guessNumber: 1,
    userName: 'RegularPlayer',
    firstPlaceCount: 2
  };

  const respectorResponse = await provider.generateResponse(respectorRequest);
  console.log('\n[Tier 3 - The Respector]');
  console.log(respectorResponse.message);

  // Tier 6: The Worshipper (master player)
  const worshipperRequest: AIResponseRequest = {
    moodTier: 6,
    streak: 25,
    totalSolves: 60,
    isCorrect: true,
    guessNumber: 1,
    userName: 'PuzzleMaster',
    firstPlaceCount: 20
  };

  const worshipperResponse = await provider.generateResponse(worshipperRequest);
  console.log('\n[Tier 6 - The Worshipper]');
  console.log(worshipperResponse.message);
}

// Example 4: Test different models
async function testDifferentModels() {
  console.log('\n=== Testing Different Models ===');

  const models = [
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-haiku-4',
    'openai/gpt-3.5-turbo',
    'meta-llama/llama-3.3-70b-instruct'
  ];

  for (const model of models) {
    console.log(`\nTesting: ${model}`);
    process.env.OPENROUTER_MODEL = model;

    const provider = new OpenRouterProvider();

    const request: AIValidationRequest = {
      correctAnswer: 'piece of cake',
      userGuess: 'peice of cake'
    };

    try {
      const result = await provider.validateAnswer(request);
      console.log(`✅ ${model}: ${result.is_correct ? 'ACCEPTED' : 'REJECTED'} (confidence: ${result.confidence})`);
    } catch (error) {
      console.log(`❌ ${model}: Error - ${error}`);
    }
  }
}

// Example 5: Error handling
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');

  // Test with invalid API key
  const originalKey = process.env.OPENROUTER_API_KEY;
  process.env.OPENROUTER_API_KEY = 'invalid-key';

  const provider = new OpenRouterProvider();

  const request: AIValidationRequest = {
    correctAnswer: 'test',
    userGuess: 'test'
  };

  console.log('Testing with invalid API key...');
  const result = await provider.validateAnswer(request);

  // Should fallback to exact match
  console.log('Fallback result:', result);
  console.log('✅ Gracefully handled error with fallback');

  // Restore original key
  process.env.OPENROUTER_API_KEY = originalKey;
}

// Example 6: Batch processing
async function batchProcessingExample() {
  console.log('\n=== Batch Processing Example ===');

  const provider = new OpenRouterProvider();

  const guesses = [
    { correct: 'break the ice', guess: 'break the ice' },
    { correct: 'break the ice', guess: 'brake the ice' },
    { correct: 'break the ice', guess: 'completely wrong' }
  ];

  console.log('Processing multiple guesses...');

  const results = await Promise.all(
    guesses.map(async ({ correct, guess }) => {
      const result = await provider.validateAnswer({
        correctAnswer: correct,
        userGuess: guess
      });
      return { guess, result };
    })
  );

  results.forEach(({ guess, result }) => {
    console.log(`"${guess}": ${result.is_correct ? '✅' : '❌'} (${result.reasoning})`);
  });
}

// Example 7: Cost estimation
function estimateCost() {
  console.log('\n=== Cost Estimation ===');

  const estimates = {
    'claude-sonnet-4.5': {
      input: 3,    // $ per 1M tokens
      output: 15,
      description: 'Balanced - best for production'
    },
    'claude-haiku-4': {
      input: 0.25,
      output: 1.25,
      description: 'Fast & cheap - best for testing'
    },
    'gpt-4-turbo': {
      input: 10,
      output: 30,
      description: 'Premium quality'
    },
    'llama-3.3-70b': {
      input: 0.88,
      output: 0.88,
      description: 'Open source - very cheap'
    }
  };

  // Estimate for 1000 puzzle validations
  const avgTokens = 150; // Typical validation uses ~150 tokens

  console.log('Cost for 1000 puzzle validations:');
  Object.entries(estimates).forEach(([model, pricing]) => {
    const cost = (avgTokens / 1_000_000) * (pricing.input + pricing.output) * 1000;
    console.log(`${model}: $${cost.toFixed(4)} - ${pricing.description}`);
  });
}

// Run all examples
async function main() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  OpenRouter Provider Usage Examples       ║');
  console.log('╚════════════════════════════════════════════╝');

  try {
    await initializeProvider();

    // Uncomment to run specific examples:
    // await validateAnswerExample();
    // await generateResponseExample();
    // await testDifferentModels();
    // await errorHandlingExample();
    // await batchProcessingExample();

    estimateCost();

    console.log('\n✅ All examples completed!');
    console.log('\nTo use OpenRouter in your app:');
    console.log('1. Set OPENROUTER_API_KEY in .env');
    console.log('2. Set AI_PROVIDER=openrouter');
    console.log('3. Optionally set OPENROUTER_MODEL');
    console.log('4. Start your backend: npm run dev');

  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Export functions for use in other files
export {
  initializeProvider,
  validateAnswerExample,
  generateResponseExample,
  testDifferentModels,
  errorHandlingExample,
  batchProcessingExample,
  estimateCost
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
