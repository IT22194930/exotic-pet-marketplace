const swaggerJsdoc = require("swagger-jsdoc");

const options = {
   definition: {
      openapi: "3.0.0",
      info: {
         title: "Listing Service API",
         version: "1.0.0",
         description:
            "Manages pet listings for the Exotic Pet Marketplace.",
         contact: {
            name: "API Support",
         },
      },
      servers: [
         { url: "http://localhost:8002", description: "Local" },
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
            Listing: {
               type: "object",
               properties: {
                  id: { type: "string", format: "uuid" },
                  seller_id: { type: "string", format: "uuid" },
                  title: { type: "string", example: "Beautiful Albino Python" },
                  species: { type: "string", example: "Albino Python" },
                  type: { type: "string", enum: ["exotic", "livestock"], example: "exotic" },
                  price: { type: "number", example: 50000 },
                  status: { type: "string", enum: ["available", "sold", "pending"], example: "available" },
                  image_url: { type: "string", format: "uri", nullable: true, example: "https://example.com/images/listing.jpg" },
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
