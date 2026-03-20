const { AuthController } = require('./authController');
const { PartnerController } = require('./partnerController');
const { InvesteeController } = require('./investeeController');
const { GroupController } = require('./groupController');
const { AppointmentController } = require('./appointmentController');
const { RecurringAppointmentController } = require('./recurringAppointmentController');
const { LookupController } = require('./lookupController');
const { FeedbackController } = require('./feedbackController');
const { AnalyticsController } = require('./analyticsController');

module.exports = {
  AuthController,
  PartnerController,
  InvesteeController,
  GroupController,
  AppointmentController,
  RecurringAppointmentController,
  LookupController,
  FeedbackController,
  AnalyticsController,
};
