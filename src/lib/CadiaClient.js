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
		// container.db = prisma;

		return super.login(token);
	}
	destroy() {
		return super.destroy();
	}
}

module.exports = {
	CadiaClient
};
