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
 *               service: listing-service
 *               status: ok
 */

/**
 * @swagger
 * /listings:
 *   post:
 *     summary: Create a new listing
 *     description: >
 *       Creates a new listing for verified sellers. The service validates the seller's
 *       JWT with the **Identity Service** and checks if the seller is verified.
 *       The species is also checked against the **Compliance Service** restricted species list.
 *       Images are uploaded separately via the image upload endpoint.
 *       Publishes a Kafka event (listing.created) upon successful creation.
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, species, type, price]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Beautiful Albino Python
 *               species:
 *                 type: string
 *                 example: Albino Python
 *               type:
 *                 type: string
 *                 enum: [exotic, livestock]
 *                 example: exotic
 *               price:
 *                 type: number
 *                 example: 50000
 *     responses:
 *       201:
 *         description: Listing successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:  { type: string, example: "Listing created" }
 *                 listing:  { $ref: '#/components/schemas/Listing' }
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Either seller is not verified, or species is on the restricted list
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             examples:
 *               unverified-seller:
 *                 summary: Seller not verified
 *                 value:
 *                   error: Your seller account must be verified by an admin before you can create listings
 *               restricted-species:
 *                 summary: Restricted species
 *                 value:
 *                   error: Restricted species
 *                   details: '"Tiger" is on the restricted species list and cannot be listed. Contact an admin if you have the required permits.'
 *       503:
 *         description: Compliance service is unavailable (fail-safe - listing creation blocked)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *             example:
 *               error: Compliance service unavailable
 *               details: Could not verify species compliance. Please try again later.
 */

/**
 * @swagger
 * /listings:
 *   get:
 *     summary: Get all listings
 *     description: >
 *       Returns all listings in the system, sorted by creation date (newest first).
 *       This endpoint is public and does not require authentication.
 *     tags: [Listings]
 *     responses:
 *       200:
 *         description: List of all listings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 listings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Listing'
 *       500:
 *         description: Database error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /listings/{id}:
 *   get:
 *     summary: Get a specific listing by ID
 *     description: >
 *       Returns detailed information about a single listing.
 *       This endpoint is public and does not require authentication.
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The listing UUID
 *         example: b89e35f8-abc3-428b-a5aa-bd536600e5f9
 *     responses:
 *       200:
 *         description: Listing found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /listings/my:
 *   get:
 *     summary: Get seller's own listings
 *     description: >
 *       Returns all listings created by the authenticated seller. The JWT is
 *       validated against the **Identity Service**. Results are sorted newest-first.
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of seller's listings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 listings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Listing'
 *       401:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Only sellers can access their listings
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /listings/{id}:
 *   put:
 *     summary: Update a listing
 *     description: >
 *       Updates listing details for the authenticated seller. Only the seller who
 *       created the listing can update it. Supports updating title, species, type,
 *       price, and removing images.
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The listing UUID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated Python Title
 *               species:
 *                 type: string
 *                 example: Ball Python
 *               type:
 *                 type: string
 *                 enum: [exotic, livestock]
 *                 example: exotic
 *               price:
 *                 type: number
 *                 example: 45000
 *               removeImage:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Listing successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:  { type: string, example: "Listing updated" }
 *                 listing:  { $ref: '#/components/schemas/Listing' }
 *       400:
 *         description: Invalid input or no fields provided
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Not authorized to update this listing
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /listings/{id}:
 *   delete:
 *     summary: Delete a listing
 *     description: >
 *       Deletes a listing and all associated images from Supabase Storage.
 *       Only the seller who created the listing can delete it. Publishes a
 *       Kafka event (listing.deleted) upon successful deletion.
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The listing UUID to delete
 *     responses:
 *       200:
 *         description: Listing successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Listing deleted" }
 *       401:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Not authorized to delete this listing
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */

/**
 * @swagger
 * /listings/{id}/image:
 *   post:
 *     summary: Upload an image for a listing
 *     description: >
 *       Uploads an image to Supabase Storage for a specific listing. Only the
 *       seller who created the listing can upload images. The image is stored
 *       in the listing-images bucket and the URL is saved to the database.
 *       Maximum file size is 5MB.
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The listing UUID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload (max 5MB)
 *     responses:
 *       200:
 *         description: Image successfully uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:  { type: string, example: "Image uploaded" }
 *                 imageUrl: { type: string, format: uri }
 *                 listing:  { $ref: '#/components/schemas/Listing' }
 *       400:
 *         description: No image file provided
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       401:
 *         description: Invalid or missing JWT
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Not authorized to upload images for this listing
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Listing not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Storage upload or database error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
