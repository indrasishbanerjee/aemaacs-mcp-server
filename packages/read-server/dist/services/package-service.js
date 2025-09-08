"use strict";
/**
 * Package Service for AEMaaCS read operations
 * Handles package listing, information retrieval, and status checking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackageService = void 0;
const logger_js_1 = require("../../../shared/src/utils/logger.js");
const errors_js_1 = require("../../../shared/src/utils/errors.js");
class PackageService {
    constructor(client) {
        this.client = client;
        this.logger = logger_js_1.Logger.getInstance();
    }
    /**
     * List all packages using /crx/packmgr/list.jsp endpoint
     */
    async listPackages(options = {}) {
        try {
            this.logger.debug('Listing packages', { options });
            const params = {};
            if (options.group) {
                params.group = options.group;
            }
            if (options.includeVersions !== undefined) {
                params.includeVersions = options.includeVersions;
            }
            if (options.includeSnapshots !== undefined) {
                params.includeSnapshots = options.includeSnapshots;
            }
            const requestOptions = {
                cache: true,
                cacheTtl: 60000, // Cache for 1 minute
                context: {
                    operation: 'listPackages',
                    resource: '/crx/packmgr/list.jsp'
                }
            };
            const response = await this.client.get('/crx/packmgr/list.jsp', params, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException('Failed to retrieve package list', 'SERVER_ERROR', true, undefined, { response });
            }
            // Parse the package list response
            const packages = this.parsePackageListResponse(response.data);
            // Apply client-side filtering and sorting
            let filteredPackages = packages;
            if (options.orderBy) {
                filteredPackages = this.sortPackages(filteredPackages, options.orderBy, options.orderDirection);
            }
            if (options.limit || options.offset) {
                const start = options.offset || 0;
                const end = options.limit ? start + options.limit : undefined;
                filteredPackages = filteredPackages.slice(start, end);
            }
            this.logger.debug('Successfully listed packages', {
                count: filteredPackages.length,
                totalCount: packages.length
            });
            return {
                success: true,
                data: filteredPackages,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0,
                    cached: response.metadata?.cached
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to list packages', error);
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException('Unexpected error while listing packages', 'UNKNOWN_ERROR', false, undefined, { originalError: error });
        }
    }
    /**
     * Get detailed package information
     */
    async getPackageInfo(packagePath) {
        try {
            this.logger.debug('Getting package info', { packagePath });
            if (!packagePath) {
                throw new errors_js_1.AEMException('Package path is required', 'VALIDATION_ERROR', false);
            }
            const requestOptions = {
                cache: true,
                cacheTtl: 300000, // Cache for 5 minutes
                context: {
                    operation: 'getPackageInfo',
                    resource: packagePath
                }
            };
            // Get package details from the package manager
            const response = await this.client.get(`/crx/packmgr/service/.json${packagePath}`, undefined, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Package not found: ${packagePath}`, 'NOT_FOUND_ERROR', false, undefined, { packagePath });
            }
            const packageInfo = this.parsePackageInfoResponse(response.data, packagePath);
            this.logger.debug('Successfully retrieved package info', {
                packagePath,
                name: packageInfo.name,
                version: packageInfo.version
            });
            return {
                success: true,
                data: packageInfo,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0,
                    cached: response.metadata?.cached
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to get package info', error, { packagePath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while getting package info for ${packagePath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, packagePath });
        }
    }
    /**
     * Get package installation status
     */
    async getPackageStatus(packagePath) {
        try {
            this.logger.debug('Getting package status', { packagePath });
            if (!packagePath) {
                throw new errors_js_1.AEMException('Package path is required', 'VALIDATION_ERROR', false);
            }
            const requestOptions = {
                cache: true,
                cacheTtl: 30000, // Cache for 30 seconds (status changes more frequently)
                context: {
                    operation: 'getPackageStatus',
                    resource: packagePath
                }
            };
            // Get package status from the package manager
            const response = await this.client.get(`/crx/packmgr/service/.json${packagePath}`, { cmd: 'status' }, requestOptions);
            if (!response.success || !response.data) {
                throw new errors_js_1.AEMException(`Package status not available: ${packagePath}`, 'NOT_FOUND_ERROR', false, undefined, { packagePath });
            }
            const packageStatus = this.parsePackageStatusResponse(response.data, packagePath);
            this.logger.debug('Successfully retrieved package status', {
                packagePath,
                installed: packageStatus.installed
            });
            return {
                success: true,
                data: packageStatus,
                metadata: {
                    timestamp: new Date(),
                    requestId: response.metadata?.requestId || '',
                    duration: response.metadata?.duration || 0,
                    cached: response.metadata?.cached
                }
            };
        }
        catch (error) {
            this.logger.error('Failed to get package status', error, { packagePath });
            if (error instanceof errors_js_1.AEMException) {
                throw error;
            }
            throw new errors_js_1.AEMException(`Unexpected error while getting package status for ${packagePath}`, 'UNKNOWN_ERROR', false, undefined, { originalError: error, packagePath });
        }
    }
    /**
     * Parse package list response from AEM
     */
    parsePackageListResponse(data) {
        try {
            // Handle different response formats from AEM package manager
            let packages = [];
            if (data.results && Array.isArray(data.results)) {
                packages = data.results;
            }
            else if (Array.isArray(data)) {
                packages = data;
            }
            else if (data.packages && Array.isArray(data.packages)) {
                packages = data.packages;
            }
            else {
                this.logger.warn('Unexpected package list response format', { data });
                return [];
            }
            return packages.map(pkg => this.mapToPackage(pkg)).filter(Boolean);
        }
        catch (error) {
            this.logger.error('Failed to parse package list response', error, { data });
            return [];
        }
    }
    /**
     * Parse package info response from AEM
     */
    parsePackageInfoResponse(data, packagePath) {
        try {
            const basePackage = this.mapToPackage(data);
            if (!basePackage) {
                throw new Error('Invalid package data');
            }
            const packageInfo = {
                ...basePackage,
                description: data.description || data.jcr?.description,
                dependencies: this.parseDependencies(data.dependencies),
                filters: this.parseFilters(data.filter || data.filters),
                screenshots: this.parseScreenshots(data.screenshots),
                thumbnail: data.thumbnail,
                definition: data.definition || data.jcr
            };
            return packageInfo;
        }
        catch (error) {
            this.logger.error('Failed to parse package info response', error, { data, packagePath });
            throw new Error(`Invalid package info response for ${packagePath}`);
        }
    }
    /**
     * Parse package status response from AEM
     */
    parsePackageStatusResponse(data, packagePath) {
        try {
            const status = {
                path: packagePath,
                installed: Boolean(data.installed || data.status === 'installed'),
                installationDate: data.installTime ? new Date(data.installTime) : undefined,
                installedBy: data.installedBy || data.installUser,
                installationLog: this.parseInstallationLog(data.log || data.installLog),
                errors: this.parseLogMessages(data.errors || data.error),
                warnings: this.parseLogMessages(data.warnings || data.warning)
            };
            return status;
        }
        catch (error) {
            this.logger.error('Failed to parse package status response', error, { data, packagePath });
            throw new Error(`Invalid package status response for ${packagePath}`);
        }
    }
    /**
     * Map AEM package data to Package interface
     */
    mapToPackage(data) {
        try {
            if (!data || !data.name) {
                return null;
            }
            return {
                name: data.name,
                group: data.group || 'default',
                version: data.version || '1.0.0',
                path: data.path || `/etc/packages/${data.group || 'default'}/${data.name}-${data.version || '1.0.0'}.zip`,
                size: parseInt(data.size) || 0,
                created: data.created ? new Date(data.created) : new Date(),
                lastModified: data.lastModified ? new Date(data.lastModified) : new Date(),
                installed: Boolean(data.installed),
                builtWith: data.builtWith || data.buildCount
            };
        }
        catch (error) {
            this.logger.error('Failed to map package data', error, { data });
            return null;
        }
    }
    /**
     * Parse package dependencies
     */
    parseDependencies(dependencies) {
        if (!dependencies)
            return [];
        if (Array.isArray(dependencies)) {
            return dependencies.map(dep => typeof dep === 'string' ? dep : dep.name || dep.id).filter(Boolean);
        }
        if (typeof dependencies === 'string') {
            return [dependencies];
        }
        return [];
    }
    /**
     * Parse package filters
     */
    parseFilters(filters) {
        if (!filters)
            return [];
        if (Array.isArray(filters)) {
            return filters.map(filter => ({
                root: filter.root || filter.path || '/',
                rules: this.parseFilterRules(filter.rules)
            }));
        }
        return [];
    }
    /**
     * Parse filter rules
     */
    parseFilterRules(rules) {
        if (!rules || !Array.isArray(rules))
            return [];
        return rules.map(rule => ({
            modifier: rule.modifier === 'exclude' ? 'exclude' : 'include',
            pattern: rule.pattern || rule.path || '*'
        }));
    }
    /**
     * Parse screenshots
     */
    parseScreenshots(screenshots) {
        if (!screenshots)
            return [];
        if (Array.isArray(screenshots)) {
            return screenshots.filter(Boolean);
        }
        if (typeof screenshots === 'string') {
            return [screenshots];
        }
        return [];
    }
    /**
     * Parse installation log
     */
    parseInstallationLog(log) {
        if (!log)
            return [];
        if (Array.isArray(log)) {
            return log.map(entry => typeof entry === 'string' ? entry : JSON.stringify(entry));
        }
        if (typeof log === 'string') {
            return log.split('\n').filter(Boolean);
        }
        return [];
    }
    /**
     * Parse log messages (errors/warnings)
     */
    parseLogMessages(messages) {
        if (!messages)
            return [];
        if (Array.isArray(messages)) {
            return messages.map(msg => typeof msg === 'string' ? msg : msg.message || JSON.stringify(msg));
        }
        if (typeof messages === 'string') {
            return [messages];
        }
        if (typeof messages === 'object' && messages.message) {
            return [messages.message];
        }
        return [];
    }
    /**
     * Sort packages by specified criteria
     */
    sortPackages(packages, orderBy, direction = 'asc') {
        return packages.sort((a, b) => {
            let aValue;
            let bValue;
            switch (orderBy) {
                case 'name':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'group':
                    aValue = a.group.toLowerCase();
                    bValue = b.group.toLowerCase();
                    break;
                case 'version':
                    aValue = a.version;
                    bValue = b.version;
                    break;
                case 'created':
                    aValue = a.created.getTime();
                    bValue = b.created.getTime();
                    break;
                case 'modified':
                    aValue = a.lastModified.getTime();
                    bValue = b.lastModified.getTime();
                    break;
                default:
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
            }
            if (aValue < bValue) {
                return direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }
}
exports.PackageService = PackageService;
//# sourceMappingURL=package-service.js.map