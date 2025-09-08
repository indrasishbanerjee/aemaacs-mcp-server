/**
 * Workflow Operations Service for AEMaaCS write operations
 * Handles workflow starting, asset processing, and task completion
 */
import { AEMHttpClient } from '../../../shared/src/client/aem-http-client.js';
import { AEMResponse } from '../../../shared/src/types/aem.js';
export interface StartWorkflowOptions {
    workflowTitle?: string;
    startComment?: string;
    workflowData?: Record<string, any>;
}
export interface StartPublishWorkflowOptions {
    workflowTitle?: string;
    startComment?: string;
    replicateAsTree?: boolean;
    activateTree?: boolean;
    ignoreDeactivated?: boolean;
}
export interface ProcessAssetsOptions {
    profile?: string;
    async?: boolean;
    wait?: boolean;
    batchSize?: number;
}
export interface CompleteWorkflowTaskOptions {
    comment?: string;
    workflowData?: Record<string, any>;
}
export interface WorkflowInstance {
    id: string;
    title?: string;
    model: string;
    payload: string;
    payloadType: string;
    initiator?: string;
    status: 'RUNNING' | 'COMPLETED' | 'ABORTED' | 'SUSPENDED';
    startTime?: Date;
    endTime?: Date;
    comment?: string;
    workflowData?: Record<string, any>;
}
export interface WorkflowTask {
    id: string;
    workflowId: string;
    title?: string;
    description?: string;
    assignee?: string;
    status: 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
    created?: Date;
    completed?: Date;
    dueDate?: Date;
    priority: number;
    formResourcePath?: string;
    taskData?: Record<string, any>;
}
export interface ProcessResult {
    success: boolean;
    jobId?: string;
    status: 'INITIATED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
    processedItems?: number;
    totalItems?: number;
    errors?: string[];
    warnings?: string[];
}
export interface TaskResult {
    success: boolean;
    taskId: string;
    action: string;
    message?: string;
    nextTasks?: WorkflowTask[];
}
export declare class WorkflowOperationsService {
    private client;
    private logger;
    constructor(client: AEMHttpClient);
    /**
     * Start workflow using /etc/workflow/instances
     */
    startWorkflow(modelPath: string, payloadPath: string, options?: StartWorkflowOptions): Promise<AEMResponse<WorkflowInstance>>;
    /**
     * Start publish workflow for content publishing
     */
    startPublishWorkflow(contentPath: string, options?: StartPublishWorkflowOptions): Promise<AEMResponse<WorkflowInstance>>;
    /**
     * Process assets for asset workflow processing
     */
    processAssets(folderPath: string, options?: ProcessAssetsOptions): Promise<AEMResponse<ProcessResult>>;
    /**
     * Complete workflow task for task completion
     */
    completeWorkflowTask(taskId: string, action: string, options?: CompleteWorkflowTaskOptions): Promise<AEMResponse<TaskResult>>;
    /**
     * Parse workflow instance response
     */
    private parseWorkflowInstanceResponse;
    /**
     * Parse process assets response
     */
    private parseProcessAssetsResponse;
    /**
     * Parse task completion response
     */
    private parseTaskCompletionResponse;
    /**
     * Map workflow status string to enum
     */
    private mapWorkflowStatus;
    /**
     * Map process status string to enum
     */
    private mapProcessStatus;
    /**
     * Map task status string to enum
     */
    private mapTaskStatus;
    /**
     * Wait for asset processing completion
     */
    private waitForAssetProcessingCompletion;
}
//# sourceMappingURL=workflow-operations-service.d.ts.map