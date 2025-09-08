"use strict";
/**
 * Workflow Operations Service for AEMaaCS write operations
 * Handles workflow starting, asset processing, and task completion
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowOperationsService = void 0;
const logger_js_1 = require("../../../shared/src/utils/logger.js");
const errors_js_1 = require("../../../shared/src/utils/errors.js");
class WorkflowOperationsService {
    constructor(client) {
        this.client = client;
        this.logger = logger_js_1.Logger.getInstance();
    }
    /**
     * Start workflow using /etc/workflow/instances
     */
    async startWorkflow(modelPath, payloadPath, options = {}) {
        try {
            this.logger.debug('Starting workflow', { modelPath, payloadPath, options });
            if (!modelPath || !payloadPath) {
                throw new errors_js_1.AEMException('Workflow model path and payload path are required', 'VALIDATION_ERROR', false);
            }
            const formData = new FormData();
            formData.append('model', modelPath);
            formData.append('payload', payloadPath);
            formData.append('payloadType', 'JCR_PATH');
            if (options.workflowTitle) {
                formData.append('workflowTitle', options.workflowTitle);
            }
            if (options.startComment) {
                formData.append('startComment', options.startComment);
            }
            // Add workflow data
            if (options.workflowData) {
                for (const [key, value] of Object.entries(options.workflowData)) {
                    formData.append(`workflowData.${key}`, value.toString());
                }
            }
            const requestOptions = {
                context: {
                    operation: 'startWorkflow',
                    resource: payloadPath
                }
            };
            const response = await this.client.post('/etc/workflow/instances', formData, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Failed to start workflow for: ${payloadPath}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const workflowInstance = this.parseWorkflowInstanceResponse(response.data, modelPath, payloadPath);
            this.logger.debug('Successfully started workflow', {
                modelPath,
                payloadPath,
                workflowId: workflowInstance.id
            });
            return {
                success: true,
                data: workflowInstance,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to start workflow', error, { modelPath, payloadPath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while starting workflow: ${modelPath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, modelPath, payloadPath });
        }
    }
    /**
     * Start publish workflow for content publishing
     */
    async startPublishWorkflow(contentPath, options = {}) {
        try {
            this.logger.debug('Starting publish workflow', { contentPath, options });
            if (!contentPath) {
                throw new errors_js_1.AEMException('Content path is required', 'VALIDATION_ERROR', false);
            }
            const modelPath = '/etc/workflow/models/publish-content-tree/jcr:content/model';
            const formData = new FormData();
            formData.append('model', modelPath);
            formData.append('payload', contentPath);
            formData.append('payloadType', 'JCR_PATH');
            const workflowTitle = options.workflowTitle || `Publish Content Tree - ${contentPath}`;
            formData.append('workflowTitle', workflowTitle);
            if (options.startComment) {
                formData.append('startComment', options.startComment);
            }
            // Add publish-specific workflow data
            if (options.replicateAsTree !== undefined) {
                formData.append('workflowData.replicateAsTree', options.replicateAsTree.toString());
            }
            if (options.activateTree !== undefined) {
                formData.append('workflowData.activateTree', options.activateTree.toString());
            }
            if (options.ignoreDeactivated !== undefined) {
                formData.append('workflowData.ignoreDeactivated', options.ignoreDeactivated.toString());
            }
            const requestOptions = {
                context: {
                    operation: 'startPublishWorkflow',
                    resource: contentPath
                }
            };
            const response = await this.client.post('/etc/workflow/instances', formData, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Failed to start publish workflow for: ${contentPath}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const workflowInstance = this.parseWorkflowInstanceResponse(response.data, modelPath, contentPath);
            this.logger.debug('Successfully started publish workflow', {
                contentPath,
                workflowId: workflowInstance.id
            });
            return {
                success: true,
                data: workflowInstance,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to start publish workflow', error, { contentPath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while starting publish workflow: ${contentPath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, contentPath });
        }
    }
    /**
     * Process assets for asset workflow processing
     */
    async processAssets(folderPath, options = {}) {
        try {
            this.logger.debug('Processing assets', { folderPath, options });
            if (!folderPath) {
                throw new errors_js_1.AEMException('Folder path is required', 'VALIDATION_ERROR', false);
            }
            // Validate folder path is in DAM
            if (!folderPath.startsWith('/content/dam/')) {
                throw new errors_js_1.AEMException('Asset processing folder path must be in DAM (/content/dam/)', 'VALIDATION_ERROR', false);
            }
            const formData = new FormData();
            formData.append('folderPath', folderPath);
            if (options.profile) {
                formData.append('profile', options.profile);
            }
            else {
                formData.append('profile', 'dam-update-asset'); // Default processing profile
            }
            if (options.async !== undefined) {
                formData.append('async', options.async.toString());
            }
            else {
                formData.append('async', 'true'); // Default to async processing
            }
            if (options.batchSize) {
                formData.append('batchSize', options.batchSize.toString());
            }
            const requestOptions = {
                context: {
                    operation: 'processAssets',
                    resource: folderPath
                }
            };
            const response = await this.client.post('/bin/asynccommand', formData, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Failed to process assets in: ${folderPath}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const processResult = this.parseProcessAssetsResponse(response.data, folderPath);
            this.logger.debug('Successfully initiated asset processing', {
                folderPath,
                jobId: processResult.jobId,
                status: processResult.status
            });
            // If wait option is true and processing is async, poll for completion
            if (options.wait && options.async !== false && processResult.jobId) {
                await this.waitForAssetProcessingCompletion(processResult.jobId);
                processResult.status = 'COMPLETED';
            }
            return {
                success: true,
                data: processResult,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to process assets', error, { folderPath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while processing assets: ${folderPath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, folderPath });
        }
    }
    /**
     * Complete workflow task for task completion
     */
    async completeWorkflowTask(taskId, action, options = {}) {
        try {
            this.logger.debug('Completing workflow task', { taskId, action, options });
            if (!taskId || !action) {
                throw new errors_js_1.AEMException('Task ID and action are required', 'VALIDATION_ERROR', false);
            }
            const formData = new FormData();
            formData.append('item', taskId);
            formData.append('action', action);
            if (options.comment) {
                formData.append('comment', options.comment);
            }
            // Add workflow data
            if (options.workflowData) {
                for (const [key, value] of Object.entries(options.workflowData)) {
                    formData.append(`workflowData.${key}`, value.toString());
                }
            }
            const requestOptions = {
                context: {
                    operation: 'completeWorkflowTask',
                    resource: taskId
                }
            };
            const response = await this.client.post('/libs/granite/taskmanager/updatetask', formData, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Failed to complete workflow task: ${taskId}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const taskResult = this.parseTaskCompletionResponse(response.data, taskId, action);
            this.logger.debug('Successfully completed workflow task', {
                taskId,
                action,
                success: taskResult.success
            });
            return {
                success: true,
                data: taskResult,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to complete workflow task', error, { taskId, action });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while completing workflow task: ${taskId}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, taskId, action });
        }
    }
    /**
     * Parse workflow instance response
     */
    parseWorkflowInstanceResponse(data, modelPath, payloadPath) {
        return {
            id: data.id || data.workflowId || '',
            title: data.title || data.workflowTitle,
            model: data.model || modelPath,
            payload: data.payload || payloadPath,
            payloadType: data.payloadType || 'JCR_PATH',
            initiator: data.initiator || data.userId,
            status: this.mapWorkflowStatus(data.status),
            startTime: data.startTime ? new Date(data.startTime) : new Date(),
            endTime: data.endTime ? new Date(data.endTime) : undefined,
            comment: data.comment || data.startComment,
            workflowData: data.workflowData || {}
        };
    }
    /**
     * Parse process assets response
     */
    parseProcessAssetsResponse(data, folderPath) {
        return {
            success: Boolean(data.success !== false),
            jobId: data.jobId || data.id,
            status: this.mapProcessStatus(data.status),
            processedItems: data.processedItems ? parseInt(data.processedItems) : undefined,
            totalItems: data.totalItems ? parseInt(data.totalItems) : undefined,
            errors: Array.isArray(data.errors) ? data.errors : (data.error ? [data.error] : []),
            warnings: Array.isArray(data.warnings) ? data.warnings : (data.warning ? [data.warning] : [])
        };
    }
    /**
     * Parse task completion response
     */
    parseTaskCompletionResponse(data, taskId, action) {
        const nextTasks = [];
        if (data.nextTasks && Array.isArray(data.nextTasks)) {
            for (const task of data.nextTasks) {
                nextTasks.push({
                    id: task.id || '',
                    workflowId: task.workflowId || '',
                    title: task.title,
                    description: task.description,
                    assignee: task.assignee,
                    status: this.mapTaskStatus(task.status),
                    created: task.created ? new Date(task.created) : undefined,
                    completed: task.completed ? new Date(task.completed) : undefined,
                    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
                    priority: parseInt(task.priority) || 0,
                    formResourcePath: task.formResourcePath,
                    taskData: task.taskData || {}
                });
            }
        }
        return {
            success: Boolean(data.success !== false),
            taskId,
            action,
            message: data.message || data.msg,
            nextTasks: nextTasks.length > 0 ? nextTasks : undefined
        };
    }
    /**
     * Map workflow status string to enum
     */
    mapWorkflowStatus(status) {
        if (!status)
            return 'RUNNING';
        const statusUpper = status.toUpperCase();
        if (statusUpper === 'COMPLETED' || statusUpper === 'FINISHED')
            return 'COMPLETED';
        if (statusUpper === 'ABORTED' || statusUpper === 'CANCELLED')
            return 'ABORTED';
        if (statusUpper === 'SUSPENDED' || statusUpper === 'PAUSED')
            return 'SUSPENDED';
        return 'RUNNING';
    }
    /**
     * Map process status string to enum
     */
    mapProcessStatus(status) {
        if (!status)
            return 'INITIATED';
        const statusUpper = status.toUpperCase();
        if (statusUpper === 'RUNNING' || statusUpper === 'PROCESSING')
            return 'RUNNING';
        if (statusUpper === 'COMPLETED' || statusUpper === 'FINISHED')
            return 'COMPLETED';
        if (statusUpper === 'FAILED' || statusUpper === 'ERROR')
            return 'FAILED';
        return 'INITIATED';
    }
    /**
     * Map task status string to enum
     */
    mapTaskStatus(status) {
        if (!status)
            return 'ACTIVE';
        const statusUpper = status.toUpperCase();
        if (statusUpper === 'COMPLETED' || statusUpper === 'FINISHED')
            return 'COMPLETED';
        if (statusUpper === 'TERMINATED' || statusUpper === 'CANCELLED')
            return 'TERMINATED';
        return 'ACTIVE';
    }
    /**
     * Wait for asset processing completion
     */
    async waitForAssetProcessingCompletion(jobId, maxAttempts = 30, delayMs = 2000) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                const response = await this.client.get(`/bin/asynccommand?optype=GETSTATUS&jobid=${jobId}`);
                if (response.success && response.data) {
                    const status = this.mapProcessStatus(response.data.status);
                    if (status === 'COMPLETED' || status === 'FAILED') {
                        return; // Processing complete
                    }
                }
            }
            catch (error) {
                this.logger.warn('Error checking asset processing status', error, { jobId });
            }
            // Wait before next check
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        this.logger.warn(`Asset processing timed out after ${maxAttempts} attempts`, { jobId });
    }
}
exports.WorkflowOperationsService = WorkflowOperationsService;
//# sourceMappingURL=workflow-operations-service.js.map