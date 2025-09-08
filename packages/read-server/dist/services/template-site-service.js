"use strict";
/**
 * Template and Site Service for AEMaaCS read operations
 * Handles site discovery, template management, and locale operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateSiteService = void 0;
const logger_js_1 = require("../../../shared/src/utils/logger.js");
const errors_js_1 = require("../../../shared/src/utils/errors.js");
class TemplateSiteService {
    constructor(client) {
        this.client = client;
        this.logger = logger_js_1.Logger.getInstance();
    }
    /**
     * Fetch sites for site discovery
     */
    async fetchSites() {
        try {
            this.logger.debug('Fetching sites');
            const params = {
                'path': '/content',
                'type': 'cq:Page',
                'property': 'jcr:content/cq:template',
                'property.operation': 'exists',
                'p.limit': 100
            };
            const requestOptions = {
                cache: true,
                cacheTtl: 300000, // Cache for 5 minutes
                context: {
                    operation: 'fetchSites',
                    resource: '/content'
                }
            };
            const response = await this.client.get('/bin/querybuilder.json', params, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException('Failed to fetch sites', 'SERVER_ERROR', true, undefined, { response });
            }
            const sites = await this.parseSitesResponse(response.data);
            this.logger.debug('Successfully fetched sites', {
                siteCount: sites.length
            });
            return {
                success: true,
                data: sites,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0,
                    cached: response.metadata?.cached
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to fetch sites', error);
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException('Unexpected error while fetching sites', 'UNKNOWN_ERROR', false, undefined, { originalError: error });
        }
    }
    /**
     * Fetch language masters for multilingual sites
     */
    async fetchLanguageMasters(sitePath) {
        try {
            this.logger.debug('Fetching language masters', { sitePath });
            if (!sitePath) {
                throw new errors_js_1.AEMException('Site path is required', 'VALIDATION_ERROR', false);
            }
            const requestOptions = {
                cache: true,
                cacheTtl: 300000, // Cache for 5 minutes
                context: {
                    operation: 'fetchLanguageMasters',
                    resource: sitePath
                }
            };
            // Get site structure to identify language masters
            const response = await this.client.get(`${sitePath}.2.json`, undefined, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Site not found: ${sitePath}`, 'NOT_FOUND_ERROR', false, undefined, { sitePath });
            }
            const languageMasters = await this.parseLanguageMastersResponse(response.data, sitePath);
            this.logger.debug('Successfully fetched language masters', {
                sitePath,
                masterCount: languageMasters.length
            });
            return {
                success: true,
                data: languageMasters,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0,
                    cached: response.metadata?.cached
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to fetch language masters', error, { sitePath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while fetching language masters for ${sitePath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, sitePath });
        }
    }
    /**
     * Fetch available locales for locale management
     */
    async fetchAvailableLocales() {
        try {
            this.logger.debug('Fetching available locales');
            const requestOptions = {
                cache: true,
                cacheTtl: 3600000, // Cache for 1 hour
                context: {
                    operation: 'fetchAvailableLocales',
                    resource: '/libs/wcm/core/resources/languages'
                }
            };
            // Get available locales from AEM
            const response = await this.client.get('/libs/wcm/core/resources/languages.json', undefined, requestOptions);
            if (!response.success || !response.data) {
                // Fallback to common locales if the endpoint is not available
                const fallbackLocales = this.getFallbackLocales();
                return {
                    success: true,
                    data: fallbackLocales,
                    metadata: {
                        timestamp: new Date(),
                        requestId: '',
                        duration: 0,
                        cached: false
                    }
                };
            }
            const locales = this.parseLocalesResponse(response.data);
            this.logger.debug('Successfully fetched available locales', {
                localeCount: locales.length
            });
            return {
                success: true,
                data: locales,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0,
                    cached: response.metadata?.cached
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to fetch available locales', error);
            // Return fallback locales on error
            const fallbackLocales = this.getFallbackLocales();
            return {
                success: true,
                data: fallbackLocales,
                metadata: {
                    timestamp: new Date(),
                    requestId: '',
                    duration: 0,
                    cached: false
                }
            };
        }
    }
    /**
     * Get templates for template discovery
     */
    async getTemplates() {
        try {
            this.logger.debug('Getting templates');
            const params = {
                'path': '/conf',
                'type': 'cq:Template',
                'p.limit': 100
            };
            const requestOptions = {
                cache: true,
                cacheTtl: 600000, // Cache for 10 minutes
                context: {
                    operation: 'getTemplates',
                    resource: '/conf'
                }
            };
            const response = await this.client.get('/bin/querybuilder.json', params, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException('Failed to get templates', 'SERVER_ERROR', true, undefined, { response });
            }
            const templates = await this.parseTemplatesResponse(response.data);
            this.logger.debug('Successfully retrieved templates', {
                templateCount: templates.length
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
        }
        catch (error) {
            this.logger.error('Failed to get templates', error);
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException('Unexpected error while getting templates', 'UNKNOWN_ERROR', false, undefined, { originalError: error });
        }
    }
    /**
     * Get template structure for detailed template analysis
     */
    async getTemplateStructure(templatePath) {
        try {
            this.logger.debug('Getting template structure', { templatePath });
            if (!templatePath) {
                throw new errors_js_1.AEMException('Template path is required', 'VALIDATION_ERROR', false);
            }
            const requestOptions = {
                cache: true,
                cacheTtl: 600000, // Cache for 10 minutes
                context: {
                    operation: 'getTemplateStructure',
                    resource: templatePath
                }
            };
            // Get template structure with deep traversal
            const response = await this.client.get(`${templatePath}.infinity.json`, undefined, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Template not found: ${templatePath}`, 'NOT_FOUND_ERROR', false, undefined, { templatePath });
            }
            const templateStructure = await this.parseTemplateStructureResponse(response.data, templatePath);
            this.logger.debug('Successfully retrieved template structure', {
                templatePath,
                componentCount: templateStructure.structure.length
            });
            return {
                success: true,
                data: templateStructure,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0,
                    cached: response.metadata?.cached
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to get template structure', error, { templatePath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while getting template structure for ${templatePath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, templatePath });
        }
    }
    /**
     * Parse sites response
     */
    async parseSitesResponse(data) {
        const hits = data.hits || [];
        const sites = [];
        const processedPaths = new Set();
        for (const hit of hits) {
            // Extract site root from page path
            const pathParts = hit.path.split('/');
            if (pathParts.length >= 3 && pathParts[1] === 'content') {
                const siteRoot = `/${pathParts.slice(1, 3).join('/')}`;
                if (!processedPaths.has(siteRoot)) {
                    processedPaths.add(siteRoot);
                    try {
                        // Get site details
                        const siteResponse = await this.client.get(`${siteRoot}.json`);
                        if (siteResponse.success && siteResponse.data) {
                            const site = this.mapToSite(siteResponse.data, siteRoot);
                            sites.push(site);
                        }
                    }
                    catch (error) {
                        // Skip sites that can't be accessed
                        this.logger.warn(`Could not access site: ${siteRoot}`, error);
                    }
                }
            }
        }
        return sites;
    }
    /**
     * Parse language masters response
     */
    async parseLanguageMastersResponse(data, sitePath) {
        const languageMasters = [];
        // Look for language structure (typically under site root)
        const skipProps = ['jcr:primaryType', 'jcr:mixinTypes', 'jcr:created', 'jcr:createdBy'];
        for (const key of Object.keys(data)) {
            if (skipProps.includes(key))
                continue;
            const child = data[key];
            if (child && typeof child === 'object' && child['jcr:primaryType'] === 'cq:Page') {
                // Check if this looks like a language master (typically 2-letter codes)
                if (key.length === 2 || key.includes('_')) {
                    const masterPath = `${sitePath}/${key}`;
                    const languageCopies = await this.findLanguageCopies(child, masterPath);
                    languageMasters.push({
                        path: masterPath,
                        locale: key,
                        title: child['jcr:content']?.['jcr:title'] || key,
                        isDefault: key === 'en' || key === 'en_us', // Common defaults
                        languageCopies
                    });
                }
            }
        }
        return languageMasters;
    }
    /**
     * Find language copies
     */
    async findLanguageCopies(masterData, masterPath) {
        const languageCopies = [];
        // This would typically involve checking for language copy relationships
        // For now, we'll return an empty array as this requires more complex logic
        return languageCopies;
    }
    /**
     * Parse locales response
     */
    parseLocalesResponse(data) {
        const locales = [];
        if (Array.isArray(data)) {
            for (const locale of data) {
                locales.push({
                    code: locale.code || locale.id,
                    language: locale.language,
                    country: locale.country,
                    displayName: locale.displayName || locale.title || locale.code,
                    available: Boolean(locale.available !== false),
                    path: locale.path
                });
            }
        }
        else if (typeof data === 'object') {
            // Handle object format
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'object' && value !== null) {
                    const locale = value;
                    locales.push({
                        code: key,
                        language: locale.language || key.split('_')[0],
                        country: locale.country || (key.includes('_') ? key.split('_')[1] : undefined),
                        displayName: locale.displayName || locale.title || key,
                        available: Boolean(locale.available !== false),
                        path: locale.path
                    });
                }
            }
        }
        return locales;
    }
    /**
     * Parse templates response
     */
    async parseTemplatesResponse(data) {
        const hits = data.hits || [];
        const templates = [];
        for (const hit of hits) {
            try {
                // Get detailed template information
                const templateResponse = await this.client.get(`${hit.path}.json`);
                if (templateResponse.success && templateResponse.data) {
                    const template = this.mapToTemplate(templateResponse.data, hit.path);
                    templates.push(template);
                }
            }
            catch (error) {
                // Skip templates that can't be accessed
                this.logger.warn(`Could not access template: ${hit.path}`, error);
            }
        }
        return templates;
    }
    /**
     * Parse template structure response
     */
    async parseTemplateStructureResponse(data, templatePath) {
        const template = this.mapToTemplate(data, templatePath);
        // Extract structure components
        const structure = this.extractTemplateComponents(data.structure || {});
        // Extract policies
        const policies = this.extractTemplatePolicies(data.policies || {});
        // Extract initial content
        const initialContent = this.extractTemplateComponents(data.initialContent || {});
        return {
            template,
            structure,
            policies,
            initialContent: initialContent.length > 0 ? initialContent : undefined
        };
    }
    /**
     * Map data to Site
     */
    mapToSite(data, sitePath) {
        const content = data['jcr:content'] || {};
        return {
            path: sitePath,
            name: sitePath.split('/').pop() || '',
            title: content['jcr:title'] || content.title,
            description: content['jcr:description'] || content.description,
            rootPath: sitePath,
            languageMaster: content.languageMaster,
            locales: content.locales || [],
            templates: content.allowedTemplates || [],
            created: data['jcr:created'] ? new Date(data['jcr:created']) : undefined,
            lastModified: content['jcr:lastModified'] ? new Date(content['jcr:lastModified']) : undefined,
            properties: { ...content }
        };
    }
    /**
     * Map data to Template
     */
    mapToTemplate(data, templatePath) {
        return {
            path: templatePath,
            name: templatePath.split('/').pop() || '',
            title: data['jcr:title'] || data.title,
            description: data['jcr:description'] || data.description,
            resourceType: data['sling:resourceType'],
            allowedPaths: data.allowedPaths || [],
            allowedParents: data.allowedParents || [],
            allowedChildren: data.allowedChildren || [],
            ranking: data.ranking ? parseInt(data.ranking) : undefined,
            status: data.status === 'disabled' ? 'disabled' : 'enabled',
            created: data['jcr:created'] ? new Date(data['jcr:created']) : undefined,
            lastModified: data['jcr:lastModified'] ? new Date(data['jcr:lastModified']) : undefined,
            thumbnail: data.thumbnail,
            properties: { ...data }
        };
    }
    /**
     * Extract template components
     */
    extractTemplateComponents(data) {
        const components = [];
        const skipProps = ['jcr:primaryType', 'jcr:mixinTypes', 'jcr:created', 'jcr:createdBy'];
        for (const key of Object.keys(data)) {
            if (skipProps.includes(key))
                continue;
            const component = data[key];
            if (component && typeof component === 'object') {
                const children = this.extractTemplateComponents(component);
                const templateComponent = {
                    path: key,
                    resourceType: component['sling:resourceType'] || 'unknown',
                    title: component['jcr:title'] || component.title,
                    description: component['jcr:description'] || component.description,
                    properties: { ...component },
                    children: children.length > 0 ? children : undefined
                };
                components.push(templateComponent);
            }
        }
        return components;
    }
    /**
     * Extract template policies
     */
    extractTemplatePolicies(data) {
        const policies = [];
        const skipProps = ['jcr:primaryType', 'jcr:mixinTypes', 'jcr:created', 'jcr:createdBy'];
        for (const key of Object.keys(data)) {
            if (skipProps.includes(key))
                continue;
            const policy = data[key];
            if (policy && typeof policy === 'object') {
                policies.push({
                    path: key,
                    resourceType: policy['sling:resourceType'] || 'unknown',
                    title: policy['jcr:title'] || policy.title,
                    properties: { ...policy }
                });
            }
        }
        return policies;
    }
    /**
     * Get fallback locales
     */
    getFallbackLocales() {
        return [
            { code: 'en', language: 'English', displayName: 'English', available: true },
            { code: 'en_US', language: 'English', country: 'US', displayName: 'English (United States)', available: true },
            { code: 'en_GB', language: 'English', country: 'GB', displayName: 'English (United Kingdom)', available: true },
            { code: 'de', language: 'German', displayName: 'Deutsch', available: true },
            { code: 'de_DE', language: 'German', country: 'DE', displayName: 'Deutsch (Deutschland)', available: true },
            { code: 'fr', language: 'French', displayName: 'Français', available: true },
            { code: 'fr_FR', language: 'French', country: 'FR', displayName: 'Français (France)', available: true },
            { code: 'es', language: 'Spanish', displayName: 'Español', available: true },
            { code: 'es_ES', language: 'Spanish', country: 'ES', displayName: 'Español (España)', available: true },
            { code: 'it', language: 'Italian', displayName: 'Italiano', available: true },
            { code: 'it_IT', language: 'Italian', country: 'IT', displayName: 'Italiano (Italia)', available: true },
            { code: 'ja', language: 'Japanese', displayName: '日本語', available: true },
            { code: 'ja_JP', language: 'Japanese', country: 'JP', displayName: '日本語 (日本)', available: true },
            { code: 'ko', language: 'Korean', displayName: '한국어', available: true },
            { code: 'ko_KR', language: 'Korean', country: 'KR', displayName: '한국어 (대한민국)', available: true },
            { code: 'zh', language: 'Chinese', displayName: '中文', available: true },
            { code: 'zh_CN', language: 'Chinese', country: 'CN', displayName: '中文 (中国)', available: true },
            { code: 'zh_TW', language: 'Chinese', country: 'TW', displayName: '中文 (台灣)', available: true }
        ];
    }
}
exports.TemplateSiteService = TemplateSiteService;
//# sourceMappingURL=template-site-service.js.map