/**
 * Validation utilities for AEMaaCS MCP servers
 */

import Joi from 'joi';
import { AEMException } from './errors.js';
import { ErrorType } from '../types/aem.js';

export interface ValidationResult {
  valid: boolean;
  errors?: string[] | undefined;
  sanitized?: any;
}

export class ValidationUtils {
  /**
   * Validate and sanitize AEM path
   */
  static validatePath(path: string): ValidationResult {
    if (!path || typeof path !== 'string') {
      return {
        valid: false,
        errors: ['Path is required and must be a string']
      };
    }

    // Remove leading/trailing whitespace
    const trimmed = path.trim();

    // Check for path traversal attempts
    if (trimmed.includes('..') || trimmed.includes('//')) {
      return {
        valid: false,
        errors: ['Path contains invalid characters (path traversal detected)']
      };
    }

    // Ensure path starts with /
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

    // Check for valid AEM path characters
    const validPathRegex = /^\/[a-zA-Z0-9\/_\-\.]+$/;
    if (!validPathRegex.test(normalized)) {
      return {
        valid: false,
        errors: ['Path contains invalid characters']
      };
    }

    return {
      valid: true,
      sanitized: normalized
    };
  }

  /**
   * Validate JCR query for security
   */
  static validateJCRQuery(query: string): ValidationResult {
    if (!query || typeof query !== 'string') {
      return {
        valid: false,
        errors: ['Query is required and must be a string']
      };
    }

    const trimmed = query.trim();

    // Check for dangerous SQL injection patterns
    const dangerousPatterns = [
      /;\s*(drop|delete|update|insert|create|alter)\s+/i,
      /union\s+select/i,
      /exec\s*\(/i,
      /script\s*>/i,
      /<\s*script/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmed)) {
        return {
          valid: false,
          errors: ['Query contains potentially dangerous patterns']
        };
      }
    }

    return {
      valid: true,
      sanitized: trimmed
    };
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(
    file: Buffer, 
    metadata: { filename?: string; mimeType?: string; size?: number }
  ): ValidationResult {
    const errors: string[] = [];

    if (!Buffer.isBuffer(file)) {
      errors.push('File content must be a Buffer');
    }

    if (metadata.size && metadata.size > 100 * 1024 * 1024) { // 100MB limit
      errors.push('File size exceeds maximum limit (100MB)');
    }

    if (metadata.filename) {
      // Check for dangerous filename patterns
      if (metadata.filename.includes('..') || metadata.filename.includes('/') || metadata.filename.includes('\\')) {
        errors.push('Filename contains invalid characters');
      }

      // Check file extension
      const allowedExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', // Images
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', // Documents
        '.txt', '.csv', '.json', '.xml', '.html', '.css', '.js', // Text files
        '.zip', '.tar', '.gz' // Archives
      ];

      const extension = metadata.filename.toLowerCase().substring(metadata.filename.lastIndexOf('.'));
      if (!allowedExtensions.includes(extension)) {
        errors.push(`File type not allowed: ${extension}`);
      }
    }

    if (metadata.mimeType) {
      const allowedMimeTypes = [
        'image/', 'text/', 'application/pdf', 'application/json',
        'application/xml', 'application/zip', 'application/x-tar',
        'application/gzip', 'application/msword', 'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument'
      ];

      const isAllowed = allowedMimeTypes.some(allowed => metadata.mimeType!.startsWith(allowed));
      if (!isAllowed) {
        errors.push(`MIME type not allowed: ${metadata.mimeType}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Sanitize input object by removing potentially dangerous properties
   */
  static sanitizeInput(input: any): any {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      // Remove script tags and other dangerous HTML
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        // Skip dangerous property names
        if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
          continue;
        }
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Validate using Joi schema
   */
  static validateWithSchema<T>(data: any, schema: Joi.Schema): T {
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message);
      throw new AEMException(
        `Validation failed: ${errorMessages.join(', ')}`,
        ErrorType.VALIDATION_ERROR,
        false,
        undefined,
        { validationErrors: errorMessages }
      );
    }

    return value;
  }
}

// Common Joi schemas
export const CommonSchemas = {
  aemPath: Joi.string().pattern(/^\/[a-zA-Z0-9\/_\-\.]*$/).required(),
  optionalAemPath: Joi.string().pattern(/^\/[a-zA-Z0-9\/_\-\.]*$/).optional(),
  pageSize: Joi.number().integer().min(1).max(1000).default(50),
  offset: Joi.number().integer().min(0).default(0),
  depth: Joi.number().integer().min(0).max(10).default(1),
  query: Joi.string().min(1).max(1000).required(),
  optionalQuery: Joi.string().min(1).max(1000).optional(),
  properties: Joi.object().pattern(Joi.string(), Joi.any()).optional(),
  force: Joi.boolean().default(false),
  recursive: Joi.boolean().default(false)
};