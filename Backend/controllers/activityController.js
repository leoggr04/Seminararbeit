const ActivityService = require('../services/activityService');
const { listParticipants: listParticipantsSvc, joinPost: joinPostSvc, leavePost: leavePostSvc } = require('../services/activityService');

async function createType(req, res) {
  const { name, icon_url } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const t = await ActivityService.createType(name, icon_url);
    return res.status(201).json(t);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}
/**
 * @openapi
 * /api/activities/types:
 *   post:
 *     tags:
 *       - activity
 *     summary: Create a new activity type
 *     security:
 *       - bearerAuth: []
 *     description: Creates a new activity type with an optional icon URL.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Laufen"
 *               icon_url:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/icons/run.png"
 *     responses:
 *       201:
 *         description: Activity type created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 3
 *                 name:
 *                   type: string
 *                   example: "Laufen"
 *                 icon_url:
 *                   type: string
 *                   example: "https://example.com/icons/run.png"
 *       400:
 *         description: Name missing
 *       500:
 *         description: Server error
 */

async function listTypes(req, res) {
  const types = await ActivityService.listTypes();
  return res.json({ data: types });
}
/**
 * @openapi
 * /api/activities/types:
 *   get:
 *     tags:
 *       - activity
 *     summary: List all activity types
 *     description: Returns all available activity types.
 *     responses:
 *       200:
 *         description: List of activity types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Laufen"
 *                       icon_url:
 *                         type: string
 *                         example: "https://example.com/icons/run.png"
 */


