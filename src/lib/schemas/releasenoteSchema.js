const { createModel } = require('../database/model');

const ReleaseNotesSchema = createModel('releasenoteSchema');

module.exports = { ReleaseNotesSchema };
