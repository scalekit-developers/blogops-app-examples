import express from 'express';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const app = express();

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Passwordless Auth API',
    version: '1.0.0',
    description: 'API documentation for passwordless authentication using Scalekit',
  },
  servers: [
    {
      url: 'http://localhost:3000',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./src/app/api/**/*.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(options);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default app;
