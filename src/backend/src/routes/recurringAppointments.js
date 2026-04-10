const { Router } = require('express');
const { RecurringAppointmentController } = require('../controllers');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, (req, res) => {
  // #swagger.tags = ['Recurring Appointments']
  // #swagger.summary = 'List recurring appointment templates'
  // #swagger.description = 'Returns all recurring appointment templates for a chapter.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['chapter_id'] = {
       in: 'query',
       type: 'string',
       format: 'uuid',
       description: 'Chapter UUID (defaults to authenticated user chapter)'
     } */
  /* #swagger.responses[200] = { description: 'List of recurring appointment templates' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return RecurringAppointmentController.list(req, res);
});

router.get('/:id', authenticate, (req, res) => {
  // #swagger.tags = ['Recurring Appointments']
  // #swagger.summary = 'Get recurring appointment by ID'
  // #swagger.description = 'Returns a recurring appointment template with partners, group and investee details.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Recurring appointment UUID'
     } */
  /* #swagger.responses[200] = { description: 'Recurring appointment details' } */
  /* #swagger.responses[404] = { description: 'Recurring appointment not found' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return RecurringAppointmentController.get(req, res);
});

router.post('/', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Recurring Appointments']
  // #swagger.summary = 'Create a recurring appointment template'
  // #swagger.description = 'Creates a new recurring appointment template with an rrule schedule. end_date cannot be more than 1 year from today.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['chapter_id', 'start_time', 'duration_minutes', 'rrule', 'start_date', 'end_date', 'appointment_type_id'],
             properties: {
               chapter_id: { type: 'string', format: 'uuid' },
               start_time: { type: 'string', example: '10:00' },
               duration_minutes: { type: 'integer', example: 60 },
               rrule: { type: 'string', example: 'FREQ=WEEKLY;BYDAY=MO' },
               start_date: { type: 'string', format: 'date', example: '2025-01-01' },
               end_date: { type: 'string', format: 'date', example: '2025-06-30' },
               appointment_type_id: { type: 'string', format: 'uuid' },
               group_type_id: { type: 'string', format: 'uuid' },
               investee_id: { type: 'string', format: 'uuid' },
               group_id: { type: 'string', format: 'uuid' },
               partners: {
                 type: 'array',
                 items: { type: 'string', format: 'uuid' },
                 description: 'Optional partner UUIDs subset'
               }
             }
           }
         }
       }
     } */
  /* #swagger.responses[201] = { description: 'Recurring appointment created' } */
  /* #swagger.responses[400] = { description: 'Validation error (missing fields, invalid rrule, or end_date too far)' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return RecurringAppointmentController.create(req, res);
});

router.post('/:id/materialize', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Recurring Appointments']
  // #swagger.summary = 'Manually materialize an occurrence'
  // #swagger.description = 'Creates a PENDING appointment for a specific occurrence_date from a recurring template. The date must fall within the template range and be a valid rrule occurrence.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Recurring appointment UUID'
     } */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             required: ['occurrence_date'],
             properties: {
               occurrence_date: { type: 'string', format: 'date', example: '2025-01-15' }
             }
           }
         }
       }
     } */
  /* #swagger.responses[201] = { description: 'Occurrence materialized as a new appointment' } */
  /* #swagger.responses[400] = { description: 'Validation error (missing date, out of range, or not a valid rrule occurrence)' } */
  /* #swagger.responses[404] = { description: 'Recurring appointment not found' } */
  /* #swagger.responses[409] = { description: 'This occurrence has already been materialized' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return RecurringAppointmentController.materialize(req, res);
});

router.put('/:id', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Recurring Appointments']
  // #swagger.summary = 'Update a recurring appointment template'
  // #swagger.description = 'Updates a template. Only affects unmaterialized occurrences. Validates rrule and end_date if provided.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Recurring appointment UUID'
     } */
  /* #swagger.requestBody = {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: 'object',
             properties: {
               start_time: { type: 'string' },
               duration_minutes: { type: 'integer' },
               rrule: { type: 'string' },
               start_date: { type: 'string', format: 'date' },
               end_date: { type: 'string', format: 'date' },
               appointment_type_id: { type: 'string', format: 'uuid' },
               group_type_id: { type: 'string', format: 'uuid' },
               investee_id: { type: 'string', format: 'uuid' },
               group_id: { type: 'string', format: 'uuid' },
               partners: {
                 type: 'array',
                 items: { type: 'string', format: 'uuid' }
               }
             }
           }
         }
       }
     } */
  /* #swagger.responses[200] = { description: 'Recurring appointment updated' } */
  /* #swagger.responses[400] = { description: 'Validation error (invalid rrule or end_date too far)' } */
  /* #swagger.responses[404] = { description: 'Recurring appointment not found' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return RecurringAppointmentController.update(req, res);
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  // #swagger.tags = ['Recurring Appointments']
  // #swagger.summary = 'Delete a recurring appointment template'
  // #swagger.description = 'Deletes the template. Sets rec_appointment_id = NULL in materialized appointments.'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Recurring appointment UUID'
     } */
  /* #swagger.responses[200] = { description: 'Recurring appointment deleted' } */
  /* #swagger.responses[404] = { description: 'Recurring appointment not found' } */
  /* #swagger.responses[500] = { description: 'Internal server error' } */
  return RecurringAppointmentController.remove(req, res);
});

module.exports = router;
