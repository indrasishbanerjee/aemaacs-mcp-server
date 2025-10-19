/**
 * Replication Operations Service for AEMaaCS write operations
 * Handles content publishing, unpublishing, activation, and replication queue management
 */

import { AEMHttpClient, RequestOptions } from '../../../shared/src/client/aem-http-client.js';
import { AEMResponse } from '../../../shared/src/types/aem.js';
import { Logger } from '../../../shared/src/utils/logger.js';
import { AEMException } from '../../../shared/src/utils/errors.js';

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

export interface ReplicationQueueStatus {
  agentName: string;
  queueSize: number;
  pendingItems: number;
  failedItems: number;
  lastProcessed?: Date;
  status: 'active' | 'inactive' | 'error';
  errors?: string[];
}

export interface ReplicationAgent {
  name: string;
  title: string;
  type: 'publish' | 'reverse' | 'flush' | 'distribution';
  status: 'active' | 'inactive' | 'error';
  enabled: boolean;
  uri?: string;
  userId?: string;
  logLevel?: string;
  retryDelay?: number;
  serializationType?: string;
  queueProcessingEnabled?: boolean;
  queueMaxParallelJobs?: number;
  queueBatchSize?: number;
  queueBatchWaitTime?: number;
  lastModified?: Date;
}

export interface ScheduledPublishOptions {
  scheduleDate: Date;
  timezone?: string;
  deep?: boolean;
  onlyModified?: boolean;
  onlyActivated?: boolean;
  ignoreDeactivated?: boolean;
  force?: boolean;
  workflowModel?: string;
  comment?: string;
  initiator?: string;
}

export interface ScheduledPublishJob {
  id: string;
  contentPath: string;
  scheduleDate: Date;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  createdBy: string;
  createdAt: Date;
  lastModified: Date;
  options: ScheduledPublishOptions;
  result?: PublishResult;
  error?: string;
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

export class ReplicationOperationsService {
  private client: AEMHttpClient;
  private logger: Logger;

  constructor(client: AEMHttpClient) {
    this.client = client;
    this.logger = Logger.getInstance();
  }

