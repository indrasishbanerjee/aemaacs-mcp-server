/**
 * STDIO Protocol Handler for MCP Communication
 * Handles MCP protocol over STDIO for read server
 */
import { AEMHttpClient } from '../../../shared/src/client/aem-http-client.js';
export interface MCPMessage {
    jsonrpc: '2.0';
    id?: string | number;
    method?: string;
    params?: any;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}
export declare class STDIOHandler {
    private logger;
    private mcpHandler;
    private running;
    constructor(client: AEMHttpClient);
    /**
     * Start STDIO handler
     */
    start(): void;
    /**
     * Stop STDIO handler
     */
    stop(): void;
    /**
     * Handle input from STDIN
     */
    private handleInput;
    /**
     * Process individual message
     */
    private processMessage;
    /**
     * Handle method calls
     */
    private handleMethodCall;
    /**
     * Handle initialize request
     */
    private handleInitialize;
    /**
     * Handle tools/list request
     */
    private handleToolsList;
    /**
     * Handle tools/call request
     */
    private handleToolsCall;
    /**
     * Send response message
     */
    private sendResponse;
    /**
     * Send error response
     */
    private sendErrorResponse;
    /**
     * Send message to STDOUT
     */
    private sendMessage;
    /**
     * Handle STDIN end
     */
    private handleEnd;
    /**
     * Handle STDIN error
     */
    private handleError;
}
//# sourceMappingURL=stdio-handler.d.ts.map