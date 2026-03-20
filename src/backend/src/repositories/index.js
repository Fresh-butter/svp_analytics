const { PartnerRepository } = require('./partnerRepository');
const { InvesteeRepository } = require('./investeeRepository');
const { GroupRepository } = require('./groupRepository');
const { AppointmentRepository } = require('./appointmentRepository');
const { UserRepository } = require('./userRepository');
const { ChapterRepository } = require('./chapterRepository');
const { RecurringAppointmentRepository } = require('./recurringAppointmentRepository');
const { GroupTypeRepository, AppointmentTypeRepository } = require('./lookupRepository');

module.exports = {
  PartnerRepository,
  InvesteeRepository,
  GroupRepository,
  AppointmentRepository,
  UserRepository,
  ChapterRepository,
  RecurringAppointmentRepository,
  GroupTypeRepository,
  AppointmentTypeRepository,
};
