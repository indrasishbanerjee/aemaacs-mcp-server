"use strict";
/**
 * Test setup for read server
 */
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@aemaacs-mcp/shared");
// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.AEM_HOST = 'localhost';
process.env.AEM_PORT = '4502';
process.env.AEM_USERNAME = 'admin';
process.env.AEM_PASSWORD = 'admin';
process.env.SERVER_PORT = '8080';
process.env.LOG_LEVEL = 'error';
process.env.CACHE_ENABLED = 'false';
// Initialize config manager for tests
shared_1.ConfigManager.getInstance();
// Global test timeout
jest.setTimeout(30000);
//# sourceMappingURL=setup.js.map