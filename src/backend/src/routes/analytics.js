const { Router } = require('express');
const { AnalyticsController } = require('../controllers');
const { authenticate } = require('../middleware/auth');

const router = Router();

router.get('/attendance-by-partner', authenticate, (req, res) => {
  // #swagger.tags = ['Analytics']
  // #swagger.summary = 'Attendance by Partner'
  // #swagger.description = 'Returns partner engagement stats: meetings attended, hours spent, last meeting date'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['from_month'] = {
       in: 'query',
       required: true,
       type: 'string',
       format: 'YYYY-MM',
       description: 'Start month (format: YYYY-MM)'
     } */
  /* #swagger.parameters['to_month'] = {
       in: 'query',
       required: true,
       type: 'string',
       format: 'YYYY-MM',
       description: 'End month (format: YYYY-MM)'
     } */
  /* #swagger.parameters['investee_id'] = {
       in: 'query',
       type: 'string',
       format: 'uuid',
       description: 'Optional investee filter'
     } */
  /* #swagger.parameters['appointment_type_id'] = {
       in: 'query',
       type: 'string',
       format: 'uuid',
       description: 'Optional appointment type filter'
     } */
  /* #swagger.responses[200] = {
       description: 'Partner analytics data',
       schema: {
         type: 'object',
         properties: {
           success: { type: 'boolean' },
           data: { type: 'array' }
         }
       }
     } */
  return AnalyticsController.attendanceByPartner(req, res);
});

router.get('/metrics-by-category', authenticate, (req, res) => {
  // #swagger.tags = ['Analytics']
  // #swagger.summary = 'Metrics by Category'
  // #swagger.description = 'Returns category metrics: meetings count, distinct partners, hours, average duration'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['from_month'] = {
       in: 'query',
       required: true,
       type: 'string',
       format: 'YYYY-MM',
       description: 'Start month (format: YYYY-MM)'
     } */
  /* #swagger.parameters['to_month'] = {
       in: 'query',
       required: true,
       type: 'string',
       format: 'YYYY-MM',
       description: 'End month (format: YYYY-MM)'
     } */
  /* #swagger.parameters['partner_id'] = {
       in: 'query',
       type: 'string',
       format: 'uuid',
       description: 'Optional partner filter'
     } */
  /* #swagger.parameters['appointment_type_id'] = {
       in: 'query',
       type: 'string',
       format: 'uuid',
       description: 'Optional appointment type filter'
     } */
  /* #swagger.responses[200] = {
       description: 'Category metrics data'
     } */
  return AnalyticsController.metricsByCategory(req, res);
});

router.get('/monthly-engagement', authenticate, (req, res) => {
  // #swagger.tags = ['Analytics']
  // #swagger.summary = 'Monthly Engagement'
  // #swagger.description = 'Returns monthly engagement: meetings count, distinct partners engaged'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['from_month'] = {
       in: 'query',
       required: true,
       type: 'string',
       format: 'YYYY-MM',
       description: 'Start month (format: YYYY-MM)'
     } */
  /* #swagger.parameters['to_month'] = {
       in: 'query',
       required: true,
       type: 'string',
       format: 'YYYY-MM',
       description: 'End month (format: YYYY-MM)'
     } */
  /* #swagger.parameters['investee_id'] = {
       in: 'query',
       type: 'string',
       format: 'uuid',
       description: 'Optional investee filter'
     } */
  /* #swagger.parameters['appointment_type_id'] = {
       in: 'query',
       type: 'string',
       format: 'uuid',
       description: 'Optional appointment type filter'
     } */
  /* #swagger.responses[200] = {
       description: 'Monthly engagement data'
     } */
  return AnalyticsController.monthlyEngagement(req, res);
});

router.get('/investee-analytics', authenticate, (req, res) => {
  // #swagger.tags = ['Analytics']
  // #swagger.summary = 'Investee Analytics'
  // #swagger.description = 'Returns investee metrics: meetings count, hours spent, average duration'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['from_month'] = {
       in: 'query',
       required: true,
       type: 'string',
       format: 'YYYY-MM',
       description: 'Start month (format: YYYY-MM)'
     } */
  /* #swagger.parameters['to_month'] = {
       in: 'query',
       required: true,
       type: 'string',
       format: 'YYYY-MM',
       description: 'End month (format: YYYY-MM)'
     } */
  /* #swagger.parameters['appointment_type_id'] = {
       in: 'query',
       type: 'string',
       format: 'uuid',
       description: 'Optional appointment type filter'
     } */
  /* #swagger.responses[200] = {
       description: 'Investee analytics data'
     } */
  return AnalyticsController.investeeAnalytics(req, res);
});

router.get('/export-appointments', authenticate, (req, res) => {
  // #swagger.tags = ['Analytics']
  // #swagger.summary = 'Export detailed appointment rows'
  // #swagger.description = 'Returns a detailed row-per-partner list for appointments within a date range (YYYY-MM-DD).'
  /* #swagger.security = [{ "bearerAuth": [] }] */
  /* #swagger.parameters['from_date'] = { in: 'query', required: true, type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' } */
  /* #swagger.parameters['to_date'] = { in: 'query', required: true, type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' } */
  return AnalyticsController.exportAppointments(req, res);
});

module.exports = router;
