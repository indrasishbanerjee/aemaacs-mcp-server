#!/usr/bin/env node
"use strict";
/**
 * AEM Read Server Entry Point
 * Supports both MCP protocol over STDIO and HTTP REST API
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const aem_http_client_js_1 = require("../../shared/src/client/aem-http-client.js");
const server_config_js_1 = require("../../shared/src/config/server-config.js");
const logger_js_1 = require("../../shared/src/utils/logger.js");
const stdio_handler_js_1 = require("./mcp/stdio-handler.js");
async function main() {
    const logger = logger_js_1.Logger.getInstance();
    try {
        // Load configuration
        const configManager = server_config_js_1.ConfigManager.getInstance();
        const config = configManager.loadReadServerConfig();
        logger.info('Starting AEM Read Server', {
            mode: process.argv.includes('--stdio') ? 'MCP/STDIO' : 'HTTP',
            aemHost: config.aem.host
        });
        // Initialize AEM HTTP client
        const client = new aem_http_client_js_1.AEMHttpClient({
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
            const stdioHandler = new stdio_handler_js_1.STDIOHandler(client);
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
        }
        else {
            // HTTP mode
            logger.info('Starting in HTTP mode');
            const { HTTPHandler } = await Promise.resolve().then(() => __importStar(require('./http/http-handler.js')));
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
    }
    catch (error) {
        logger.error('Failed to start AEM Read Server', error);
        process.exit(1);
    }
}
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    const logger = logger_js_1.Logger.getInstance();
    logger.error('Unhandled promise rejection', reason, { promise });
    process.exit(1);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    const logger = logger_js_1.Logger.getInstance();
    logger.error('Uncaught exception', error);
    process.exit(1);
});
main().catch((error) => {
    const logger = logger_js_1.Logger.getInstance();
    logger.error('Fatal error in main', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map