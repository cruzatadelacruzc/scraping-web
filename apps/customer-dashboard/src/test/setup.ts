import '@testing-library/jest-dom';
import { server } from '../mocks/server';

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Reset any request handlers between tests
afterEach(() => server.resetHandlers());

// Clean up after tests finish
afterAll(() => server.close());
