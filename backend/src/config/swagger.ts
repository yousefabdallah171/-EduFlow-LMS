import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EduFlow Payment API',
      version: '1.0.0',
      description: 'Complete payment system integration with Paymob for EduFlow LMS',
      contact: {
        name: 'EduFlow Engineering',
        email: 'engineering@eduflow.com'
      },
      license: {
        name: 'MIT'
      }
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Production API server'
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            studentId: { type: 'string' },
            packageId: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string', default: 'EGP' },
            status: {
              type: 'string',
              enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED']
            },
            paymentMethod: { type: 'string' },
            transactionId: { type: 'string' },
            couponCode: { type: 'string' },
            discountAmount: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Coupon: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            discountPercentage: { type: 'number' },
            discountAmount: { type: 'number' },
            maxUses: { type: 'number' },
            currentUses: { type: 'number' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.ts']
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