  /**
   * Publish content using /bin/replicate.json
   */
  async publishContent(
    contentPath: string,
    options: PublishOptions = {}
  ): Promise<AEMResponse<PublishResult>> {
    try {
      this.logger.debug('Publishing content', { contentPath, options });

      if (!contentPath) {
        throw new AEMException(
          'Content path is required',
          'VALIDATION_ERROR',
          false
        );
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

      const requestOptions: RequestOptions = {
        context: {
          operation: 'publishContent',
          resource: contentPath
        }
      };

      const response = await this.client.post<any>(
        '/bin/replicate.json',
        formData as any,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to publish content: ${contentPath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
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

    } catch (error) {
      this.logger.error('Failed to publish content', error as Error, { contentPath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while publishing content: ${contentPath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, contentPath }
      );
    }
  }

  /**
   * Unpublish content with tree support
   */
  async unpublishContent(
    contentPath: string,
    options: UnpublishOptions = {}
  ): Promise<AEMResponse<PublishResult>> {
    try {
      this.logger.debug('Unpublishing content', { contentPath, options });

      if (!contentPath) {
        throw new AEMException(
          'Content path is required',
          'VALIDATION_ERROR',
          false
        );
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

      const requestOptions: RequestOptions = {
        context: {
          operation: 'unpublishContent',
          resource: contentPath
        }
      };

      const response = await this.client.post<any>(
        '/bin/replicate.json',
        formData as any,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to unpublish content: ${contentPath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
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

    } catch (error) {
      this.logger.error('Failed to unpublish content', error as Error, { contentPath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while unpublishing content: ${contentPath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, contentPath }
      );
    }
  }

  /**
   * Activate page (legacy method for backward compatibility)
   */
  async activatePage(
    pagePath: string,
    options: PublishOptions = {}
  ): Promise<AEMResponse<ReplicationResult>> {
    try {
      this.logger.debug('Activating page', { pagePath, options });

      if (!pagePath) {
        throw new AEMException(
          'Page path is required',
          'VALIDATION_ERROR',
          false
        );
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

      const requestOptions: RequestOptions = {
        context: {
          operation: 'activatePage',
          resource: pagePath
        }
      };

      const response = await this.client.post<any>(
        '/etc/replication/agents.author/publish/jcr:content.queue.json',
        formData as any,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to activate page: ${pagePath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result: ReplicationResult = {
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

    } catch (error) {
      this.logger.error('Failed to activate page', error as Error, { pagePath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while activating page: ${pagePath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, pagePath }
      );
    }
  }

  /**
   * Deactivate page (legacy method for backward compatibility)
   */
  async deactivatePage(
    pagePath: string,
    options: UnpublishOptions = {}
  ): Promise<AEMResponse<ReplicationResult>> {
    try {
      this.logger.debug('Deactivating page', { pagePath, options });

      if (!pagePath) {
        throw new AEMException(
          'Page path is required',
          'VALIDATION_ERROR',
          false
        );
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

      const requestOptions: RequestOptions = {
        context: {
          operation: 'deactivatePage',
          resource: pagePath
        }
      };

      const response = await this.client.post<any>(
        '/etc/replication/agents.author/publish/jcr:content.queue.json',
        formData as any,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to deactivate page: ${pagePath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result: ReplicationResult = {
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

    } catch (error) {
      this.logger.error('Failed to deactivate page', error as Error, { pagePath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while deactivating page: ${pagePath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, pagePath }
      );
    }
  }

  /**
   * Trigger publish workflow for workflow-based publishing
   */
  async triggerPublishWorkflow(
    contentPath: string,
    options: WorkflowOptions = {}
  ): Promise<AEMResponse<WorkflowResult>> {
    try {
      this.logger.debug('Triggering publish workflow', { contentPath, options });

      if (!contentPath) {
        throw new AEMException(
          'Content path is required',
          'VALIDATION_ERROR',
          false
        );
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

      const requestOptions: RequestOptions = {
        context: {
          operation: 'triggerPublishWorkflow',
          resource: contentPath
        }
      };

      const response = await this.client.post<any>(
        '/etc/workflow/instances',
        formData as any,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to trigger publish workflow for: ${contentPath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result: WorkflowResult = {
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

    } catch (error) {
      this.logger.error('Failed to trigger publish workflow', error as Error, { contentPath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while triggering publish workflow for: ${contentPath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, contentPath }
      );
    }
  }

  /**
   * Trigger custom workflow for custom workflows
   */
  async triggerCustomWorkflow(
    workflowModel: string,
    payload: string,
    options: Omit<WorkflowOptions, 'model' | 'payload'> = {}
  ): Promise<AEMResponse<WorkflowResult>> {
    try {
      this.logger.debug('Triggering custom workflow', { workflowModel, payload, options });

      if (!workflowModel || !payload) {
        throw new AEMException(
          'Workflow model and payload are required',
          'VALIDATION_ERROR',
          false
        );
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

      const requestOptions: RequestOptions = {
        context: {
          operation: 'triggerCustomWorkflow',
          resource: payload
        }
      };

      const response = await this.client.post<any>(
        '/etc/workflow/instances',
        formData as any,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to trigger custom workflow: ${workflowModel}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result: WorkflowResult = {
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

    } catch (error) {
      this.logger.error('Failed to trigger custom workflow', error as Error, { workflowModel, payload });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while triggering custom workflow: ${workflowModel}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, workflowModel, payload }
      );
    }
  }

  /**
   * Clear replication queue
   */
  async clearReplicationQueue(
    agentName: string = 'publish',
    options: QueueOptions = {}
  ): Promise<AEMResponse<QueueResult>> {
    try {
      this.logger.debug('Clearing replication queue', { agentName, options });

      const formData = new FormData();
      formData.append('cmd', 'clear');
      
      if (options.force !== undefined) {
        formData.append('force', options.force.toString());
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'clearReplicationQueue',
          resource: agentName
        }
      };

      const response = await this.client.post<any>(
        `/etc/replication/agents.author/${agentName}/jcr:content.queue.json`,
        formData as any,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to clear replication queue for agent: ${agentName}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result: QueueResult = {
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

    } catch (error) {
      this.logger.error('Failed to clear replication queue', error as Error, { agentName });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while clearing replication queue for agent: ${agentName}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, agentName }
      );
    }
  }

  /**
   * Delete specific queue item
   */
  async deleteQueueItem(
    agentName: string,
    itemId: string,
    options: QueueOptions = {}
  ): Promise<AEMResponse<QueueResult>> {
    try {
      this.logger.debug('Deleting queue item', { agentName, itemId, options });

      if (!agentName || !itemId) {
        throw new AEMException(
          'Agent name and item ID are required',
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      formData.append('cmd', 'delete');
      formData.append('id', itemId);
      
      if (options.force !== undefined) {
        formData.append('force', options.force.toString());
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'deleteQueueItem',
          resource: `${agentName}/${itemId}`
        }
      };

      const response = await this.client.post<any>(
        `/etc/replication/agents.author/${agentName}/jcr:content.queue.json`,
        formData as any,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to delete queue item ${itemId} from agent: ${agentName}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const result: QueueResult = {
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

    } catch (error) {
      this.logger.error('Failed to delete queue item', error as Error, { agentName, itemId });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while deleting queue item ${itemId} from agent: ${agentName}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, agentName, itemId }
      );
    }
  }

  /**
   * Get replication queue status for all agents
   */
  async getReplicationQueueStatus(): Promise<AEMResponse<ReplicationQueueStatus[]>> {
    try {
      this.logger.debug('Getting replication queue status');

      const requestOptions: RequestOptions = {
        context: {
          operation: 'getReplicationQueueStatus',
          resource: 'replication-queues'
        }
      };

      const response = await this.client.get<any>(
        '/etc/replication/agents.author.json',
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          'Failed to get replication queue status',
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const queueStatuses = this.parseQueueStatusResponse(response.data);

      this.logger.debug('Successfully retrieved replication queue status', { 
        agentCount: queueStatuses.length
      });

      return {
        success: true,
        data: queueStatuses,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to get replication queue status', error as Error);
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        'Unexpected error while getting replication queue status',
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Get specific agent queue status
   */
  async getAgentQueueStatus(agentName: string): Promise<AEMResponse<ReplicationQueueStatus>> {
    try {
      this.logger.debug('Getting agent queue status', { agentName });

      if (!agentName) {
        throw new AEMException(
          'Agent name is required',
          'VALIDATION_ERROR',
          false
        );
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'getAgentQueueStatus',
          resource: agentName
        }
      };

      const response = await this.client.get<any>(
        `/etc/replication/agents.author/${agentName}/jcr:content.queue.json`,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to get queue status for agent: ${agentName}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const queueStatus = this.parseAgentQueueStatus(response.data, agentName);

      this.logger.debug('Successfully retrieved agent queue status', { agentName, queueStatus });

      return {
        success: true,
        data: queueStatus,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to get agent queue status', error as Error, { agentName });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while getting agent queue status: ${agentName}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, agentName }
      );
    }
  }

  /**
   * List all replication agents
   */
  async listReplicationAgents(): Promise<AEMResponse<ReplicationAgent[]>> {
    try {
      this.logger.debug('Listing replication agents');

      const requestOptions: RequestOptions = {
        context: {
          operation: 'listReplicationAgents',
          resource: 'replication-agents'
        }
      };

      const response = await this.client.get<any>(
        '/etc/replication/agents.author.json',
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          'Failed to list replication agents',
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const agents = this.parseReplicationAgentsResponse(response.data);

      this.logger.debug('Successfully listed replication agents', { agentCount: agents.length });

      return {
        success: true,
        data: agents,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to list replication agents', error as Error);
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        'Unexpected error while listing replication agents',
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Get specific replication agent details
   */
  async getReplicationAgent(agentName: string): Promise<AEMResponse<ReplicationAgent>> {
    try {
      this.logger.debug('Getting replication agent', { agentName });

      if (!agentName) {
        throw new AEMException(
          'Agent name is required',
          'VALIDATION_ERROR',
          false
        );
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'getReplicationAgent',
          resource: agentName
        }
      };

      const response = await this.client.get<any>(
        `/etc/replication/agents.author/${agentName}.json`,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to get replication agent: ${agentName}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const agent = this.parseReplicationAgentResponse(response.data, agentName);

      this.logger.debug('Successfully retrieved replication agent', { agentName, agent });

      return {
        success: true,
        data: agent,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to get replication agent', error as Error, { agentName });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while getting replication agent: ${agentName}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, agentName }
      );
    }
  }

  /**
   * Update replication agent configuration
   */
  async updateReplicationAgent(
    agentName: string,
    updates: Partial<ReplicationAgent>
  ): Promise<AEMResponse<ReplicationAgent>> {
    try {
      this.logger.debug('Updating replication agent', { agentName, updates });

      if (!agentName) {
        throw new AEMException(
          'Agent name is required',
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      
      if (updates.enabled !== undefined) {
        formData.append('enabled', updates.enabled.toString());
      }
      if (updates.uri !== undefined) {
        formData.append('transportUri', updates.uri);
      }
      if (updates.userId !== undefined) {
        formData.append('transportUser', updates.userId);
      }
      if (updates.logLevel !== undefined) {
        formData.append('logLevel', updates.logLevel);
      }
      if (updates.retryDelay !== undefined) {
        formData.append('retryDelay', updates.retryDelay.toString());
      }
      if (updates.serializationType !== undefined) {
        formData.append('serializationType', updates.serializationType);
      }
      if (updates.queueProcessingEnabled !== undefined) {
        formData.append('queueProcessingEnabled', updates.queueProcessingEnabled.toString());
      }
      if (updates.queueMaxParallelJobs !== undefined) {
        formData.append('queueMaxParallelJobs', updates.queueMaxParallelJobs.toString());
      }
      if (updates.queueBatchSize !== undefined) {
        formData.append('queueBatchSize', updates.queueBatchSize.toString());
      }
      if (updates.queueBatchWaitTime !== undefined) {
        formData.append('queueBatchWaitTime', updates.queueBatchWaitTime.toString());
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'updateReplicationAgent',
          resource: agentName
        }
      };

      const response = await this.client.post<any>(
        `/etc/replication/agents.author/${agentName}`,
        formData as any,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to update replication agent: ${agentName}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      // Get updated agent details
      const updatedAgent = await this.getReplicationAgent(agentName);
      const agent = updatedAgent.data;

      this.logger.debug('Successfully updated replication agent', { agentName, agent });

      return {
        success: true,
        data: agent,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to update replication agent', error as Error, { agentName });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while updating replication agent: ${agentName}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, agentName }
      );
    }
  }

  /**
   * Schedule content for future publishing
   */
  async schedulePublish(
    contentPath: string,
    options: ScheduledPublishOptions
  ): Promise<AEMResponse<ScheduledPublishJob>> {
    try {
      this.logger.debug('Scheduling publish', { contentPath, options });

      if (!contentPath) {
        throw new AEMException(
          'Content path is required',
          'VALIDATION_ERROR',
          false
        );
      }

      if (!options.scheduleDate) {
        throw new AEMException(
          'Schedule date is required',
          'VALIDATION_ERROR',
          false
        );
      }

      const jobId = `scheduled-publish-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const formData = new FormData();
      formData.append('path', contentPath);
      formData.append('cmd', 'schedule');
      formData.append('scheduleDate', options.scheduleDate.toISOString());
      formData.append('jobId', jobId);
      
      if (options.timezone) {
        formData.append('timezone', options.timezone);
      }
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
      if (options.workflowModel) {
        formData.append('workflowModel', options.workflowModel);
      }
      if (options.comment) {
        formData.append('comment', options.comment);
      }
      if (options.initiator) {
        formData.append('initiator', options.initiator);
      }

      const requestOptions: RequestOptions = {
        context: {
          operation: 'schedulePublish',
          resource: contentPath
        }
      };

      const response = await this.client.post<any>(
        '/bin/replicate.json',
        formData as any,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to schedule publish for: ${contentPath}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const job: ScheduledPublishJob = {
        id: jobId,
        contentPath,
        scheduleDate: options.scheduleDate,
        status: 'scheduled',
        createdBy: options.initiator || 'system',
        createdAt: new Date(),
        lastModified: new Date(),
        options
      };

      this.logger.debug('Successfully scheduled publish', { 
        contentPath,
        jobId,
        scheduleDate: options.scheduleDate
      });

      return {
        success: true,
        data: job,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to schedule publish', error as Error, { contentPath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while scheduling publish for: ${contentPath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, contentPath }
      );
    }
  }

  /**
   * Get scheduled publish jobs
   */
  async getScheduledPublishJobs(): Promise<AEMResponse<ScheduledPublishJob[]>> {
    try {
      this.logger.debug('Getting scheduled publish jobs');

      const requestOptions: RequestOptions = {
        context: {
          operation: 'getScheduledPublishJobs',
          resource: 'scheduled-jobs'
        }
      };

      const response = await this.client.get<any>(
        '/bin/scheduled-jobs.json',
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          'Failed to get scheduled publish jobs',
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const jobs = this.parseScheduledPublishJobsResponse(response.data);

      this.logger.debug('Successfully retrieved scheduled publish jobs', { jobCount: jobs.length });

      return {
        success: true,
        data: jobs,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to get scheduled publish jobs', error as Error);
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        'Unexpected error while getting scheduled publish jobs',
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error }
      );
    }
  }

  /**
   * Cancel scheduled publish job
   */
  async cancelScheduledPublish(jobId: string): Promise<AEMResponse<boolean>> {
    try {
      this.logger.debug('Cancelling scheduled publish', { jobId });

      if (!jobId) {
        throw new AEMException(
          'Job ID is required',
          'VALIDATION_ERROR',
          false
        );
      }

      const formData = new FormData();
      formData.append('cmd', 'cancel');
      formData.append('jobId', jobId);

      const requestOptions: RequestOptions = {
        context: {
          operation: 'cancelScheduledPublish',
          resource: jobId
        }
      };

      const response = await this.client.post<any>(
        '/bin/scheduled-jobs.json',
        formData as any,
        requestOptions
      );

      if (!response.success) {
        throw new AEMException(
          `Failed to cancel scheduled publish job: ${jobId}`,
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      this.logger.debug('Successfully cancelled scheduled publish', { jobId });

      return {
        success: true,
        data: true,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0
        }
      };

    } catch (error) {
      this.logger.error('Failed to cancel scheduled publish', error as Error, { jobId });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while cancelling scheduled publish job: ${jobId}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, jobId }
      );
    }
  }

  /**
   * Parse publish/unpublish response
   */
  private parsePublishResponse(data: any, path: string, action: string): PublishResult {
    const publishedPaths: string[] = [];
    const skippedPaths: string[] = [];
    const failedPaths: string[] = [];

    // Parse response data structure
    if (data && data.results) {
      for (const result of data.results) {
        if (result.success) {
          publishedPaths.push(result.path || path);
        } else if (result.skipped) {
          skippedPaths.push(result.path || path);
        } else {
          failedPaths.push(result.path || path);
        }
      }
    } else {
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

  /**
   * Parse queue status response
   */
  private parseQueueStatusResponse(data: any): ReplicationQueueStatus[] {
    const queueStatuses: ReplicationQueueStatus[] = [];

    if (data && data.children) {
      for (const [agentName, agentData] of Object.entries(data.children)) {
        const status = this.parseAgentQueueStatus(agentData, agentName);
        queueStatuses.push(status);
      }
    }

    return queueStatuses;
  }

  /**
   * Parse agent queue status
   */
  private parseAgentQueueStatus(data: any, agentName: string): ReplicationQueueStatus {
    const queueData = data?.['jcr:content']?.['queue'] || {};
    
    return {
      agentName,
      queueSize: queueData.queueSize || 0,
      pendingItems: queueData.pendingItems || 0,
      failedItems: queueData.failedItems || 0,
      lastProcessed: queueData.lastProcessed ? new Date(queueData.lastProcessed) : undefined,
      status: queueData.status || 'inactive',
      errors: queueData.errors || []
    };
  }

  /**
   * Parse replication agents response
   */
  private parseReplicationAgentsResponse(data: any): ReplicationAgent[] {
    const agents: ReplicationAgent[] = [];

    if (data && data.children) {
      for (const [agentName, agentData] of Object.entries(data.children)) {
        const agent = this.parseReplicationAgentResponse(agentData, agentName);
        agents.push(agent);
      }
    }

    return agents;
  }

  /**
   * Parse replication agent response
   */
  private parseReplicationAgentResponse(data: any, agentName: string): ReplicationAgent {
    const content = data?.['jcr:content'] || {};
    
    return {
      name: agentName,
      title: content.title || agentName,
      type: this.determineAgentType(agentName),
      status: content.enabled ? 'active' : 'inactive',
      enabled: Boolean(content.enabled),
      uri: content.transportUri,
      userId: content.transportUser,
      logLevel: content.logLevel,
      retryDelay: content.retryDelay,
      serializationType: content.serializationType,
      queueProcessingEnabled: Boolean(content.queueProcessingEnabled),
      queueMaxParallelJobs: content.queueMaxParallelJobs,
      queueBatchSize: content.queueBatchSize,
      queueBatchWaitTime: content.queueBatchWaitTime,
      lastModified: content['jcr:lastModified'] ? new Date(content['jcr:lastModified']) : undefined
    };
  }

  /**
   * Determine agent type from name
   */
  private determineAgentType(agentName: string): 'publish' | 'reverse' | 'flush' | 'distribution' {
    if (agentName.includes('publish')) return 'publish';
    if (agentName.includes('reverse')) return 'reverse';
    if (agentName.includes('flush')) return 'flush';
    if (agentName.includes('distribution')) return 'distribution';
    return 'publish'; // default
  }

  /**
   * Parse scheduled publish jobs response
   */
  private parseScheduledPublishJobsResponse(data: any): ScheduledPublishJob[] {
    const jobs: ScheduledPublishJob[] = [];

    if (data && data.jobs) {
      for (const jobData of data.jobs) {
        const job: ScheduledPublishJob = {
          id: jobData.id,
          contentPath: jobData.contentPath,
          scheduleDate: new Date(jobData.scheduleDate),
          status: jobData.status,
          createdBy: jobData.createdBy,
          createdAt: new Date(jobData.createdAt),
          lastModified: new Date(jobData.lastModified),
          options: jobData.options,
          result: jobData.result,
          error: jobData.error
        };
        jobs.push(job);
      }
    }

    return jobs;
  }
}