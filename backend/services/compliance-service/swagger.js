const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Compliance Service API",
      version: "1.0.0",
      description:
        "Handles species compliance checking, restricted species management, and order notifications for the Exotic Pet Marketplace. Validates orders against restricted species and sends email notifications.",
      contact: {
        name: "Nadil",
      },
    },
    servers: [{ url: "http://localhost:8004", description: "Local" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT issued by the Identity Service on login",
        },
      },
      schemas: {
        RestrictedSpecies: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            species: { type: "string", example: "Albino Python" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        ComplianceCheck: {
          type: "object",
          properties: {
            allowed: { type: "boolean", example: true },
            restricted: { type: "boolean", example: false },
            reason: { type: "string", example: "Not restricted" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            order_id: { type: "string", format: "uuid" },
            channel: {
              type: "string",
              enum: ["email", "sms"],
              example: "email",
            },
            recipient: { type: "string", example: "user@example.com" },
            message: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            details: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./swagger/docs.js"],
};

module.exports = swaggerJsdoc(options);
