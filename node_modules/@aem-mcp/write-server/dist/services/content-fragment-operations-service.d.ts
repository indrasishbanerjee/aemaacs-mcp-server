/**
 * Content Fragment Operations Service for AEMaaCS write operations
 * Handles content fragment creation, updating, and deletion
 */
import { AEMHttpClient } from '../../../shared/src/client/aem-http-client.js';
import { AEMResponse } from '../../../shared/src/types/aem.js';
export interface CreateContentFragmentOptions {
    model: string;
    title: string;
    description?: string;
    elements?: Record<string, any>;
    tags?: string[];
    properties?: Record<string, any>;
}
export interface UpdateContentFragmentOptions {
    elements?: Record<string, any>;
    title?: string;
    description?: string;
    tags?: string[];
    properties?: Record<string, any>;
    merge?: boolean;
}
export interface DeleteContentFragmentOptions {
    force?: boolean;
    checkReferences?: boolean;
}
export interface ContentFragmentOperationResult {
    success: boolean;
    path?: string;
    message?: string;
    warnings?: string[];
    errors?: string[];
}
export interface ContentFragment {
    path: string;
    name: string;
    title?: string;
    description?: string;
    model: string;
    elements: Record<string, any>;
    tags?: string[];
    created?: Date;
    lastModified?: Date;
    createdBy?: string;
    lastModifiedBy?: string;
    properties: Record<string, any>;
}
export declare class ContentFragmentOperationsService {
    private client;
    private logger;
    constructor(client: AEMHttpClient);
    /**
     * Create content fragment using /api/assets/
     */
    createContentFragment(parentPath: string, fragmentName: string, options: CreateContentFragmentOptions): Promise<AEMResponse<ContentFragmentOperationResult>>;
    /**
     * Update content fragment for element updates
     */
    updateContentFragment(fragmentPath: string, options: UpdateContentFragmentOptions): Promise<AEMResponse<ContentFragmentOperationResult>>;
    /**
     * Delete content fragment with safety checks
     */
    deleteContentFragment(fragmentPath: string, options?: DeleteContentFragmentOptions): Promise<AEMResponse<ContentFragmentOperationResult>>;
    /**
     * Parse content fragment operation response
     */
    private parseContentFragmentOperationResponse;
    /**
     * Format fragment elements for storage
     */
    private formatFragmentElements;
    /**
     * Validate fragment name
     */
    private isValidFragmentName;
    /**
     * Check if fragment is a system fragment that should not be deleted
     */
    private isSystemFragment;
}
//# sourceMappingURL=content-fragment-operations-service.d.ts.map