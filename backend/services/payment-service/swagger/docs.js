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
 *               service: payment-service
 *               status: ok
 */

/**
 * @swagger
 * /payments/process:
 *   post:
 *     summary: Process a payment for an order
 *     description: >
 *       Processes an **online** or **cash on delivery (cod)** payment for an order.
 *       The service fetches the order details from the **Order Service** (authoritative total),
 *       stores payment state in Supabase, attempts to mark the order as complete via the **Order Service**,
 *       and sends a best-effort payment success notification via the **Compliance Service**.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentProcessRequest'
 *     responses:
 *       200:
 *         description: Payment processed (order update may still fail)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentProcessResponse'
 *             examples:
 *               online-success:
 *                 summary: Online payment success
 *                 value:
 *                   success: true
 *                   method: online
 *                   amount: 50000
 *                   currency: "$"
 *                   status: completed
 *                   paymentId: pay_1711021234567
 *               cod-success:
 *                 summary: Cash on delivery success
 *                 value:
 *                   success: true
 *                   method: cod
 *                   amount: 50000
 *                   currency: "$"
 *                   status: completed
 *       400:
 *         description: Invalid request body (missing orderId, invalid method, or invalid card details)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Unauthorized (Order Service/Identity Service rejected the JWT)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       409:
 *         description: Order is not in a payable state
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Internal error while writing payment status
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       502:
 *         description: Downstream service failure (Order Service unreachable)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /payments/status/bulk:
 *   post:
 *     summary: Get latest payment status per order (bulk)
 *     description: >
 *       Returns a map of `{ orderId: status }` for the authenticated buyer.
 *       If multiple payment rows exist for the same orderId, the latest row is used.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BulkPaymentStatusRequest'
 *     responses:
 *       200:
 *         description: Status map
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkPaymentStatusResponse'
 *       400:
 *         description: orderIds must be a non-empty array
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
