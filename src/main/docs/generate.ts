import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import * as fs from 'fs';
import * as path from 'path';

import { registerSharedComponents } from './components';
import { registerAllSchemas } from './schema-registry';
import { registerAllPaths } from './path-registry';
import { API_TAGS } from './tags';

function generate(): void {
  const registry = new OpenAPIRegistry();

  registerSharedComponents(registry);
  registerAllSchemas(registry);
  registerAllPaths(registry);

  const generator = new OpenApiGeneratorV3(registry.definitions);

  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'BazaarSentinel API',
      version: '1.0.0',
      description:
        'Multi-tenant SaaS for marketplace listing monitoring. Watch products on online bazaars (e.g., Revolico) and get notified when any user-configured alarm condition matches — price drops/rises, view-count thresholds, seller changes, outstanding status.',
    },
    servers: [{ url: '/', description: 'API base path' }],
    tags: API_TAGS,
    security: [{ bearerAuth: [] }],
  });

  const args = process.argv.slice(2);
  const defaultPath = path.resolve(process.cwd(), 'swagger.json');
  const outputPath = args[0] || defaultPath;
  const silent = args.includes('--silent');

  fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');

  if (!silent) {
    console.log(`swagger.json generated at ${outputPath}`);
    console.log(`  - ${Object.keys(document.components?.schemas || {}).length} schemas`);
    console.log(`  - ${Object.keys(document.paths || {}).length} path entries`);
  }
}

generate();
