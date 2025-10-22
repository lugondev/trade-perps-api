import { applyDecorators } from '@nestjs/common';
import { ApiSecurity, ApiUnauthorizedResponse } from '@nestjs/swagger';

/**
 * Swagger decorator for API key authentication
 * Adds API key authentication requirement to Swagger
 */
export function ApiKeyAuth() {
	return applyDecorators(
		ApiSecurity('api-key'),
		ApiUnauthorizedResponse({
			description: 'Unauthorized - Invalid or missing API key',
			schema: {
				type: 'object',
				properties: {
					statusCode: { type: 'number', example: 401 },
					message: { type: 'string', example: 'API key is required' },
					error: { type: 'string', example: 'Unauthorized' },
				},
			},
		}),
	);
}
