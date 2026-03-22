const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Payment Service API",
      version: "1.0.0",
      description:
        "Handles payment processing and payment status lookups for the Exotic Pet Marketplace. Communicates with the Order Service (order lookup + completion), Identity Service (buyer identity), and Compliance Service (best-effort payment success notifications).",
      contact: {
        name: "API Support",
      },
    },
    servers: [{ url: "http://localhost:8005", description: "Local" }],
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
        Payment: {
          type: "object",
          properties: {
            id: { type: "integer", example: 12 },
            orderId: { type: "string", format: "uuid" },
            buyerId: { type: "string", format: "uuid" },
            amount: { type: "number", example: 50000 },
            status: { type: "string", enum: ["pending", "completed"], example: "completed" },
          },
        },
        OrderUpdate: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            httpStatus: { type: "integer", example: 502 },
            error: { type: "string", example: "Order update failed" },
            details: { type: "object", nullable: true },
          },
        },
        PaymentProcessRequest: {
          type: "object",
          required: ["orderId", "method"],
          properties: {
            orderId: { type: "string", format: "uuid" },
            method: { type: "string", enum: ["online", "cod"], example: "online" },
            cardHolderName: { type: "string", nullable: true, example: "John Doe" },
            cardNumber: { type: "string", nullable: true, example: "4111 1111 1111 1111" },
            expiryDate: { type: "string", nullable: true, example: "12/30" },
            cvv: { type: "string", nullable: true, example: "123" },
          },
        },
        PaymentProcessResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            method: { type: "string", enum: ["online", "cod"], example: "online" },
            amount: { type: "number", example: 50000 },
            currency: { type: "string", example: "$" },
            status: { type: "string", enum: ["completed"], example: "completed" },
            paymentId: { type: "string", nullable: true, example: "pay_1711021234567" },
            orderUpdate: { $ref: "#/components/schemas/OrderUpdate" },
          },
        },
        BulkPaymentStatusRequest: {
          type: "object",
          required: ["orderIds"],
          properties: {
            orderIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              example: [
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "b89e35f8-abc3-428b-a5aa-bd536600e5f9",
              ],
            },
          },
        },
        BulkPaymentStatusResponse: {
          type: "object",
          properties: {
            statuses: {
              type: "object",
              additionalProperties: { type: "string", enum: ["pending", "completed"] },
              example: {
                "a1b2c3d4-e5f6-7890-abcd-ef1234567890": "completed",
                "b89e35f8-abc3-428b-a5aa-bd536600e5f9": "pending",
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", nullable: true, example: false },
            error: { type: "string", example: "Unauthorized" },
            details: { type: "object", nullable: true },
          },
        },
      },
    },
  },
  apis: ["./swagger/docs.js"],
};

module.exports = swaggerJsdoc(options);
