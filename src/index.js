require('./lib/util/setup');
const { envParseString } = require('@skyra/env-utilities');
const { CadiaClient } = require('./lib/CadiaClient');
const { EmbedBuilder } = require('discord.js');
const { isMysqlConnected } = require('./lib/database/mysql');
const { color, emojis } = require('./config');

const client = new CadiaClient();

// Reminder System //
const reminderSchema = require('./lib/schemas/reminderSchema');
let checkingReminders = false;

setInterval(async () => {
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

	await user
		.send({
			embeds: [
				new EmbedBuilder()
					.setColor(`${color.default}`)
					.setDescription(`${emojis.custom.wave} You asked me to **remind** you about "\`${reminder.Remind}\`"`)
			]
		})
		.catch(() => null);

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
		client.logger.info('logged in');
	} catch (error) {
		client.logger.fatal(error);
		client.destroy();
		process.exit(1);
	}
};

main();
