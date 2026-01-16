/**
 * API Documentation Routes
 * Serves OpenAPI spec and Swagger UI
 */

import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
// @ts-ignore - js-yaml types
import * as yaml from 'js-yaml';

const router = Router();

// Cache the parsed OpenAPI spec
let openApiSpec: any = null;

/**
 * Load and parse the OpenAPI specification
 */
function loadOpenApiSpec(): any {
  if (openApiSpec) {
    return openApiSpec;
  }

  try {
    const specPath = path.join(__dirname, '../../docs/api/openapi.yaml');
    const specContent = fs.readFileSync(specPath, 'utf8');
    openApiSpec = yaml.load(specContent);
    return openApiSpec;
  } catch (error) {
    console.error('Failed to load OpenAPI spec:', error);
    return null;
  }
}

/**
 * GET /docs
 * Serve Swagger UI HTML
 */
router.get('/', (req: Request, res: Response) => {
  const swaggerUiHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Client Escalation Calls API - Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { font-size: 2em; }
    .custom-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px 40px;
      color: white;
    }
    .custom-header h1 {
      margin: 0 0 10px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 1.8em;
    }
    .custom-header p {
      margin: 0;
      opacity: 0.9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  </style>
</head>
<body>
  <div class="custom-header">
    <h1>🤖 Client Escalation Calls API</h1>
    <p>Agentic AI Payment Collection System - API Documentation</p>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/api/v1/docs/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 2,
        docExpansion: "list",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        syntaxHighlight: {
          activate: true,
          theme: "monokai"
        }
      });
    };
  </script>
</body>
</html>
  `;

  res.setHeader('Content-Type', 'text/html');
  res.send(swaggerUiHtml);
});

/**
 * GET /docs/openapi.json
 * Serve OpenAPI spec as JSON
 */
router.get('/openapi.json', (req: Request, res: Response) => {
  const spec = loadOpenApiSpec();
  
  if (!spec) {
    return res.status(500).json({ error: 'Failed to load API specification' });
  }

  res.json(spec);
});

/**
 * GET /docs/openapi.yaml
 * Serve OpenAPI spec as YAML
 */
router.get('/openapi.yaml', (req: Request, res: Response) => {
  try {
    const specPath = path.join(__dirname, '../../docs/api/openapi.yaml');
    const specContent = fs.readFileSync(specPath, 'utf8');
    
    res.setHeader('Content-Type', 'text/yaml');
    return res.send(specContent);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to load API specification' });
  }
});

export default router;