async function createPost(req, res) {
  const user = req.user;
  const body = req.body || {};
  const payload = Object.assign({}, body, { user_id: user.user_id });
  try {
    const post = await ActivityService.createPost(payload);
    return res.status(201).json(post);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/**
 * @openapi
 * /api/activities/posts:
 *   post:
 *     tags:
 *       - activity
 *     summary: Create a new activity post
 *     description: Creates a new activity post for the authenticated user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - activity_type_id
 *               - description
 *               - start_time
 *             properties:
 *               activity_type_id:
 *                 type: integer
 *                 example: 2
 *                 description: ID of the activity type
 *               description:
 *                 type: string
 *                 example: "Morning run in the park"
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-10-28T06:30:00Z"
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2025-10-28T07:15:00Z"
 *               latitude:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 example: 48.1351
 *               longitude:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 example: 11.5820
 *     responses:
 *       201:
 *         description: Successfully created activity post
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 42
 *                 user_id:
 *                   type: integer
 *                   example: 10
 *                 activity_type_id:
 *                   type: integer
 *                   example: 2
 *                 description:
 *                   type: string
 *                   example: "Morning run in the park"
 *                 start_time:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-10-28T06:30:00Z"
 *                 end_time:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-10-28T07:15:00Z"
 *                 latitude:
 *                   type: number
 *                   format: float
 *                   example: 48.1351
 *                 longitude:
 *                   type: number
 *                   format: float
 *                   example: 11.5820
 *                 status:
 *                   type: string
 *                   example: offen
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-10-28T06:31:00Z"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: server_error
 */

async function getPost(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  const post = await ActivityService.getPost(id);
  if (!post) return res.status(404).json({ error: 'not_found' });
  return res.json(post);
}
/**
 * @openapi
 * /api/activities/posts/{id}:
 *   get:
 *     tags:
 *       - activity
 *     summary: Get a specific activity post
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the activity post
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Activity post found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ActivityPost'
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Post not found
 */

async function listPosts(req, res) {
  const posts = await ActivityService.listPosts();
  return res.json({ data: posts });
}
/**
 * @openapi
 * /api/activities/posts:
 *   get:
 *     tags:
 *       - activity
 *     summary: List all activity posts
 *     responses:
 *       200:
 *         description: List of activity posts
 *     security:
 *       - bearerAuth: []
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActivityPost'
 */


async function updatePost(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const updated = await ActivityService.updatePost(id, req.user.user_id, req.body);
    return res.json(updated);
  } catch (err) {
    if (err.message === 'not_found') return res.status(404).json({ error: 'not_found' });
    if (err.message === 'forbidden') return res.status(403).json({ error: 'forbidden' });
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}
/**
 * @openapi
 * /api/activities/posts/{id}:
 *   put:
 *     tags:
 *       - activity
 *     summary: Update an existing activity post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the post to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               activity_type_id:
 *                 type: integer
 *                 description: ID of the activity type
 *                 example: 2
 *               description:
 *                 type: string
 *                 description: Human readable description of the activity
 *                 example: "Geänderter Lauf am Nachmittag"
 *               start_time:
 *                 type: string
 *                 format: date-time
 *                 description: ISO 8601 start time
 *                 example: "2025-11-27T16:30:00Z"
 *               end_time:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 description: ISO 8601 end time (optional)
 *                 example: "2025-11-27T17:15:00Z"
 *               latitude:
 *                 type: number
 *                 format: float
 *                 description: Optional location latitude
 *                 example: 48.1351
 *               longitude:
 *                 type: number
 *                 format: float
 *                 description: Optional location longitude
 *                 example: 11.5820
 *               status:
 *                 type: string
 *                 enum: [offen, abgeschlossen, abgebrochen]
 *                 description: Post status
 *                 example: offen
 *           example:
 *             activity_type_id: 2
 *             description: "Evening run by the river"
 *             start_time: "2025-11-27T18:00:00Z"
 *             end_time: "2025-11-27T19:00:00Z"
 *             latitude: 48.137154
 *             longitude: 11.576124
 *             status: offen
 *     responses:
 *       200:
 *         description: Updated activity post
 *       400:
 *         description: Invalid ID
 *       403:
 *         description: Forbidden (not your post)
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */

async function deletePost(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const deleted = await ActivityService.deletePost(id, req.user.user_id);
    return res.json({ success: true, deleted });
  } catch (err) {
    if (err.message === 'not_found') return res.status(404).json({ error: 'not_found' });
    if (err.message === 'forbidden') return res.status(403).json({ error: 'forbidden' });
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}
/**
 * @openapi
 * /api/activities/posts/{id}:
 *   delete:
 *     tags:
 *       - activity
 *     summary: Delete an activity post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid ID
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 *       500:
 *         description: Server error
 */

async function listPostsBySelf(req, res) {
  const userId = req.user.user_id;
  const posts = await ActivityService.listPostsBySelf(userId);
  return res.json({ data: posts });
}

/**
 * @openapi
 * /api/activities/self:
 *   get:
 *     tags:
 *       - activity
 *     summary: List all posts created or joined by the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of posts by self
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActivityPost'
 */

async function listPostsByUser(req, res) {
  const userId = parseInt(req.params.userId, 10);
  if (Number.isNaN(userId)) return res.status(400).json({ error: 'invalid id' });
  const posts = await ActivityService.listPostsByUser(userId);
  return res.json({ data: posts });
}

/**
 * @openapi
 * /api/activities/user/{userId}:
 *   get:
 *     tags:
 *       - activity
 *     summary: List all posts by a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of posts by user
 *     security:
 *       - bearerAuth: []
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActivityPost'
 *       400:
 *         description: Invalid user ID
 */

module.exports = {
  createType,
  listTypes,
  createPost,
  getPost,
  listPosts,
  updatePost,
  deletePost,
  listPostsByUser,
  listPostsBySelf,
};

/**
 * @openapi
 * /api/activities/posts/{id}/participants:
 *   get:
 *     tags:
 *       - activity
 *     summary: List participants of a post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of participants
 */
async function listParticipants(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const participants = await listParticipantsSvc(id);
    return res.json({ data: participants });
  } catch (err) {
    if (err.message === 'not_found') return res.status(404).json({ error: 'not_found' });
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/**
 * @openapi
 * /api/activities/posts/{id}/join:
 *   post:
 *     tags:
 *       - activity
 *     summary: Join an activity post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Joined
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
async function joinPost(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const added = await joinPostSvc(id, req.user.user_id);
    return res.json({ success: true, added });
  } catch (err) {
    if (err.message === 'not_found') return res.status(404).json({ error: 'not_found' });
    if (err.message === 'owner_cannot_join') return res.status(400).json({ error: 'owner_cannot_join' });
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

/**
 * @openapi
 * /api/activities/posts/{id}/leave:
 *   post:
 *     tags:
 *       - activity
 *     summary: Leave an activity post
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Left
 */
async function leavePost(req, res) {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const removed = await leavePostSvc(id, req.user.user_id);
    return res.json({ success: true, removed });
  } catch (err) {
    if (err.message === 'not_found') return res.status(404).json({ error: 'not_found' });
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}

// append new handlers to exports
module.exports = Object.assign(module.exports, { listParticipants, joinPost, leavePost });

