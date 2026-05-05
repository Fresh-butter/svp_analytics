const { Router } = require('express');
const { GroupController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, (req, res) => {
  // #swagger.tags = ['Groups']
  // #swagger.summary = 'List all groups'
  // #swagger.description = 'Returns groups for a chapter. Supports filtering by active status and group type.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['chapter_id'] = {
       in: 'query',
       type: 'string',
       format: 'uuid',
       description: 'Chapter UUID (defaults to authenticated user chapter)'
     } */
  /* #swagger.parameters['active'] = {
       in: 'query',
       type: 'string',
       enum: ['true', 'false'],
       description: 'Filter by active status'
     } */
  /* #swagger.parameters['group_type'] = {
       in: 'query',
       type: 'string',
       description: 'Filter by group type'
     } */
  /* #swagger.responses[200] = { description: 'List of groups' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return GroupController.list(req, res);
});

router.get('/mine/ids', authenticate, (req, res) => {
  // #swagger.tags = ['Groups']
  // #swagger.summary = 'List active group IDs for current partner'
  // #swagger.description = 'Returns active group IDs assigned to the authenticated partner account.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.responses[200] = { description: 'Group ID list' } */
  /* #swagger.responses[403] = { description: 'Forbidden (partner only)' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return GroupController.myGroupIds(req, res);
});

router.get('/:id', authenticate, (req, res) => {
  // #swagger.tags = ['Groups']
  // #swagger.summary = 'Get group by ID'
  // #swagger.description = 'Returns a group with its member partners.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Group UUID'
     } */
  /* #swagger.responses[200] = { description: 'Group details with members' } */
  /* #swagger.responses[404] = { description: 'Group not found' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return GroupController.get(req, res);
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Groups']
  // #swagger.summary = 'Create a new group'
  // #swagger.description = 'Creates a new group. Requires chapter_id, group_name, group_type_id, and start_date.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['chapter_id', 'group_name', 'group_type_id', 'start_date'],
             properties: {
               chapter_id: { type: 'string', format: 'uuid' },
               investee_id: { type: 'string', format: 'uuid' },
               group_name: { type: 'string', example: 'Alpha Team' },
               group_type_id: { type: 'string', format: 'uuid' },
               start_date: { type: 'string', format: 'date', example: '2025-01-15' },
               end_date: { type: 'string', format: 'date' },
               is_active: { type: 'boolean', example: true }
             }
           }
         }
       }
     } */
  /* #swagger.responses[201] = { description: 'Group created' } */
  /* #swagger.responses[400] = { description: 'Validation error' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return GroupController.create(req, res);
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Groups']
  // #swagger.summary = 'Update a group'
  // #swagger.description = 'Update group metadata by ID.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Group UUID'
     } */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             properties: {
               group_name: { type: 'string' },
               group_type_id: { type: 'string', format: 'uuid' },
               investee_id: { type: 'string', format: 'uuid' },
               start_date: { type: 'string', format: 'date' },
               end_date: { type: 'string', format: 'date' },
               is_active: { type: 'boolean' }
             }
           }
         }
       }
     } */
  /* #swagger.responses[200] = { description: 'Group updated' } */
  /* #swagger.responses[400] = { description: 'Validation error' } */
  /* #swagger.responses[404] = { description: 'Group not found' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return GroupController.update(req, res);
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Groups']
  // #swagger.summary = 'Delete a group'
  // #swagger.description = 'Deletes a group. Blocked if referenced in recurring appointments.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Group UUID'
     } */
  /* #swagger.responses[200] = { description: 'Group deleted' } */
  /* #swagger.responses[404] = { description: 'Group not found' } */
  /* #swagger.responses[409] = { description: 'Group is referenced and cannot be deleted' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return GroupController.remove(req, res);
});

router.put('/:id/partners', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Groups']
  // #swagger.summary = 'Update group partners'
  // #swagger.description = 'Overwrites the list of partners assigned to a group.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Group UUID'
     } */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['chapter_id', 'partners'],
             properties: {
               chapter_id: { type: 'string', format: 'uuid' },
               partners: {
                 type: 'array',
                 items: {
                   type: 'object',
                   properties: {
                     partner_id: { type: 'string', format: 'uuid' },
                     role: { type: 'string' }
                   }
                 },
                 example: [{ partner_id: '550e8400-e29b-41d4-a716-446655440000', role: 'lead' }]
               }
             }
           }
         }
       }
     } */
  /* #swagger.responses[200] = { description: 'Group partners updated' } */
  /* #swagger.responses[400] = { description: 'Validation error' } */
  /* #swagger.responses[404] = { description: 'Group not found' } */
  /* #swagger.responses[409] = { description: 'Duplicate partner entries' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return GroupController.updatePartners(req, res);
});

module.exports = router;
