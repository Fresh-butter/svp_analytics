const { Router } = require('express');
const { AppointmentController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'List appointments'
  // #swagger.description = 'Returns appointments for the authenticated user chapter, paginated by month and year. Defaults to current month/year.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
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

router.get('/:id', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'Get appointment by ID'
  // #swagger.description = 'Returns a single appointment with associated partners (attendance), investee details, and recurring appointment details. Accepts optional month/year context and returns pagination metadata (defaults to current month/year).'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.parameters['id'] = {
         in: 'path',
         required: true,
         type: 'string',
         format: 'uuid',
         description: 'Appointment UUID'
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
    /* #swagger.responses[200] = { description: 'Appointment details' } */
    /* #swagger.responses[404] = { description: 'Appointment not found' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return AppointmentController.get(req, res);
});

router.post('/', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'Create a new appointment'
  // #swagger.description = 'Creates a new appointment from explicit payload data (including explicit partners list). chapter_id is derived from auth token.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.requestBody = {
         required: true,
         content: {
           "application/json": {
             schema: {
               type: 'object',
               required: ['appointment_name', 'occurrence_date', 'start_time', 'end_time'],
               properties: {
                 appointment_name: { type: 'string', maxLength: 200 },
                 occurrence_date: { type: 'string', format: 'date', example: '2026-04-17' },
                 start_time: { type: 'string', example: '10:00:00', description: 'IST local time' },
                 end_time: { type: 'string', example: '11:00:00', description: 'IST local time' },
                 appointment_type_id: { type: 'string', format: 'uuid' },
                 group_type_id: { type: 'string', format: 'uuid' },
                 investee_id: { type: 'string', format: 'uuid' },
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
  // #swagger.description = 'Update appointment details. Status transitions are handled by /complete, /cancel, and /pending endpoints.'
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
                 occurrence_date: { type: 'string', format: 'date' },
                 start_time: { type: 'string', example: '10:00:00', description: 'IST local time' },
                 end_time: { type: 'string', example: '11:00:00', description: 'IST local time' },
                 appointment_type_id: { type: 'string', format: 'uuid' },
                 group_type_id: { type: 'string', format: 'uuid' },
                 investee_id: { type: 'string', format: 'uuid' },
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
  // #swagger.description = 'Marks a PENDING appointment as completed and records partner attendance.'
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
               required: ['attendance', 'actual_meeting_minutes'],
               properties: {
                 actual_meeting_minutes: { type: 'integer', minimum: 0, description: 'Actual meeting minutes recorded at completion time' },
                 attendance: {
                   type: 'array',
                   items: {
                     type: 'object',
                     required: ['partner_id', 'attendance_status'],
                     properties: {
                       partner_id: { type: 'string', format: 'uuid' },
                       attendance_status: {
                         type: 'string',
                         enum: ['ABSENT_NOT_INFORMED', 'ABSENT_INFORMED', 'PRESENT']
                       }
                     }
                   },
                   example: [
                     { partner_id: '550e8400-e29b-41d4-a716-446655440000', attendance_status: 'PRESENT' },
                     { partner_id: '660e8400-e29b-41d4-a716-446655440001', attendance_status: 'ABSENT_INFORMED' }
                   ]
                 }
               }
             }
           }
         }
       } */
    /* #swagger.responses[200] = { description: 'Appointment marked as completed' } */
    /* #swagger.responses[400] = { description: 'attendance array is required' } */
    /* #swagger.responses[404] = { description: 'Appointment not found or not in PENDING status' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return AppointmentController.complete(req, res);
});

  router.patch('/:id/cancel', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'Mark appointment as cancelled'
    // #swagger.description = 'Marks appointment as CANCELLED and clears completion artifacts.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Appointment UUID'
       } */
    /* #swagger.responses[200] = { description: 'Appointment marked as cancelled' } */
    /* #swagger.responses[404] = { description: 'Appointment not found' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return AppointmentController.cancel(req, res);
  });

  router.patch('/:id/pending', authenticate, (req, res) => {
    // #swagger.tags = ['Appointments']
    // #swagger.summary = 'Mark appointment as pending'
    // #swagger.description = 'Marks appointment as PENDING and clears completion artifacts.'
    /* #swagger.security = [{ "bearerAuth": [] }] */
    /* #swagger.parameters['id'] = {
       in: 'path',
       required: true,
       type: 'string',
       format: 'uuid',
       description: 'Appointment UUID'
       } */
    /* #swagger.responses[200] = { description: 'Appointment marked as pending' } */
    /* #swagger.responses[404] = { description: 'Appointment not found' } */
    /* #swagger.responses[500] = { description: 'Internal server error' } */
    return AppointmentController.pending(req, res);
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
