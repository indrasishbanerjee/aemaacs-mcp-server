"use strict";
/**
 * Replication Operations Service for AEMaaCS write operations
 * Handles content publishing, unpublishing, activation, and replication queue management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplicationOperationsService = void 0;
const logger_js_1 = require("../../../shared/src/utils/logger.js");
const errors_js_1 = require("../../../shared/src/utils/errors.js");
class ReplicationOperationsService {
    constructor(client) {
        this.client = client;
        this.logger = logger_js_1.Logger.getInstance();
    }
    /**
     * Publish content using /bin/replicate.json
     */
    async publishContent(contentPath, options = {}) {
        try {
            this.logger.debug('Publishing content', { contentPath, options });
            if (!contentPath) {
                throw new errors_js_1.AEMException('Content path is required', 'VALIDATION_ERROR', false);
            }
            const formData = new FormData();
            formData.append('path', contentPath);
            formData.append('cmd', 'activate');
            if (options.deep !== undefined) {
                formData.append('deep', options.deep.toString());
            }
            if (options.onlyModified !== undefined) {
                formData.append('onlyModified', options.onlyModified.toString());
            }
            if (options.onlyActivated !== undefined) {
                formData.append('onlyActivated', options.onlyActivated.toString());
            }
            if (options.ignoreDeactivated !== undefined) {
                formData.append('ignoreDeactivated', options.ignoreDeactivated.toString());
            }
            if (options.force !== undefined) {
                formData.append('force', options.force.toString());
            }
            if (options.synchronous !== undefined) {
                formData.append('synchronous', options.synchronous.toString());
            }
            const requestOptions = {
                context: {
                    operation: 'publishContent',
                    resource: contentPath
                }
            };
            const response = await this.client.post('/bin/replicate.json', formData, requestOptions);
            if (!response.success) {
                throw new errors_js_1.AEMException(`Failed to publish content: ${contentPath}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const result = this.parsePublishResponse(response.data, contentPath, 'publish');
            this.logger.debug('Successfully published content', {
                contentPath,
                publishedPaths: result.publishedPaths?.length || 0,
                skippedPaths: result.skippedPaths?.length || 0,
                failedPaths: result.failedPaths?.length || 0
            });
            return {
                success: true,
                data: result,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to publish content', error, { contentPath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while publishing content: ${contentPath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, contentPath });
        }
    }
    /**
     * Unpublish content with tree support
     */
    async unpublishContent(contentPath, options = {}) {
        try {
            this.logger.debug('Unpublishing content', { contentPath, options });
            if (!contentPath) {
                throw new errors_js_1.AEMException('Content path is required', 'VALIDATION_ERROR', false);
            }
            const formData = new FormData();
            formData.append('path', contentPath);
            formData.append('cmd', 'deactivate');
            if (options.deep !== undefined) {
                formData.append('deep', options.deep.toString());
            }
            if (options.force !== undefined) {
                formData.append('force', options.force.toString());
            }
            if (options.synchronous !== undefined) {
                formData.append('synchronous', options.synchronous.toString());
            }
            const requestOptions = {
                context: {
                    operation: 'unpublishContent',
                    resource: contentPath
                }
            };
            const response = await this.client.post('/bin/replicate.json', formData, requestOptions);
            if (!response.success) {
                throw new errors_js_1.AEMException(`Failed to unpublish content: ${contentPath}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const result = this.parsePublishResponse(response.data, contentPath, 'unpublish');
            this.logger.debug('Successfully unpublished content', {
                contentPath,
                publishedPaths: result.publishedPaths?.length || 0,
                skippedPaths: result.skippedPaths?.length || 0,
                failedPaths: result.failedPaths?.length || 0
            });
            return {
                success: true,
                data: result,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to unpublish content', error, { contentPath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while unpublishing content: ${contentPath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, contentPath });
        }
    }
    /**
     * Activate page (legacy method for backward compatibility)
     */
    async activatePage(pagePath, options = {}) {
        try {
            this.logger.debug('Activating page', { pagePath, options });
            if (!pagePath) {
                throw new errors_js_1.AEMException('Page path is required', 'VALIDATION_ERROR', false);
            }
            const formData = new FormData();
            formData.append('path', pagePath);
            formData.append('cmd', 'activate');
            if (options.deep !== undefined) {
                formData.append('deep', options.deep.toString());
            }
            if (options.force !== undefined) {
                formData.append('force', options.force.toString());
            }
            const requestOptions = {
                context: {
                    operation: 'activatePage',
                    resource: pagePath
                }
            };
            const response = await this.client.post('/etc/replication/agents.author/publish/jcr:content.queue.json', formData, requestOptions);
            if (!response.success) {
                throw new errors_js_1.AEMException(`Failed to activate page: ${pagePath}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const result = {
                success: true,
                path: pagePath,
                action: 'activate',
                status: 'activated',
                message: `Page ${pagePath} activated successfully`
            };
            this.logger.debug('Successfully activated page', { pagePath });
            return {
                success: true,
                data: result,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to activate page', error, { pagePath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while activating page: ${pagePath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, pagePath });
        }
    }
    /**
     * Deactivate page (legacy method for backward compatibility)
     */
    async deactivatePage(pagePath, options = {}) {
        try {
            this.logger.debug('Deactivating page', { pagePath, options });
            if (!pagePath) {
                throw new errors_js_1.AEMException('Page path is required', 'VALIDATION_ERROR', false);
            }
            const formData = new FormData();
            formData.append('path', pagePath);
            formData.append('cmd', 'deactivate');
            if (options.deep !== undefined) {
                formData.append('deep', options.deep.toString());
            }
            if (options.force !== undefined) {
                formData.append('force', options.force.toString());
            }
            const requestOptions = {
                context: {
                    operation: 'deactivatePage',
                    resource: pagePath
                }
            };
            const response = await this.client.post('/etc/replication/agents.author/publish/jcr:content.queue.json', formData, requestOptions);
            if (!response.success) {
                throw new errors_js_1.AEMException(`Failed to deactivate page: ${pagePath}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const result = {
                success: true,
                path: pagePath,
                action: 'deactivate',
                status: 'deactivated',
                message: `Page ${pagePath} deactivated successfully`
            };
            this.logger.debug('Successfully deactivated page', { pagePath });
            return {
                success: true,
                data: result,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to deactivate page', error, { pagePath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while deactivating page: ${pagePath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, pagePath });
        }
    }
    /**
     * Trigger publish workflow for workflow-based publishing
     */
    async triggerPublishWorkflow(contentPath, options = {}) {
        try {
            this.logger.debug('Triggering publish workflow', { contentPath, options });
            if (!contentPath) {
                throw new errors_js_1.AEMException('Content path is required', 'VALIDATION_ERROR', false);
            }
            const workflowModel = options.model || '/var/workflow/models/publish_to_publish';
            const formData = new FormData();
            formData.append('model', workflowModel);
            formData.append('payloadType', options.payloadType || 'JCR_PATH');
            formData.append('payload', options.payload || contentPath);
            if (options.title) {
                formData.append('workflowTitle', options.title);
            }
            if (options.comment) {
                formData.append('workflowComment', options.comment);
            }
            if (options.initiator) {
                formData.append('initiator', options.initiator);
            }
            const requestOptions = {
                context: {
                    operation: 'triggerPublishWorkflow',
                    resource: contentPath
                }
            };
            const response = await this.client.post('/etc/workflow/instances', formData, requestOptions);
            if (!response.success) {
                throw new errors_js_1.AEMException(`Failed to trigger publish workflow for: ${contentPath}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const result = {
                success: true,
                path: contentPath,
                action: 'workflow',
                workflowId: response.data?.id || response.data?.workflowId,
                workflowModel,
                workflowStatus: 'RUNNING',
                message: `Publish workflow triggered for ${contentPath}`
            };
            this.logger.debug('Successfully triggered publish workflow', {
                contentPath,
                workflowId: result.workflowId,
                workflowModel
            });
            return {
                success: true,
                data: result,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to trigger publish workflow', error, { contentPath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while triggering publish workflow for: ${contentPath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, contentPath });
        }
    }
    /**
     * Trigger custom workflow for custom workflows
     */
    async triggerCustomWorkflow(workflowModel, payload, options = {}) {
        try {
            this.logger.debug('Triggering custom workflow', { workflowModel, payload, options });
            if (!workflowModel || !payload) {
                throw new errors_js_1.AEMException('Workflow model and payload are required', 'VALIDATION_ERROR', false);
            }
            const formData = new FormData();
            formData.append('model', workflowModel);
            formData.append('payloadType', options.payloadType || 'JCR_PATH');
            formData.append('payload', payload);
            if (options.title) {
                formData.append('workflowTitle', options.title);
            }
            if (options.comment) {
                formData.append('workflowComment', options.comment);
            }
            if (options.initiator) {
                formData.append('initiator', options.initiator);
            }
            const requestOptions = {
                context: {
                    operation: 'triggerCustomWorkflow',
                    resource: payload
                }
            };
            const response = await this.client.post('/etc/workflow/instances', formData, requestOptions);
            if (!response.success) {
                throw new errors_js_1.AEMException(`Failed to trigger custom workflow: ${workflowModel}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const result = {
                success: true,
                path: payload,
                action: 'workflow',
                workflowId: response.data?.id || response.data?.workflowId,
                workflowModel,
                workflowStatus: 'RUNNING',
                message: `Custom workflow ${workflowModel} triggered for ${payload}`
            };
            this.logger.debug('Successfully triggered custom workflow', {
                workflowModel,
                payload,
                workflowId: result.workflowId
            });
            return {
                success: true,
                data: result,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to trigger custom workflow', error, { workflowModel, payload });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while triggering custom workflow: ${workflowModel}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, workflowModel, payload });
        }
    }
    /**
     * Clear replication queue
     */
    async clearReplicationQueue(agentName = 'publish', options = {}) {
        try {
            this.logger.debug('Clearing replication queue', { agentName, options });
            const formData = new FormData();
            formData.append('cmd', 'clear');
            if (options.force !== undefined) {
                formData.append('force', options.force.toString());
            }
            const requestOptions = {
                context: {
                    operation: 'clearReplicationQueue',
                    resource: agentName
                }
            };
            const response = await this.client.post(`/etc/replication/agents.author/${agentName}/jcr:content.queue.json`, formData, requestOptions);
            if (!response.success) {
                throw new errors_js_1.AEMException(`Failed to clear replication queue for agent: ${agentName}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const result = {
                success: true,
                action: 'clear',
                queueId: agentName,
                itemsCleared: response.data?.itemsCleared || response.data?.count || 0,
                message: `Replication queue cleared for agent ${agentName}`
            };
            this.logger.debug('Successfully cleared replication queue', {
                agentName,
                itemsCleared: result.itemsCleared
            });
            return {
                success: true,
                data: result,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to clear replication queue', error, { agentName });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while clearing replication queue for agent: ${agentName}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, agentName });
        }
    }
    /**
     * Delete specific queue item
     */
    async deleteQueueItem(agentName, itemId, options = {}) {
        try {
            this.logger.debug('Deleting queue item', { agentName, itemId, options });
            if (!agentName || !itemId) {
                throw new errors_js_1.AEMException('Agent name and item ID are required', 'VALIDATION_ERROR', false);
            }
            const formData = new FormData();
            formData.append('cmd', 'delete');
            formData.append('id', itemId);
            if (options.force !== undefined) {
                formData.append('force', options.force.toString());
            }
            const requestOptions = {
                context: {
                    operation: 'deleteQueueItem',
                    resource: `${agentName}/${itemId}`
                }
            };
            const response = await this.client.post(`/etc/replication/agents.author/${agentName}/jcr:content.queue.json`, formData, requestOptions);
            if (!response.success) {
                throw new errors_js_1.AEMException(`Failed to delete queue item ${itemId} from agent: ${agentName}`, 'SERVER_ERROR', true, undefined, { response });
            }
            const result = {
                success: true,
                action: 'delete',
                queueId: agentName,
                itemsDeleted: 1,
                message: `Queue item ${itemId} deleted from agent ${agentName}`
            };
            this.logger.debug('Successfully deleted queue item', { agentName, itemId });
            return {
                success: true,
                data: result,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to delete queue item', error, { agentName, itemId });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while deleting queue item ${itemId} from agent: ${agentName}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, agentName, itemId });
        }
    }
    /**
     * Parse publish/unpublish response
     */
    parsePublishResponse(data, path, action) {
        const publishedPaths = [];
        const skippedPaths = [];
        const failedPaths = [];
        // Parse response data structure
        if (data && data.results) {
            for (const result of data.results) {
                if (result.success) {
                    publishedPaths.push(result.path || path);
                }
                else if (result.skipped) {
                    skippedPaths.push(result.path || path);
                }
                else {
                    failedPaths.push(result.path || path);
                }
            }
        }
        else {
            // Simple success case
            publishedPaths.push(path);
        }
        return {
            success: Boolean(data?.success !== false),
            path,
            action,
            status: action === 'publish' ? 'published' : 'unpublished',
            publishedPaths,
            skippedPaths,
            failedPaths,
            message: data?.message || data?.msg || `Content ${action}ed successfully`,
            warnings: Array.isArray(data?.warnings) ? data.warnings : (data?.warning ? [data.warning] : []),
            errors: Array.isArray(data?.errors) ? data.errors : (data?.error ? [data.error] : [])
        };
    }
}
exports.ReplicationOperationsService = ReplicationOperationsService;
//# sourceMappingURL=replication-operations-service.js.map