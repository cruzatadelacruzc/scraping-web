import { OpenAPIRegistry, RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';

const ERROR_RESPONSES: Record<number, string> = {
  400: 'Validation error',
  401: 'Unauthorized - missing or invalid token',
  403: 'Forbidden - insufficient role',
  404: 'Resource not found',
};

export class PathBuilder {
  private _config: any = { responses: {} };

  private constructor(method: HttpMethod, path: string) {
    this._config.method = method;
    this._config.path = path;
  }

  public static create(method: HttpMethod, path: string): PathBuilder {
    return new PathBuilder(method, path);
  }

  public tag(...tags: string[]): this {
    this._config.tags = tags;
    return this;
  }

  public summary(summary: string): this {
    this._config.summary = summary;
    return this;
  }

  public description(description: string): this {
    this._config.description = description;
    return this;
  }

  public operationId(id: string): this {
    this._config.operationId = id;
    return this;
  }

  public security(scheme: string): this {
    this._config.security = [{ [scheme]: [] }];
    return this;
  }

  public pathParam(name: string, description: string): this {
    if (!this._config.request) {
      this._config.request = {};
    }
    if (!this._config.request.params) {
      this._config.request.params = z.object({});
    }
    const paramSchema = z
      .string()
      .uuid()
      .openapi({
        param: { name, in: 'path', description },
        description,
      });
    (this._config.request.params as z.ZodObject<Record<string, z.ZodString>>) = (
      this._config.request.params as z.ZodObject<Record<string, z.ZodString>>
    ).extend({
      [name]: paramSchema,
    });
    return this;
  }

  /**
   * Path parameter variant for non-UUID string values (e.g. `storeKey` like
   * `revolico:listing`). Use when the URL segment is a logical key rather
   * than a database-generated UUID. Optional `pattern` adds a regex constraint.
   */
  public pathParamString(name: string, description: string, pattern?: string): this {
    if (!this._config.request) {
      this._config.request = {};
    }
    if (!this._config.request.params) {
      this._config.request.params = z.object({});
    }
    let paramSchema = z.string();
    if (pattern) {
      paramSchema = paramSchema.regex(new RegExp(pattern));
    }
    const annotated = paramSchema.openapi({
      param: { name, in: 'path', description },
      description,
    });
    (this._config.request.params as z.ZodObject<Record<string, z.ZodString>>) = (
      this._config.request.params as z.ZodObject<Record<string, z.ZodString>>
    ).extend({
      [name]: annotated,
    });
    return this;
  }

  public requestBody(schema: z.ZodTypeAny, description?: string): this {
    this._config.request = {
      ...(this._config.request || {}),
      body: {
        description: description || 'Request body',
        required: true,
        content: { 'application/json': { schema } },
      },
    };
    return this;
  }

  public response(status: number, description: string, bodySchema?: z.ZodTypeAny): this {
    const resp: Record<string, unknown> = { description };
    if (bodySchema) {
      resp.content = { 'application/json': { schema: bodySchema } };
    }
    (this._config.responses as Record<string, unknown>)[String(status)] = resp;
    return this;
  }

  public response204(description: string): this {
    return this.response(204, description);
  }

  public errors(...codes: number[]): this {
    for (const code of codes) {
      const desc = ERROR_RESPONSES[code] || 'Error';
      this.response(
        code,
        desc,
        z.object({
          status: z.literal('error'),
          message: z.string(),
          errors: z
            .array(
              z.object({
                code: z.string(),
                message: z.string(),
                path: z.array(z.string()),
              }),
            )
            .optional(),
        }),
      );
    }
    return this;
  }

  public build(): RouteConfig {
    return this._config as unknown as RouteConfig;
  }

  public register(registry: OpenAPIRegistry): void {
    registry.registerPath(this.build());
  }
}

export const endpoint = PathBuilder.create;
