#!/usr/bin/env node

/**
 * AEM Read Server Entry Point
 * Supports both MCP protocol over STDIO and HTTP REST API
 */

import { AEMHttpClient } from '../../shared/src/client/aem-http-client.js';
import { ConfigManager } from '../../shared/src/config/server-config.js';
import { Logger } from '../../shared/src/utils/logger.js';
import { STDIOHandler } from './mcp/stdio-handler.js';

async function main() {
  const logger = Logger.getInstance();
  
  try {
    // Load configuration
    const configManager = ConfigManager.getInstance();
    const config = configManager.loadReadServerConfig();
    
    logger.info('Starting AEM Read Server', { 
      mode: process.argv.includes('--stdio') ? 'MCP/STDIO' : 'HTTP',
      aemHost: config.aem.host 
    });

    // Initialize AEM HTTP client
    const client = new AEMHttpClient({
      baseURL: `${config.aem.protocol}://${config.aem.host}:${config.aem.port}`,
      timeout: config.aem.timeout,
      retryAttempts: config.aem.retryAttempts,
      retryDelay: config.aem.retryDelay,
      auth: {
        username: config.aem.username,
        password: config.aem.password,
        clientId: config.aem.clientId,
        clientSecret: config.aem.clientSecret,
        accessToken: config.aem.accessToken
      }
    });

    // Check if running in STDIO mode (for MCP)
    if (process.argv.includes('--stdio')) {
      logger.info('Starting in MCP STDIO mode');
      
      const stdioHandler = new STDIOHandler(client);
      stdioHandler.start();
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        logger.info('Received SIGINT, shutting down gracefully');
        stdioHandler.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        logger.info('Received SIGTERM, shutting down gracefully');
        stdioHandler.stop();
        process.exit(0);
      });
      
    } else {
      // HTTP mode
      logger.info('Starting in HTTP mode');
      
      const { HTTPHandler } = await import('./http/http-handler.js');
      const httpHandler = new HTTPHandler(client, config);
      
      await httpHandler.start();
      
      logger.info('AEM Read Server started successfully', {
        host: config.server.host,
        port: config.server.port
      });
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        logger.info('Received SIGINT, shutting down gracefully');
        process.exit(0);
      });
      
      process.on('SIGTERM', () => {
        logger.info('Received SIGTERM, shutting down gracefully');
        process.exit(0);
      });
    }

  } catch (error) {
    logger.error('Failed to start AEM Read Server', error as Error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  const logger = Logger.getInstance();
  logger.error('Unhandled promise rejection', reason as Error, { promise });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  const logger = Logger.getInstance();
  logger.error('Uncaught exception', error);
  process.exit(1);
});

main().catch((error) => {
  const logger = Logger.getInstance();
  logger.error('Fatal error in main', error);
  process.exit(1);
});