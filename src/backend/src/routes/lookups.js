const { Router } = require('express');
const { LookupController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

// GROUP TYPES
router.get('/group-types', authenticate, (req, res) => {
  // #swagger.tags = ['Lookups']
  // #swagger.summary = 'List group types'
  // #swagger.description = 'Returns all group types for the authenticated user chapter.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.responses[200] = { description: 'List of group types' } */
  /* #swagger.responses[400] = { description: 'chapter_id is required (from token)' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return LookupController.listGroupTypes(req, res);
});

router.post('/group-types', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Lookups']
  // #swagger.summary = 'Create a group type'
  // #swagger.description = 'Creates a new group type for the authenticated user chapter.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['type_name'],
             properties: {
               type_name: { type: 'string', example: 'Board Committee' }
             }
           }
         }
       }
     } */
  /* #swagger.responses[201] = { description: 'Group type created' } */
  /* #swagger.responses[400] = { description: 'Validation error (type_name or chapter_id missing)' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return LookupController.createGroupType(req, res);
});

router.delete('/group-types/:id', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Lookups']
  // #swagger.summary = 'Delete a group type'
  // #swagger.description = 'Deletes a group type by ID. Blocked if referenced by groups.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Group type UUID'
     } */
  /* #swagger.responses[200] = { description: 'Group type deleted successfully' } */
  /* #swagger.responses[404] = { description: 'Group type not found' } */
  /* #swagger.responses[409] = { description: 'Group type is referenced and cannot be deleted' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return LookupController.removeGroupType(req, res);
});

// APPOINTMENT TYPES
router.get('/appointment-types', authenticate, (req, res) => {
  // #swagger.tags = ['Lookups']
  // #swagger.summary = 'List appointment types'
  // #swagger.description = 'Returns all appointment types for the authenticated user chapter.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.responses[200] = { description: 'List of appointment types' } */
  /* #swagger.responses[400] = { description: 'chapter_id is required (from token)' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return LookupController.listAppointmentTypes(req, res);
});

router.post('/appointment-types', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Lookups']
  // #swagger.summary = 'Create an appointment type'
  // #swagger.description = 'Creates a new appointment type for the authenticated user chapter.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['type_name'],
             properties: {
               type_name: { type: 'string', example: 'Monthly Review' }
             }
           }
         }
       }
     } */
  /* #swagger.responses[201] = { description: 'Appointment type created' } */
  /* #swagger.responses[400] = { description: 'Validation error (type_name or chapter_id missing)' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return LookupController.createAppointmentType(req, res);
});

router.delete('/appointment-types/:id', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Lookups']
  // #swagger.summary = 'Delete an appointment type'
  // #swagger.description = 'Deletes an appointment type by ID. Blocked if referenced.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Appointment type UUID'
     } */
  /* #swagger.responses[200] = { description: 'Appointment type deleted successfully' } */
  /* #swagger.responses[404] = { description: 'Appointment type not found' } */
  /* #swagger.responses[409] = { description: 'Appointment type is referenced and cannot be deleted' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return LookupController.removeAppointmentType(req, res);
});

module.exports = router;
