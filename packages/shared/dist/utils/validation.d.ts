/**
 * Validation utilities for AEMaaCS MCP servers
 */
import Joi from 'joi';
export interface ValidationResult {
    valid: boolean;
    errors?: string[] | undefined;
    sanitized?: any;
}
export declare class ValidationUtils {
    /**
     * Validate and sanitize AEM path
     */
    static validatePath(path: string): ValidationResult;
    /**
     * Validate JCR query for security
     */
    static validateJCRQuery(query: string): ValidationResult;
    /**
     * Validate file upload
     */
    static validateFileUpload(file: Buffer, metadata: {
        filename?: string;
        mimeType?: string;
        size?: number;
    }): ValidationResult;
    /**
     * Sanitize input object by removing potentially dangerous properties
     */
    static sanitizeInput(input: any): any;
    /**
     * Validate using Joi schema
     */
    static validateWithSchema<T>(data: any, schema: Joi.Schema): T;
}
export declare const CommonSchemas: {
    aemPath: Joi.StringSchema<string>;
    optionalAemPath: Joi.StringSchema<string>;
    pageSize: Joi.NumberSchema<number>;
    offset: Joi.NumberSchema<number>;
    depth: Joi.NumberSchema<number>;
    query: Joi.StringSchema<string>;
    optionalQuery: Joi.StringSchema<string>;
    properties: Joi.ObjectSchema<any>;
    force: Joi.BooleanSchema<boolean>;
    recursive: Joi.BooleanSchema<boolean>;
};
//# sourceMappingURL=validation.d.ts.map