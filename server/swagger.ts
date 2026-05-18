import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LuxPetPlast ERP API',
      version: '1.0.0',
      description: 'LuxPetPlast ERP tizimi uchun API dokumentatsiyasi',
      contact: {
        name: 'Support',
        email: 'support@luxpetplast.uz'
      }
    },
    servers: [
      {
        url: '/api',
        description: 'Local server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './server/routes/*.ts',
    './server/dist/routes/*.js'
  ]
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'LuxPetPlast API Docs'
  }));

  // Swagger JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });

  console.log(`Swagger UI: http://localhost:${process.env.PORT || 5003}/api-docs`);
};

export default specs;
