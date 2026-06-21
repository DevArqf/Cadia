const { SapphireClient } = require('@sapphire/framework');
const { ClientConfig } = require('../config');

class CadiaClient extends SapphireClient {
	constructor() {
		super(ClientConfig);
	}

	destroy() {
		clearManagedTimers(this);
		return super.destroy();
	}
}

function clearManagedTimers(client) {
	for (const timerName of ['activityRotationTimer', 'topggStatsPoster', 'reminderTimer']) {
		if (!client[timerName]) continue;
		clearInterval(client[timerName]);
		client[timerName] = null;
	}
}

module.exports = {
	CadiaClient,
	clearManagedTimers
};
