/**
 * Replication Operations Service for AEMaaCS write operations
 * Handles content publishing, unpublishing, activation, and replication queue management
 */
import { AEMHttpClient } from '../../../shared/src/client/aem-http-client.js';
import { AEMResponse } from '../../../shared/src/types/aem.js';
export interface PublishOptions {
    deep?: boolean;
    onlyModified?: boolean;
    onlyActivated?: boolean;
    ignoreDeactivated?: boolean;
    force?: boolean;
    synchronous?: boolean;
}
export interface UnpublishOptions {
    deep?: boolean;
    force?: boolean;
    synchronous?: boolean;
}
export interface WorkflowOptions {
    model?: string;
    payload?: string;
    payloadType?: 'JCR_PATH' | 'JCR_UUID';
    title?: string;
    comment?: string;
    initiator?: string;
}
export interface QueueOptions {
    agent?: string;
    force?: boolean;
}
export interface ReplicationResult {
    success: boolean;
    path?: string;
    action?: string;
    status?: string;
    message?: string;
    warnings?: string[];
    errors?: string[];
}
export interface PublishResult extends ReplicationResult {
    publishedPaths?: string[];
    skippedPaths?: string[];
    failedPaths?: string[];
}
export interface WorkflowResult extends ReplicationResult {
    workflowId?: string;
    workflowModel?: string;
    workflowStatus?: string;
}
export interface QueueResult extends ReplicationResult {
    queueId?: string;
    itemsCleared?: number;
    itemsDeleted?: number;
}
export declare class ReplicationOperationsService {
    private client;
    private logger;
    constructor(client: AEMHttpClient);
    /**
     * Publish content using /bin/replicate.json
     */
    publishContent(contentPath: string, options?: PublishOptions): Promise<AEMResponse<PublishResult>>;
    /**
     * Unpublish content with tree support
     */
    unpublishContent(contentPath: string, options?: UnpublishOptions): Promise<AEMResponse<PublishResult>>;
    /**
     * Activate page (legacy method for backward compatibility)
     */
    activatePage(pagePath: string, options?: PublishOptions): Promise<AEMResponse<ReplicationResult>>;
    /**
     * Deactivate page (legacy method for backward compatibility)
     */
    deactivatePage(pagePath: string, options?: UnpublishOptions): Promise<AEMResponse<ReplicationResult>>;
    /**
     * Trigger publish workflow for workflow-based publishing
     */
    triggerPublishWorkflow(contentPath: string, options?: WorkflowOptions): Promise<AEMResponse<WorkflowResult>>;
    /**
     * Trigger custom workflow for custom workflows
     */
    triggerCustomWorkflow(workflowModel: string, payload: string, options?: Omit<WorkflowOptions, 'model' | 'payload'>): Promise<AEMResponse<WorkflowResult>>;
    /**
     * Clear replication queue
     */
    clearReplicationQueue(agentName?: string, options?: QueueOptions): Promise<AEMResponse<QueueResult>>;
    /**
     * Delete specific queue item
     */
    deleteQueueItem(agentName: string, itemId: string, options?: QueueOptions): Promise<AEMResponse<QueueResult>>;
    /**
     * Parse publish/unpublish response
     */
    private parsePublishResponse;
}
//# sourceMappingURL=replication-operations-service.d.ts.map