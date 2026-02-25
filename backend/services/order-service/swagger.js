const swaggerJsdoc = require("swagger-jsdoc");

const options = {
   definition: {
      openapi: "3.0.0",
      info: {
         title: "Order Service API",
         version: "1.0.0",
         description:
            "Handles order creation, compliance checking, and order history for the Exotic Pet Marketplace. Communicates with the Identity Service (token validation), Listing Service (listing lookup), and Compliance Service (species compliance check).",
         contact: {
            name: "Heshan",
         },
      },
      servers: [
         { url: "http://localhost:8003", description: "Local" },
      ],
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
            Order: {
               type: "object",
               properties: {
                  id: { type: "string", format: "uuid" },
                  buyer_id: { type: "string", format: "uuid" },
                  listing_id: { type: "string", format: "uuid" },
                  species: { type: "string", example: "Albino Python" },
                  price: { type: "number", example: 50000 },
                  status: { type: "string", enum: ["created", "rejected"], example: "created" },
                  reason: { type: "string", nullable: true, example: "Species is restricted in your region" },
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
