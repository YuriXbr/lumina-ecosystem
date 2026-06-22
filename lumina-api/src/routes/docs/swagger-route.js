const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');


module.exports = function registerSwaggerRoute(app) {
    const swaggerUiDist = require('swagger-ui-dist');
    const swaggerUiPath = swaggerUiDist.getAbsoluteFSPath();

    // Servir o swagger.yaml localizado na raiz do projeto
    const specPath = path.join(__dirname, '../../../', 'swagger.yaml');
    // Endpoint para servir o arquivo swagger.yaml
    app.get('/docs/spec', (req, res) => {
        if (!fs.existsSync(specPath)) {
            return res.status(404).json({ error: 'swagger.yaml não encontrado' });
        }
        res.setHeader('Content-Type', 'application/yaml');
        res.sendFile(specPath);
    });
    
    // Servir os assets estáticos do Swagger UI
    app.use('/docs', require('express').static(swaggerUiPath, {
        index: false, // Não servir index.html automaticamente
        
    }));

    // Página principal com configuração apontando para /docs/spec
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

    console.log('Swagger UI disponível em /docs');
};
