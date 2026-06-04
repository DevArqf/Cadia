const { createModel } = require('../database/model');

const WelcomeSchema = createModel('welcomeSchema');

module.exports = { WelcomeSchema };
