/**
 * Response processing utilities for AEMaaCS operations
 */
import { AEMResponse } from '../types/aem.js';
import { MCPResponse, MCPContent } from '../types/mcp.js';
import { AEMException } from './errors.js';
export interface ResponseProcessorOptions {
    includeMetadata?: boolean;
    sanitizeOutput?: boolean;
    formatForMCP?: boolean;
}
export declare class ResponseProcessor {
    private logger;
    constructor();
    /**
     * Process successful AEM response
     */
    processSuccess<T>(data: T, requestId?: string, duration?: number, cached?: boolean, options?: ResponseProcessorOptions): AEMResponse<T>;
    /**
     * Process error response
     */
    processError(error: Error | AEMException, requestId?: string, duration?: number, options?: ResponseProcessorOptions): AEMResponse<null>;
    /**
     * Convert AEM response to MCP response
     */
    toMCPResponse<T>(aemResponse: AEMResponse<T>, id: string | number, formatContent?: (data: T) => MCPContent[]): MCPResponse<any>;
    /**
     * Process AEMaaCS-specific response formats
     */
    processAEMResponse(rawResponse: any, operation: string): any;
    /**
     * Sanitize output data
     */
    private sanitizeOutput;
    /**
     * Check if key contains sensitive information
     */
    private isSensitiveKey;
    /**
     * Check if response indicates an AEM error
     */
    private isAEMErrorResponse;
    /**
     * Create AEMException from AEM error response
     */
    private createAEMExceptionFromResponse;
    /**
     * Map AEM error codes to internal error types
     */
    private mapAEMErrorCode;
    /**
     * Determine if error is recoverable
     */
    private isRecoverableError;
    /**
     * Get JSON-RPC error code from AEM error code
     */
    private getJSONRPCErrorCode;
    /**
     * Process package manager response
     */
    private processPackageResponse;
    /**
     * Process query builder response
     */
    private processQueryBuilderResponse;
    /**
     * Process workflow response
     */
    private processWorkflowResponse;
    /**
     * Process replication response
     */
    private processReplicationResponse;
}
/**
 * Global response processor instance
 */
export declare const responseProcessor: ResponseProcessor;
//# sourceMappingURL=response-processor.d.ts.map