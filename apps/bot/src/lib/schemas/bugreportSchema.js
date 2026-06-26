const { createModel } = require('../database/model');

const BugReportBlacklist = createModel('bugreportSchema');

module.exports = { BugReportBlacklist };
