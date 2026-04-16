const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Seminararbeit API',
      version: '1.0.0',
      description: 'API documentation for the Seminararbeit backend'
    },
    servers: [
      { url: 'http://localhost:3002', description: 'Local server' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Provide the JWT access token obtained from /api/auth/login'
        }
      },
      schemas: {
        DashboardEvent: {
          type: 'object',
          properties: {
            event_id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 10 },
            event_type: { type: 'string', example: 'chat_message_sent' },
            entity_type: { type: 'string', example: 'chat_message' },
            entity_id: { type: 'integer', example: 100 },
            metadata: { type: 'object', additionalProperties: true },
            created_at: { type: 'string', format: 'date-time', example: '2026-04-16T07:00:00Z' },
          },
        },
        DashboardEventCounts: {
          type: 'object',
          properties: {
            activity_created: { type: 'integer', example: 4 },
            activity_joined: { type: 'integer', example: 12 },
            activity_left: { type: 'integer', example: 3 },
            activity_participant_removed: { type: 'integer', example: 1 },
            chat_created: { type: 'integer', example: 2 },
            chat_message_sent: { type: 'integer', example: 19 },
            chat_participant_added: { type: 'integer', example: 5 },
            chat_participant_removed: { type: 'integer', example: 2 },
            chat_left: { type: 'integer', example: 1 },
          },
        },
        Chat: {
          type: 'object',
          properties: {
            chat_id: { type: 'integer', example: 1 },
            chat_name: { type: 'string', example: 'Friday Running Group' },
            created_at: { type: 'string', format: 'date-time', example: '2025-11-10T12:00:00Z' }
          }
        },
        Participant: {
          type: 'object',
          properties: {
            chat_id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 10 },
            joined_at: { type: 'string', format: 'date-time', example: '2025-11-10T12:01:00Z' },
            role: { type: 'string', example: 'member' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            message_id: { type: 'integer', example: 100 },
            chat_id: { type: 'integer', example: 1 },
            sender_id: { type: 'integer', example: 10 },
            content: { type: 'string', example: 'Hello!' },
            sent_at: { type: 'string', format: 'date-time', example: '2025-11-10T12:02:00Z' }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            notification_id: { type: 'integer', example: 5 },
            user_id: { type: 'integer', example: 10 },
            type: { type: 'string', example: 'new_message' },
            content: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            read: { type: 'boolean', example: false }
          }
        }
      }
    }
  },
  // Paths to files containing OpenAPI definitions in JSDoc (we can point to routes and controllers)
  apis: [
    './routes/*.js',
    './controllers/*.js'
  ]
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
