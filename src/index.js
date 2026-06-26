require('./lib/util/setup');
const { envParseString } = require('@skyra/env-utilities');
const { CadiaClient } = require('./lib/CadiaClient');
const { EmbedBuilder } = require('discord.js');
const { isMysqlConnected } = require('./lib/database/mysql');
const { startBotIpcServer } = require('./lib/ipc/botIpcServer');
const { color, emojis } = require('./config');

const client = new CadiaClient();
let shuttingDown = false;
let ipcServer = null;

// Reminder System //
const reminderSchema = require('./lib/schemas/reminderSchema');
let checkingReminders = false;

client.reminderTimer = setInterval(async () => {
	if (checkingReminders || !isMysqlConnected()) return;

	checkingReminders = true;
	try {
		const reminders = await reminderSchema.find();
		const dueReminders = reminders.filter((reminder) => reminder.Time <= Date.now());

		for (const reminder of dueReminders) {
			await sendReminder(reminder).catch((error) => client.logger.warn(`Reminder delivery failed: ${error.message}`));
		}
	} catch (error) {
		client.logger.warn(`Reminder scan skipped: ${error.message}`);
	} finally {
		checkingReminders = false;
	}
}, 1000 * 5);

async function sendReminder(reminder) {
	const user = await client.users.fetch(reminder.User).catch(() => null);
	if (!user) return;

	await user.send({
		embeds: [
			new EmbedBuilder()
				.setColor(`${color.default}`)
				.setDescription(`${emojis.custom.wave} You asked me to **remind** you about "\`${reminder.Remind}\`"`)
		]
	});

	await reminderSchema.deleteMany({
		Time: reminder.Time,
		User: user.id,
		Remind: reminder.Remind
	});
}

const main = async () => {
	try {
		client.logger.info('Logging in');
		await client.login(envParseString('TOKEN'));
		try {
			ipcServer = startBotIpcServer(client);
		} catch (error) {
			client.logger.warn(`Cadia IPC server disabled: ${error.message}`);
		}
		client.logger.info('logged in');
	} catch (error) {
		client.logger.fatal(error);
		client.destroy();
		process.exit(1);
	}
};

main();

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.once(signal, () => gracefulShutdown(signal));
}

async function gracefulShutdown(signal) {
	if (shuttingDown) return;
	shuttingDown = true;
	client.logger.warn(`Received ${signal}. Starting graceful shutdown.`);
	try {
		client.disableActivityRotation = true;
		ipcServer?.close();
		client.destroy();
	} finally {
		setTimeout(() => process.exit(0), 500).unref();
	}
}
