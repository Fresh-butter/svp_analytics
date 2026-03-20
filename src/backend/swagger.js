const swaggerAutogen = require('swagger-autogen')({ openapi: '3.0.0' });
const { config } = require('./src/config');

const doc = {
    info: {
        title: 'SVP Analytics API',
        version: '1.0.0',
        description: 'SVP Partner Engagement Dashboard - Backend API (SRS v1.0)',
    },
    servers: [
        {
            url: `http://localhost:${config?.port || 3001}`,
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
    }
};

const outputFile = './swagger_output.json';
const endpointsFiles = ['./src/index.js'];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    console.log('Swagger documentation generated successfully!');
});
