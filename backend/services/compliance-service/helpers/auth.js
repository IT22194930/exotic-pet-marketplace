const axios = require("axios");

const IDENTITY_URL = process.env.IDENTITY_URL || "http://identity-service:8001";

/**
 * Resolves the authenticated user from the Bearer token by calling Identity service.
 * @param {string} authHeader - The Authorization header value.
 * @returns {Promise<{id: string, email: string, role: string, sellerVerified: boolean}>}
 */
async function getUserFromToken(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }
  const response = await axios.get(`${IDENTITY_URL}/users/me`, {
    headers: { Authorization: authHeader },
  });
  return response.data; // { id, email, role, sellerVerified }
}

module.exports = { getUserFromToken };
