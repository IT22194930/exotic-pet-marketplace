/**
 * @swagger
 * /compliance/check:
 *   post:
 *     summary: Check order compliance against restricted species
 *     description: Validates if a species is restricted and sends approval/rejection email. Restricted species requires admin role.
 *     tags:
 *       - Compliance
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - species
 *               - sellerId
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *                 description: Unique order identifier
 *               species:
 *                 type: string
 *                 description: Species name to check
 *                 example: "Albino Python"
 *               sellerId:
 *                 type: string
 *                 format: uuid
 *                 description: Seller's user ID
 *               buyerEmail:
 *                 type: string
 *                 format: email
 *                 description: Optional buyer email for notifications
 *           example:
 *             orderId: "550e8400-e29b-41d4-a716-446655440000"
 *             species: "Albino Python"
 *             sellerId: "550e8400-e29b-41d4-a716-446655440001"
 *             buyerEmail: "buyer@example.com"
 *     responses:
 *       200:
 *         description: Compliance check result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ComplianceCheck'
 *             examples:
 *               allowed:
 *                 value:
 *                   allowed: true
 *                   restricted: false
 *                   reason: "Not restricted"
 *               denied:
 *                 value:
 *                   allowed: false
 *                   restricted: true
 *                   reason: "Restricted species: requires admin review / verified seller"
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /compliance/restricted-species:
 *   get:
 *     summary: Get all restricted species
 *     description: Retrieves list of all restricted species. Accessible to any authenticated user for listing validation.
 *     tags:
 *       - Restricted Species
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of restricted species
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/RestrictedSpecies'
 *             example:
 *               - id: 1
 *                 species: "Albino Python"
 *                 created_at: "2024-01-15T10:30:00Z"
 *               - id: 2
 *                 species: "Bengal Tiger"
 *                 created_at: "2024-01-15T10:35:00Z"
 *       401:
 *         description: Unauthorized - Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Add new restricted species
 *     description: Creates a new restricted species entry. Admin only.
 *     tags:
 *       - Restricted Species
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - species
 *             properties:
 *               species:
 *                 type: string
 *                 description: Species name to restrict
 *                 example: "Bengal Tiger"
 *     responses:
 *       201:
 *         description: Restricted species created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RestrictedSpecies'
 *       400:
 *         description: Missing or invalid species field
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /compliance/restricted-species/{id}:
 *   put:
 *     summary: Update restricted species
 *     description: Updates an existing restricted species entry. Admin only.
 *     tags:
 *       - Restricted Species
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Restricted species ID (numeric)
 *         example: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - species
 *             properties:
 *               species:
 *                 type: string
 *                 description: Updated species name
 *                 example: "Siberian Tiger"
 *     responses:
 *       200:
 *         description: Restricted species updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RestrictedSpecies'
 *       400:
 *         description: Missing or invalid species field
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restricted species not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   delete:
 *     summary: Delete restricted species
 *     description: Removes a restricted species entry. Admin only.
 *     tags:
 *       - Restricted Species
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Restricted species ID (numeric)
 *         example: 10
 *     responses:
 *       200:
 *         description: Restricted species deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: Unauthorized - Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Restricted species not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /notify/order-confirmed:
 *   post:
 *     summary: Send order confirmation notification
 *     description: Creates and sends an order confirmation notification. Persists to database and sends real email for email channel.
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - channel
 *               - recipient
 *               - message
 *             properties:
 *               orderId:
 *                 type: string
 *                 format: uuid
 *                 description: Order ID
 *               channel:
 *                 type: string
 *                 enum: ["email", "sms"]
 *                 description: Notification channel
 *               recipient:
 *                 type: string
 *                 description: Email address or phone number
 *                 example: "user@example.com"
 *               message:
 *                 type: string
 *                 description: Notification message content
 *           example:
 *             orderId: "550e8400-e29b-41d4-a716-446655440000"
 *             channel: "email"
 *             recipient: "buyer@example.com"
 *             message: "Your order has been confirmed and is pending fulfillment."
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 channel:
 *                   type: string
 *                 emailSent:
 *                   type: boolean
 *                   nullable: true
 *                 notification:
 *                   $ref: '#/components/schemas/Notification'
 *             example:
 *               message: "Notification sent"
 *               channel: "email"
 *               emailSent: true
 *               notification:
 *                 id: "550e8400-e29b-41d4-a716-446655440002"
 *                 order_id: "550e8400-e29b-41d4-a716-446655440000"
 *                 channel: "email"
 *                 recipient: "buyer@example.com"
 *                 message: "Your order has been confirmed and is pending fulfillment."
 *                 created_at: "2024-01-15T10:30:00Z"
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
