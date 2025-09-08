/**
 * Jest setup file for integration and e2e tests
 */

// Increase timeout for integration tests
jest.setTimeout(15000);

// Mock console methods to reduce noise during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Only show errors and warnings that are not expected test output
  console.error = (...args) => {
    const message = args.join(' ');
    if (!message.includes('Server stderr:') && !message.includes('ECONNREFUSED')) {
      originalConsoleError(...args);
    }
  };
  
  console.warn = (...args) => {
    const message = args.join(' ');
    if (!message.includes('deprecated') && !message.includes('experimental')) {
      originalConsoleWarn(...args);
    }
  };
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
  // Helper to wait for a condition
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for condition'));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },
  
  // Helper to create mock AEM responses
  createMockAEMResponse: (data, success = true) => ({
    success,
    data,
    metadata: {
      timestamp: new Date(),
      requestId: 'test-request-id',
      duration: 100
    }
  })
};