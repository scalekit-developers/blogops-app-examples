import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Passwordless Auth API',
    version: '1.0.0',
    description: 'API documentation for passwordless authentication using Scalekit',
  },
  servers: [
    { url: 'http://localhost:3000' },
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
};

const options = {
  swaggerDefinition,
  apis: ['src/app/api/**/*.ts'], // Path to the API docs (no leading ./)
};

export const swaggerSpec = swaggerJSDoc(options);
