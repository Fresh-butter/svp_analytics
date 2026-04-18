const { Router } = require('express');
const { GroupController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, (req, res) => {
    // #swagger.tags = ['Groups']
    // #swagger.summary = 'List all groups'
  // #swagger.description = 'Returns all groups for the authenticated user chapter (no pagination, no backend list filters).'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.responses[200] = { description: 'List of groups' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return GroupController.list(req, res);
});

router.get('/:id', authenticate, (req, res) => {
    // #swagger.tags = ['Groups']
    // #swagger.summary = 'Get group by ID'
  // #swagger.description = 'Returns a group with members, full investee details, group type details, and recurring appointments.'
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

router.post('/', authenticate, (req, res) => {
    // #swagger.tags = ['Groups']
    // #swagger.summary = 'Create a new group'
  // #swagger.description = 'Creates group metadata and optionally initial members. Requires group_name, group_type_id, and start_date. chapter_id is derived from auth token.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.requestBody = {
         required: true,
         content: {
           "application/json": {
             schema: {
               type: 'object',
               required: ['group_name', 'group_type_id', 'start_date'],
               properties: {
                 investee_id: { type: 'string', format: 'uuid' },
                 group_name: { type: 'string', example: 'Alpha Team' },
                 group_type_id: { type: 'string', format: 'uuid' },
                 start_date: { type: 'string', format: 'date', example: '2025-01-15' },
                 end_date: { type: 'string', format: 'date' },
                 members: {
                   type: 'array',
                   items: {
                     type: 'object',
                     required: ['partner_id', 'start_date'],
                     properties: {
                       partner_id: { type: 'string', format: 'uuid' },
                       start_date: { type: 'string', format: 'date', description: 'Required membership start date.' },
                       end_date: { type: 'string', format: 'date', nullable: true }
                     }
                   }
                 }
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

router.put('/:id', authenticate, (req, res) => {
    // #swagger.tags = ['Groups']
    // #swagger.summary = 'Update a group'
  // #swagger.description = 'Updates group metadata by ID and optionally replaces members if members array is provided.'
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
                 members: {
                   type: 'array',
                   items: {
                     type: 'object',
                     required: ['partner_id', 'start_date'],
                     properties: {
                       partner_id: { type: 'string', format: 'uuid' },
                       start_date: { type: 'string', format: 'date', description: 'Required membership start date.' },
                       end_date: { type: 'string', format: 'date', nullable: true }
                     }
                   }
                 }
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

router.delete('/:id', authenticate, (req, res) => {
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

router.put('/:id/members', authenticate, (req, res) => {
    // #swagger.tags = ['Groups']
    // #swagger.summary = 'Update group members'
  // #swagger.description = 'Replaces the full list of group memberships. Body requires members array. chapter_id is derived from auth token.'
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
               required: ['members'],
               properties: {
                 members: {
                   type: 'array',
                   items: {
                     type: 'object',
                     required: ['partner_id', 'start_date'],
                     properties: {
                       partner_id: { type: 'string', format: 'uuid' },
                       start_date: { type: 'string', format: 'date', description: 'Required membership start date.' },
                       end_date: { type: 'string', format: 'date', nullable: true }
                     }
                   },
                   example: [{ partner_id: '550e8400-e29b-41d4-a716-446655440000', start_date: '2026-04-17', end_date: null }]
                 }
               }
             }
           }
         }
       } */
    /* #swagger.responses[200] = { description: 'Group members updated' } */
    /* #swagger.responses[400] = { description: 'Validation error' } */
    /* #swagger.responses[404] = { description: 'Group not found' } */
    /* #swagger.responses[409] = { description: 'Duplicate partner entries' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return GroupController.updateMembers(req, res);
});

module.exports = router;
