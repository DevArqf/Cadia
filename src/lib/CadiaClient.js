const { SapphireClient } = require('@sapphire/framework');
const { ClientConfig } = require('../config');

class CadiaClient extends SapphireClient {
	constructor() {
		super(ClientConfig);
	}

	/**
	 *
	 * @param {string} token The token to login with
	 * @returns {Promise<string>} The token used to login
	 */
	async login(token) {
		return super.login(token);
	}

	destroy() {
		if (this.activityRotationTimer) {
			clearInterval(this.activityRotationTimer);
			this.activityRotationTimer = null;
		}
		if (this.topggStatsPoster) {
			clearInterval(this.topggStatsPoster);
			this.topggStatsPoster = null;
		}
		if (this.reminderTimer) {
			clearInterval(this.reminderTimer);
			this.reminderTimer = null;
		}

		return super.destroy();
	}
}

module.exports = {
	CadiaClient
};
