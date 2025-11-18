# Testing Documentation

This document describes the comprehensive testing suite for the Bamboozled Puzzle Game.

## Overview

The project uses **Vitest** as the testing framework for both backend and frontend. Tests are organized by component/service type and include unit tests, integration tests, and component tests.

## Test Structure

```
bamboozled/
├── backend/
│   └── src/
│       ├── services/__tests__/
│       │   ├── ai-provider.test.ts
│       │   ├── giphy.service.test.ts
│       │   ├── guess.service.test.ts
│       │   ├── mood.service.test.ts
│       │   ├── puzzle.service.test.ts
│       │   ├── stats.service.test.ts
│       │   └── user.service.test.ts
│       ├── db/
│       │   ├── __tests__/
│       │   │   └── schema.test.ts
│       │   └── repositories/__tests__/
│       │       └── user.repository.test.ts
│       ├── routes/__tests__/
│       │   └── api.test.ts
│       └── websocket/__tests__/
│           └── chat.handler.test.ts
└── web-chat/
    └── src/
        ├── components/__tests__/
        │   ├── MessageInput.test.tsx
        │   └── UserSelector.test.tsx
        ├── hooks/__tests__/
        │   └── useLocalStorage.test.ts
        └── test/
            ├── setup.ts
            └── integration.test.tsx
```

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Frontend Tests

```bash
cd web-chat

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

### Backend Services

- **PuzzleService**: Tests for puzzle loading, activation, rotation, and retrieval
- **GuessService**: Tests for guess submission, validation, mood tier updates, and duplicate solve prevention
- **UserService**: Tests for user creation, retrieval, and display name availability
- **StatsService**: Tests for statistics calculation, leaderboards, and solve tracking
- **MoodService**: Tests for mood tier calculation and progression
- **GiphyService**: Tests for GIF fetching and fallback handling

### Backend Repositories

- **UserRepository**: Tests for CRUD operations on users
- Additional repository tests can be added following the same pattern

### Frontend Components

- **UserSelector**: Tests for name input, validation, and user creation
- **MessageInput**: Tests for message input, send functionality, and keyboard shortcuts

### Frontend Hooks

- **useLocalStorage**: Tests for localStorage read/write, type handling, and error cases

### Integration Tests

- **Complete Chat Flow**: Tests for end-to-end user journey from name entry to WebSocket connection

## Test Configuration

### Backend (vitest.config.ts)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    }
  }
});
```

### Frontend (vitest.config.ts)

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    }
  }
});
```

## Mocking Strategy

### Backend Mocks

- Database operations are mocked using Vitest's `vi.mock()`
- AI providers are mocked to prevent real API calls
- External services (Giphy) are mocked with fallback responses

### Frontend Mocks

- WebSocket is mocked globally in test setup
- localStorage is mocked with a custom implementation
- Component dependencies are mocked using Vitest

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly with setup, execution, and assertion phases
2. **Test Isolation**: Each test should be independent and not rely on other tests
3. **Mock External Dependencies**: Avoid real API calls, database operations, or file system access
4. **Descriptive Test Names**: Use clear, descriptive names that explain what is being tested
5. **Test Edge Cases**: Include tests for error conditions, empty states, and boundary conditions
6. **Keep Tests Fast**: Use mocks to keep tests fast and deterministic

## Adding New Tests

### Backend Service Test Example

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { YourService } from '../your.service';

vi.mock('../dependencies');

describe('YourService', () => {
  let service: YourService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new YourService();
  });

  it('should do something', async () => {
    // Arrange
    const input = 'test';

    // Act
    const result = await service.doSomething(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Frontend Component Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { YourComponent } from '../YourComponent';

describe('YourComponent', () => {
  it('should render correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    const mockHandler = vi.fn();
    render(<YourComponent onAction={mockHandler} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockHandler).toHaveBeenCalled();
  });
});
```

## Docker-based Testing

For repeatable, isolated testing in containers, use the Docker test setup:

### Quick Start

```bash
# Run all tests (unit + E2E)
./test-runner.sh all

# Run only unit tests (backend + frontend)
./test-runner.sh unit

# Run only backend tests
./test-runner.sh backend

# Run only frontend tests
./test-runner.sh frontend

# Run only E2E tests
./test-runner.sh e2e

# Run tests with coverage reports
./test-runner.sh coverage

# Clean up test containers
./test-runner.sh clean
```

### Manual Docker Commands

#### Backend Tests

```bash
# Build and run backend tests
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit backend-test

# Run with coverage
docker-compose -f docker-compose.test.yml run --rm backend-test npm run test:coverage
```

#### Frontend Tests

```bash
# Build and run frontend tests
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit frontend-test

# Run with coverage
docker-compose -f docker-compose.test.yml run --rm frontend-test npm run test:coverage
```

#### E2E Tests

```bash
# Start backend and frontend services
docker-compose -f docker-compose.test.yml up -d backend frontend

# Run E2E tests
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit e2e-test

# Clean up
docker-compose -f docker-compose.test.yml down -v
```

### Docker Test Configuration

The Docker test setup includes:

1. **backend/Dockerfile.test** - Isolated backend test environment
2. **web-chat/Dockerfile.test** - Isolated frontend test environment
3. **Dockerfile.e2e** - Playwright E2E test environment
4. **docker-compose.test.yml** - Orchestrates all test services
5. **playwright.config.docker.ts** - Docker-specific Playwright configuration

### Benefits of Docker Testing

- **Reproducibility**: Tests run in identical environments across all machines
- **Isolation**: Tests don't interfere with your local development environment
- **Consistency**: Same results in local development, CI/CD, and production
- **Clean State**: Each test run starts with a fresh container
- **No Dependencies**: No need to install Node.js or dependencies locally

## Continuous Integration

The project includes a GitHub Actions workflow that automatically runs all tests on push and pull requests.

### Workflow Overview

The CI pipeline runs three parallel jobs:

1. **Backend Tests** - Runs backend unit tests with coverage
2. **Frontend Tests** - Runs frontend unit tests with coverage
3. **E2E Tests** - Runs Playwright E2E tests against running services

### Viewing Test Results

- Test results are uploaded as artifacts
- Coverage reports are available for download
- PR comments show coverage percentages
- Playwright HTML reports are available for failed E2E tests

### Local CI Testing

To simulate the CI environment locally:

```bash
# Use the test runner script (recommended)
./test-runner.sh all

# Or use docker-compose directly
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit backend-test frontend-test
```

## Coverage Goals

- **Backend Services**: 80%+ coverage
- **Backend Repositories**: 70%+ coverage
- **Frontend Components**: 75%+ coverage
- **Frontend Hooks**: 90%+ coverage

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout in vitest config or specific tests
2. **Mock not working**: Ensure mock is defined before importing the tested module
3. **WebSocket errors**: Check that WebSocket mock is properly set up in test setup
4. **localStorage errors**: Verify test setup file is loaded correctly

## Future Improvements

- [x] Add E2E tests using Playwright (COMPLETED)
- [x] Add Docker-based test infrastructure for repeatable tests (COMPLETED)
- [x] Set up CI/CD with GitHub Actions (COMPLETED)
- [ ] Increase test coverage to 90%+
- [ ] Add performance benchmarks
- [ ] Add visual regression tests for UI components
- [ ] Add mutation testing to verify test quality
- [ ] Set up automated test reporting dashboard
- [ ] Add contract testing between backend and frontend
- [ ] Add load testing for WebSocket connections

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Documentation](https://testing-library.com/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
