const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Identity Service API",
      version: "1.0.0",
      description:
        "Handles user authentication, registration, and role management for the Exotic Pet Marketplace. Issues JWT tokens for secured access to other microservices.",
      contact: {
        name: "Team",
      },
    },
    servers: [{ url: "http://localhost:8001", description: "Local" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token returned from login endpoint",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            role: { type: "string", enum: ["buyer", "seller", "admin"] },
            sellerVerified: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        LoginResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Login successful" },
            token: {
              type: "string",
              description: "JWT token valid for 2 hours",
            },
            user: { $ref: "#/components/schemas/User" },
          },
        },
        RegisterResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Registered successfully" },
            user: { $ref: "#/components/schemas/User" },
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
