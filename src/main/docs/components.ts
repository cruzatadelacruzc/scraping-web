import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';

export function registerSharedComponents(registry: OpenAPIRegistry): void {
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  registry.registerComponent('schemas', 'ErrorResponse', {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'error' },
      message: { type: 'string', example: 'Validation failed' },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            path: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  });
}
