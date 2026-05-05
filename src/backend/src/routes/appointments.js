const { Router } = require('express');
const { AppointmentController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'List appointments'
    // #swagger.description = 'Returns appointments for a chapter, paginated by month and year. Partner users are automatically scoped to their assigned meetings.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.parameters['chapter_id'] = {
         in: 'query',
         type: 'string',
         format: 'uuid',
         description: 'Chapter UUID (defaults to authenticated user chapter)'
       } */
    /* #swagger.parameters['month'] = {
         in: 'query',
         type: 'integer',
         description: 'Month number (1-12). Defaults to current month.'
       } */
    /* #swagger.parameters['year'] = {
         in: 'query',
         type: 'integer',
         description: 'Year (e.g. 2025). Defaults to current year.'
       } */
    /* #swagger.responses[200] = {
         description: 'List of appointments with pagination metadata',
         content: {
           "application/json": {
             schema: {
               type: 'object',
               properties: {
                 success: { type: 'boolean' },
                 data: { type: 'array', items: { type: 'object' } },
                 pagination: {
                   type: 'object',
                   properties: {
                     month: { type: 'integer' },
                     year: { type: 'integer' },
                     total: { type: 'integer' }
                   }
                 }
               }
             }
           }
         }
       } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return AppointmentController.list(req, res);
});

  router.get('/notifications', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'List overdue pending appointments for the current user'
    // #swagger.description = 'Returns pending appointments in the past that are assigned to the authenticated user. Partners only see meetings assigned to them.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.responses[200] = { description: 'Notification appointments' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return AppointmentController.notifications(req, res);
  });

  router.get('/assigned', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'List appointments assigned to the current partner'
    // #swagger.description = 'For partner users returns all assigned appointments; admins can use partner_id query when needed.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    return AppointmentController.assigned(req, res);
  });

router.get('/:id', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'Get appointment by ID'
    // #swagger.description = 'Returns an appointment with investee, recurring appointment, and partners details.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.parameters['id'] = {
         in: 'path',
         required: true,
         type: 'string',
         format: 'uuid',
         description: 'Appointment UUID'
       } */
    /* #swagger.responses[200] = { description: 'Appointment details' } */
    /* #swagger.responses[404] = { description: 'Appointment not found' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return AppointmentController.get(req, res);
});

router.post('/', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'Create a new appointment'
    // #swagger.description = 'Creates a new appointment with optional partner and investee associations.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.requestBody = {
         required: true,
         content: {
           "application/json": {
             schema: {
               type: 'object',
               properties: {
                 chapter_id: { type: 'string', format: 'uuid' },
                 start_at: { type: 'string', format: 'date-time', example: '2025-03-15T10:00:00Z' },
                 end_at: { type: 'string', format: 'date-time', example: '2025-03-15T11:00:00Z' },
                 appointment_type_id: { type: 'string', format: 'uuid' },
                 group_type_id: { type: 'string', format: 'uuid' },
                 investee_id: { type: 'string', format: 'uuid' },
                 group_id: { type: 'string', format: 'uuid' },
                 status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'CANCELLED'], example: 'PENDING' },
                 partners: {
                   type: 'array',
                   items: { type: 'string', format: 'uuid' },
                   description: 'Array of partner UUIDs'
                 }
               }
             }
           }
         }
       } */
    /* #swagger.responses[201] = { description: 'Appointment created' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return AppointmentController.create(req, res);
});

router.put('/:id', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'Update an appointment'
    // #swagger.description = 'Update appointment details. Can include start_at, end_at, type, investee, partners, and status.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.parameters['id'] = {
         in: 'path',
         required: true,
         type: 'string',
         format: 'uuid',
         description: 'Appointment UUID'
       } */
    /* #swagger.requestBody = {
         required: true,
         content: {
           "application/json": {
             schema: {
               type: 'object',
               properties: {
                 start_at: { type: 'string', format: 'date-time' },
                 end_at: { type: 'string', format: 'date-time' },
                 appointment_type_id: { type: 'string', format: 'uuid' },
                 group_type_id: { type: 'string', format: 'uuid' },
                 investee_id: { type: 'string', format: 'uuid' },
                 group_id: { type: 'string', format: 'uuid' },
                 status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'CANCELLED'] },
                 partners: {
                   type: 'array',
                   items: { type: 'string', format: 'uuid' }
                 }
               }
             }
           }
         }
       } */
    /* #swagger.responses[200] = { description: 'Appointment updated' } */
    /* #swagger.responses[404] = { description: 'Appointment not found' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return AppointmentController.update(req, res);
});

router.patch('/:id/complete', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'Mark appointment as completed'
    // #swagger.description = 'Marks an appointment as completed and records partner attendance.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.parameters['id'] = {
         in: 'path',
         required: true,
         type: 'string',
         format: 'uuid',
         description: 'Appointment UUID'
       } */
    /* #swagger.requestBody = {
         required: true,
         content: {
           "application/json": {
             schema: {
               type: 'object',
               required: ['attendance'],
               properties: {
                 attendance: {
                   type: 'array',
                   items: {
                     type: 'object',
                     required: ['partner_id', 'is_present'],
                     properties: {
                       partner_id: { type: 'string', format: 'uuid' },
                       is_present: { type: 'boolean' },
                       absent_informed: { type: 'boolean', nullable: true }
                     }
                   },
                   example: [
                     { partner_id: '550e8400-e29b-41d4-a716-446655440000', is_present: true, absent_informed: null },
                     { partner_id: '660e8400-e29b-41d4-a716-446655440001', is_present: false, absent_informed: true }
                   ]
                 }
               }
             }
           }
         }
       } */
    /* #swagger.responses[200] = { description: 'Appointment marked as completed' } */
    /* #swagger.responses[400] = { description: 'attendance array is required' } */
    /* #swagger.responses[404] = { description: 'Appointment not found or already completed' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return AppointmentController.complete(req, res);
});

router.delete('/:id', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'Delete an appointment'
    // #swagger.description = 'Deletes an appointment and cascades to appointment_partners.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.parameters['id'] = {
         in: 'path',
         required: true,
         type: 'string',
         format: 'uuid',
         description: 'Appointment UUID'
       } */
    /* #swagger.responses[200] = { description: 'Appointment deleted' } */
    /* #swagger.responses[404] = { description: 'Appointment not found' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return AppointmentController.remove(req, res);
});

  router.post('/import', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'Import appointments'
    // #swagger.description = 'Bulk import appointments (JSON array of rows). Validates uniqueness by name and by date+name.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.requestBody = { required: true, content: { "application/json": { schema: { type: 'object', properties: { rows: { type: 'array' } } } } } } */
    return AppointmentController.import(req, res);
  });

module.exports = router;
