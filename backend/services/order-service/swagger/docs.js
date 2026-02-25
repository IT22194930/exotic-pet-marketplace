/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is running
 *         content:
 *           application/json:
 *             example:
 *               service: order-service
 *               status: ok
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     description: >
 *       Places an order for an available listing. The service validates the buyer's
 *       JWT with the **Identity Service**, fetches listing details from the
 *       **Listing Service**, and runs a species compliance check via the
 *       **Compliance Service** before persisting the order.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listingId]
 *             properties:
 *               listingId:
 *                 type: string
 *                 format: uuid
 *                 example: b89e35f8-abc3-428b-a5aa-bd536600e5f9
 *     responses:
 *       201:
 *         description: Order created or rejected based on compliance check
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:  { type: string, example: "Order created" }
 *                 order:    { $ref: '#/components/schemas/Order' }
 *                 listing:
 *                   type: object
 *                   properties:
 *                     id:      { type: string, format: uuid }
 *                     species: { type: string }
 *                     price:   { type: number }
 *                 compliance:
 *                   type: object
 *                   properties:
 *                     allowed: { type: boolean }
 *                     reason:  { type: string }
 *       400:
 *         description: listingId missing from request body
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Listing is not available (already sold or pending)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /orders/my:
 *   get:
 *     summary: Get all orders for the authenticated buyer
 *     description: >
 *       Returns the full order history for the logged-in buyer. The JWT is
 *       validated against the **Identity Service** to identify the buyer.
 *       Results are sorted newest-first.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders belonging to this buyer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *       401:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /orders/{id}/cancel:
 *   patch:
 *     summary: Cancel an order
 *     description: >
 *       Cancels a buyer's own order if it is in "created" status.
 *       After cancelling, calls the **Listing Service** to reset the
 *       listing status back to "available" so other buyers can purchase it.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The order UUID to cancel
 *     responses:
 *       200:
 *         description: Order successfully cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Order cancelled" }
 *                 order:   { $ref: '#/components/schemas/Order' }
 *       403:
 *         description: Order belongs to a different buyer
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Order cannot be cancelled (not in "created" status)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */


/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get a specific order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The order UUID
 *         example: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *     responses:
 *       200:
 *         description: The order record
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
