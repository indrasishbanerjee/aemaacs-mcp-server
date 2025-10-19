/**
 * Template and Component Management Service for AEMaaCS read operations
 * Handles template discovery, component usage analysis, and dependency tracking
 */

import { AEMHttpClient, RequestOptions } from '../../../shared/src/client/aem-http-client.js';
import { AEMResponse } from '../../../shared/src/types/aem.js';
import { Logger } from '../../../shared/src/utils/logger.js';
import { AEMException } from '../../../shared/src/utils/errors.js';

export interface Template {
  path: string;
  title: string;
  description?: string;
  resourceType: string;
  allowedPaths: string[];
  allowedChildren: string[];
  initialContent?: any;
  policies: TemplatePolicy[];
  lastModified: Date;
  createdBy?: string;
}

export interface TemplatePolicy {
  name: string;
  path: string;
  title: string;
  description?: string;
  allowedComponents: string[];
  allowedChildren: string[];
}

export interface ComponentUsage {
  componentPath: string;
  componentTitle: string;
  usageCount: number;
  pages: ComponentUsagePage[];
  templates: string[];
  lastUsed?: Date;
}

export interface ComponentUsagePage {
  pagePath: string;
  pageTitle: string;
  template: string;
  lastModified: Date;
}

export interface ComponentDependency {
  componentPath: string;
  dependencies: ComponentDependencyItem[];
  dependents: ComponentDependencyItem[];
  circularDependencies: string[];
}

export interface ComponentDependencyItem {
  componentPath: string;
  componentTitle: string;
  dependencyType: 'sling:resourceType' | 'sling:resourceSuperType' | 'cq:template' | 'reference';
  required: boolean;
}

export interface TemplateAnalysis {
  templatePath: string;
  templateTitle: string;
  componentCount: number;
  components: TemplateComponent[];
  dependencies: string[];
  usageCount: number;
  pages: string[];
}

export interface TemplateComponent {
  componentPath: string;
  componentTitle: string;
  allowed: boolean;
  defaultContent?: any;
  policies: string[];
}

export interface ComponentSearchOptions {
  resourceType?: string;
  allowedPaths?: string[];
  allowedChildren?: string[];
  includeInherited?: boolean;
}

export interface DependencyAnalysisOptions {
  includeCircular?: boolean;
  includeInherited?: boolean;
  maxDepth?: number;
}

export class TemplateComponentManagementService {
  private client: AEMHttpClient;
  private logger: Logger;

  constructor(client: AEMHttpClient) {
    this.client = client;
    this.logger = Logger.getInstance();
  }

  /**
   * Discover all available templates
   */
  async discoverTemplates(sitePath?: string): Promise<AEMResponse<Template[]>> {
    try {
      this.logger.debug('Discovering templates', { sitePath });

      const requestOptions: RequestOptions = {
        cache: true,
        cacheTtl: 600000, // Cache for 10 minutes
        context: {
          operation: 'discoverTemplates',
          resource: sitePath || '/conf'
        }
      };

      const params: Record<string, any> = {};
      if (sitePath) {
        params['sitePath'] = sitePath;
      }

      const response = await this.client.get<any>(
        '/conf/templates.json',
        params,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          'Failed to discover templates',
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const templates = this.parseTemplatesResponse(response.data, sitePath);

      this.logger.debug('Successfully discovered templates', { 
        templateCount: templates.length,
        sitePath
      });

      return {
        success: true,
        data: templates,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0,
          cached: response.metadata?.cached
        }
      };

    } catch (error) {
      this.logger.error('Failed to discover templates', error as Error, { sitePath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while discovering templates`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, sitePath }
      );
    }
  }

  /**
   * Analyze component usage across the site
   */
  async analyzeComponentUsage(componentPath?: string, options: ComponentSearchOptions = {}): Promise<AEMResponse<ComponentUsage[]>> {
    try {
      this.logger.debug('Analyzing component usage', { componentPath, options });

      const requestOptions: RequestOptions = {
        cache: true,
        cacheTtl: 300000, // Cache for 5 minutes
        context: {
          operation: 'analyzeComponentUsage',
          resource: componentPath || '/content'
        }
      };

      const params: Record<string, any> = {};
      if (componentPath) {
        params['componentPath'] = componentPath;
      }
      if (options.resourceType) {
        params['resourceType'] = options.resourceType;
      }
      if (options.includeInherited !== undefined) {
        params['includeInherited'] = options.includeInherited;
      }

      const response = await this.client.get<any>(
        '/bin/querybuilder.json',
        {
          ...params,
          type: 'cq:Component',
          path: '/apps',
          'p.limit': 1000
        },
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          'Failed to analyze component usage',
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const componentUsages = await this.processComponentUsage(response.data, options);

      this.logger.debug('Successfully analyzed component usage', { 
        componentCount: componentUsages.length
      });

      return {
        success: true,
        data: componentUsages,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0,
          cached: response.metadata?.cached
        }
      };

    } catch (error) {
      this.logger.error('Failed to analyze component usage', error as Error, { componentPath, options });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while analyzing component usage`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, componentPath, options }
      );
    }
  }

