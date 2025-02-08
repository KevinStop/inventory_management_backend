const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Gestión de Inventarios',
      version: '1.0.0',
      description: 'API para gestionar inventarios y préstamos de componentes electrónicos',
      contact: {
        name: 'Soporte API',
        // email: 'tu@email.com' // Opcional
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  // Rutas a los archivos que contienen anotaciones de Swagger
  apis: [
    './routes/*.js',
    './models/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;