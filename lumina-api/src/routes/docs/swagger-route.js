const path = require('path');
const fs = require('fs');
const { addLog } = require('../../logger/logger');

module.exports = function registerSwaggerRoute(app) {
    const swaggerUiDist = require('swagger-ui-dist');
    const swaggerUiPath = swaggerUiDist.getAbsoluteFSPath();

    const specPath = path.join(__dirname, '../../../', 'swagger.yaml');

    app.get('/docs/spec', (req, res) => {
        if (!fs.existsSync(specPath)) {
            return res.status(404).json({ error: 'swagger.yaml não encontrado' });
        }
        res.setHeader('Content-Type', 'application/yaml');
        res.sendFile(specPath);
    });

    app.use('/docs', require('express').static(swaggerUiPath, { index: false }));

    app.get('/docs', (req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Lumina API — Documentação</title>
  <link rel="stylesheet" href="/docs/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/docs/swagger-ui-bundle.js"></script>
  <script src="/docs/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/docs/spec',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
        deepLinking: true,
        displayRequestDuration: true,
        filter: true,
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>`);
    });

    addLog('API', 'docs', 'Swagger UI registrado em /docs');
};