  /**
   * Track component dependencies
   */
  async trackComponentDependencies(componentPath?: string, options: DependencyAnalysisOptions = {}): Promise<AEMResponse<ComponentDependency[]>> {
    try {
      this.logger.debug('Tracking component dependencies', { componentPath, options });

      const requestOptions: RequestOptions = {
        cache: true,
        cacheTtl: 300000, // Cache for 5 minutes
        context: {
          operation: 'trackComponentDependencies',
          resource: componentPath || '/apps'
        }
      };

      const params: Record<string, any> = {};
      if (componentPath) {
        params['componentPath'] = componentPath;
      }
      if (options.includeInherited !== undefined) {
        params['includeInherited'] = options.includeInherited;
      }
      if (options.maxDepth) {
        params['maxDepth'] = options.maxDepth;
      }

      const response = await this.client.get<any>(
        '/bin/querybuilder.json',
        {
          ...params,
          type: 'cq:Component',
          path: '/apps',
          'p.limit': 1000
        },
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          'Failed to track component dependencies',
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const dependencies = await this.processComponentDependencies(response.data, options);

      this.logger.debug('Successfully tracked component dependencies', { 
        dependencyCount: dependencies.length
      });

      return {
        success: true,
        data: dependencies,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0,
          cached: response.metadata?.cached
        }
      };

    } catch (error) {
      this.logger.error('Failed to track component dependencies', error as Error, { componentPath, options });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while tracking component dependencies`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, componentPath, options }
      );
    }
  }

  /**
   * Analyze template structure and components
   */
  async analyzeTemplateStructure(templatePath: string): Promise<AEMResponse<TemplateAnalysis>> {
    try {
      this.logger.debug('Analyzing template structure', { templatePath });

      if (!templatePath) {
        throw new AEMException(
          'Template path is required',
          'VALIDATION_ERROR',
          false
        );
      }

      const requestOptions: RequestOptions = {
        cache: true,
        cacheTtl: 300000, // Cache for 5 minutes
        context: {
          operation: 'analyzeTemplateStructure',
          resource: templatePath
        }
      };

      const response = await this.client.get<any>(
        `${templatePath}/jcr:content/structure.json`,
        undefined,
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          `Template structure not found: ${templatePath}`,
          'NOT_FOUND_ERROR',
          false,
          undefined,
          { templatePath }
        );
      }

      const analysis = await this.processTemplateAnalysis(response.data, templatePath);

      this.logger.debug('Successfully analyzed template structure', { 
        templatePath,
        componentCount: analysis.componentCount
      });

      return {
        success: true,
        data: analysis,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0,
          cached: response.metadata?.cached
        }
      };

    } catch (error) {
      this.logger.error('Failed to analyze template structure', error as Error, { templatePath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while analyzing template structure for ${templatePath}`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, templatePath }
      );
    }
  }

  /**
   * Get component usage statistics
   */
  async getComponentUsageStatistics(componentPath?: string): Promise<AEMResponse<Record<string, any>>> {
    try {
      this.logger.debug('Getting component usage statistics', { componentPath });

      const requestOptions: RequestOptions = {
        cache: true,
        cacheTtl: 300000, // Cache for 5 minutes
        context: {
          operation: 'getComponentUsageStatistics',
          resource: componentPath || '/content'
        }
      };

      const params: Record<string, any> = {};
      if (componentPath) {
        params['componentPath'] = componentPath;
      }

      const response = await this.client.get<any>(
        '/bin/querybuilder.json',
        {
          ...params,
          type: 'cq:Component',
          path: '/apps',
          'p.limit': 1000
        },
        requestOptions
      );

      if (!response.success || !response.data) {
        throw new AEMException(
          'Failed to get component usage statistics',
          'SERVER_ERROR',
          true,
          undefined,
          { response }
        );
      }

      const statistics = this.processUsageStatistics(response.data);

      this.logger.debug('Successfully retrieved component usage statistics', { 
        componentCount: statistics.totalComponents
      });

      return {
        success: true,
        data: statistics,
        metadata: {
          timestamp: new Date(),
          requestId: response.metadata?.requestId || '',
          duration: response.metadata?.duration || 0,
          cached: response.metadata?.cached
        }
      };

    } catch (error) {
      this.logger.error('Failed to get component usage statistics', error as Error, { componentPath });
      
      if (error instanceof AEMException) {
        throw error;
      }
      
      throw new AEMException(
        `Unexpected error while getting component usage statistics`,
        'UNKNOWN_ERROR',
        false,
        undefined,
        { originalError: error, componentPath }
      );
    }
  }

  /**
   * Parse templates response
   */
  private parseTemplatesResponse(data: any, sitePath?: string): Template[] {
    const templates: Template[] = [];
    
    if (data.templates) {
      for (const templateData of data.templates) {
        templates.push({
          path: templateData.path,
          title: templateData.title || templateData['jcr:title'],
          description: templateData.description || templateData['jcr:description'],
          resourceType: templateData.resourceType,
          allowedPaths: templateData.allowedPaths || [],
          allowedChildren: templateData.allowedChildren || [],
          initialContent: templateData.initialContent,
          policies: this.parseTemplatePolicies(templateData.policies || []),
          lastModified: templateData.lastModified ? new Date(templateData.lastModified) : new Date(),
          createdBy: templateData.createdBy
        });
      }
    }

    return templates;
  }

  /**
   * Parse template policies
   */
  private parseTemplatePolicies(policiesData: any[]): TemplatePolicy[] {
    return policiesData.map(policy => ({
      name: policy.name,
      path: policy.path,
      title: policy.title || policy['jcr:title'],
      description: policy.description || policy['jcr:description'],
      allowedComponents: policy.allowedComponents || [],
      allowedChildren: policy.allowedChildren || []
    }));
  }

  /**
   * Process component usage data
   */
  private async processComponentUsage(data: any, options: ComponentSearchOptions): Promise<ComponentUsage[]> {
    const componentUsages: ComponentUsage[] = [];
    const hits = data.hits || [];

    for (const hit of hits) {
      try {
        // Get component details
        const componentPath = hit.path;
        const componentTitle = hit.title || hit['jcr:title'] || componentPath.split('/').pop();

        // Find usage across pages
        const usagePages = await this.findComponentUsagePages(componentPath);

        const usage: ComponentUsage = {
          componentPath,
          componentTitle,
          usageCount: usagePages.length,
          pages: usagePages,
          templates: this.extractTemplatesFromPages(usagePages),
          lastUsed: this.getLastUsedDate(usagePages)
        };

        componentUsages.push(usage);
      } catch (error) {
        this.logger.warn('Failed to process component usage', error as Error, { componentPath: hit.path });
      }
    }

    return componentUsages;
  }

  /**
   * Process component dependencies
   */
  private async processComponentDependencies(data: any, options: DependencyAnalysisOptions): Promise<ComponentDependency[]> {
    const dependencies: ComponentDependency[] = [];
    const hits = data.hits || [];

    for (const hit of hits) {
      try {
        const componentPath = hit.path;
        const componentDeps = await this.analyzeComponentDependencies(componentPath, options);

        dependencies.push(componentDeps);
      } catch (error) {
        this.logger.warn('Failed to process component dependencies', error as Error, { componentPath: hit.path });
      }
    }

    return dependencies;
  }

  /**
   * Process template analysis
   */
  private async processTemplateAnalysis(data: any, templatePath: string): Promise<TemplateAnalysis> {
    const components: TemplateComponent[] = [];
    
    if (data.components) {
      for (const compData of data.components) {
        components.push({
          componentPath: compData.path,
          componentTitle: compData.title || compData['jcr:title'],
          allowed: compData.allowed !== false,
          defaultContent: compData.defaultContent,
          policies: compData.policies || []
        });
      }
    }

    // Find pages using this template
    const usagePages = await this.findTemplateUsagePages(templatePath);

    return {
      templatePath,
      templateTitle: data.title || data['jcr:title'],
      componentCount: components.length,
      components,
      dependencies: data.dependencies || [],
      usageCount: usagePages.length,
      pages: usagePages
    };
  }

  /**
   * Process usage statistics
   */
  private processUsageStatistics(data: any): Record<string, any> {
    const hits = data.hits || [];
    
    return {
      totalComponents: hits.length,
      mostUsedComponents: this.getMostUsedComponents(hits),
      unusedComponents: this.getUnusedComponents(hits),
      componentCategories: this.categorizeComponents(hits)
    };
  }

  /**
   * Find component usage pages
   */
  private async findComponentUsagePages(componentPath: string): Promise<ComponentUsagePage[]> {
    try {
      const response = await this.client.get<any>(
        '/bin/querybuilder.json',
        {
          type: 'cq:Page',
          'property': 'jcr:content/sling:resourceType',
          'property.value': componentPath,
          'p.limit': 1000
        }
      );

      if (response.success && response.data) {
        const hits = response.data.hits || [];
        return hits.map((hit: any) => ({
          pagePath: hit.path,
          pageTitle: hit.title || hit['jcr:title'],
          template: hit.template || 'unknown',
          lastModified: hit.lastModified ? new Date(hit.lastModified) : new Date()
        }));
      }
    } catch (error) {
      this.logger.warn('Failed to find component usage pages', error as Error, { componentPath });
    }

    return [];
  }

  /**
   * Analyze component dependencies
   */
  private async analyzeComponentDependencies(componentPath: string, options: DependencyAnalysisOptions): Promise<ComponentDependency> {
    const dependencies: ComponentDependencyItem[] = [];
    const dependents: ComponentDependencyItem[] = [];
    const circularDependencies: string[] = [];

    try {
      // Get component details to find dependencies
      const response = await this.client.get<any>(`${componentPath}.json`);
      
      if (response.success && response.data) {
        const componentData = response.data;
        
        // Find sling:resourceSuperType dependencies
        if (componentData['sling:resourceSuperType']) {
          dependencies.push({
            componentPath: componentData['sling:resourceSuperType'],
            componentTitle: componentData['sling:resourceSuperType'].split('/').pop(),
            dependencyType: 'sling:resourceSuperType',
            required: true
          });
        }

        // Find other dependencies
        if (componentData.dependencies) {
          for (const dep of componentData.dependencies) {
            dependencies.push({
              componentPath: dep.path,
              componentTitle: dep.title || dep.path.split('/').pop(),
              dependencyType: dep.type || 'reference',
              required: dep.required !== false
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn('Failed to analyze component dependencies', error as Error, { componentPath });
    }

    return {
      componentPath,
      dependencies,
      dependents,
      circularDependencies
    };
  }

  /**
   * Find template usage pages
   */
  private async findTemplateUsagePages(templatePath: string): Promise<string[]> {
    try {
      const response = await this.client.get<any>(
        '/bin/querybuilder.json',
        {
          type: 'cq:Page',
          'property': 'jcr:content/cq:template',
          'property.value': templatePath,
          'p.limit': 1000
        }
      );

      if (response.success && response.data) {
        const hits = response.data.hits || [];
        return hits.map((hit: any) => hit.path);
      }
    } catch (error) {
      this.logger.warn('Failed to find template usage pages', error as Error, { templatePath });
    }

    return [];
  }

  /**
   * Extract templates from pages
   */
  private extractTemplatesFromPages(pages: ComponentUsagePage[]): string[] {
    const templates = new Set<string>();
    pages.forEach(page => templates.add(page.template));
    return Array.from(templates);
  }

  /**
   * Get last used date from pages
   */
  private getLastUsedDate(pages: ComponentUsagePage[]): Date | undefined {
    if (pages.length === 0) return undefined;
    
    const sortedPages = pages.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    return sortedPages[0].lastModified;
  }

  /**
   * Get most used components
   */
  private getMostUsedComponents(hits: any[]): any[] {
    // This would need to be implemented with actual usage data
    return hits.slice(0, 10).map(hit => ({
      path: hit.path,
      title: hit.title || hit['jcr:title'],
      usageCount: 0 // Would need actual usage calculation
    }));
  }

  /**
   * Get unused components
   */
  private getUnusedComponents(hits: any[]): any[] {
    // This would need to be implemented with actual usage data
    return hits.filter(hit => {
      // Would need to check actual usage
      return false;
    });
  }

  /**
   * Categorize components
   */
  private categorizeComponents(hits: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = {};
    
    hits.forEach(hit => {
      const category = hit.category || 'uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push({
        path: hit.path,
        title: hit.title || hit['jcr:title']
      });
    });

    return categories;
  }
}
