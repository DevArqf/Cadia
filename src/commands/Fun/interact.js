const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const {
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder
} = require('discord.js');
const profileschema = require('../../lib/schemas/interactionSchema');
const hug = require('../../lib/data/hug.json');
const slap = require('../../lib/data/slap.json');
const kill = require('../../lib/data/kill.json');
const kiss = require('../../lib/data/kiss.json');

const defaultStats = {
	HugGive: 0,
	Hug: 0,
	Fail: 0,
	Slap: 0,
	SlapGive: 0,
	Kill: 0,
	KillGive: 0,
	Err: 0,
	Kiss: 0,
	KissGive: 0
};

const actions = {
	hug: {
		label: 'Hug',
		verb: 'hugged',
		giveField: 'HugGive',
		receiveField: 'Hug',
		images: hug,
		selfMessage: 'You tried giving yourself a hug. It did not work.'
	},
	slap: {
		label: 'Slap',
		verb: 'slapped',
		giveField: 'SlapGive',
		receiveField: 'Slap',
		images: slap,
		selfMessage: 'You tried slapping yourself. That was an unusual choice.'
	},
	kill: {
		label: 'Kill',
		verb: 'defeated',
		giveField: 'KillGive',
		receiveField: 'Kill',
		images: kill,
		selfMessage: 'You tried defeating yourself. The mission failed.'
	},
	kiss: {
		label: 'Kiss',
		verb: 'kissed',
		giveField: 'KissGive',
		receiveField: 'Kiss',
		images: kiss,
		selfMessage: 'You tried kissing yourself. The mirror declined.'
	}
};

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Interact with a buddy of yours!'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('interact')
				.setDMPermission(false)
				.setDescription(this.description)
				.addSubcommand((command) => addUserAction(command, 'hug', 'Hug specified user.'))
				.addSubcommand((command) => addUserAction(command, 'slap', 'Slap specified user.'))
				.addSubcommand((command) => addUserAction(command, 'kill', 'Kill specified user.'))
				.addSubcommand((command) => addUserAction(command, 'kiss', 'Kiss specified user.'))
				.addSubcommand((command) =>
					command
						.setName('profile')
						.setDescription("Lists specified user's profile.")
						.addUserOption((option) =>
							option.setName('user').setDescription('Specified user will have their profile listed.').setRequired(false)
						)
				)
		);
	}

	async chatInputRun(interaction) {
		const sub = interaction.options.getSubcommand();
		const displayUser = interaction.options.getUser('user') || interaction.user;
		const member = interaction.options.getMember('user') || interaction.member;

		if (!member) {
			return interaction.reply({
				components: [
					buildPanel(
						color.fail,
						`${emojis.custom.fail} **User Not Found**`,
						`${emojis.custom.arrowright} That user does not exist within this server.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		if (sub === 'profile') return this.showProfile(interaction, displayUser);
		return this.runAction(interaction, displayUser, actions[sub]);
	}

	async runAction(interaction, target, action) {
		if (interaction.user.id === target.id) {
			await incrementStats(interaction.user.id, { Fail: 1 });
			return interaction.reply({
				components: [buildPanel(color.fail, `${emojis.custom.fail} **Action Failed**`, `${emojis.custom.arrowright} ${action.selfMessage}`)],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		await incrementStats(interaction.user.id, { [action.giveField]: 1 });
		await incrementStats(target.id, { [action.receiveField]: 1 });

		const image = action.images[Math.floor(Math.random() * action.images.length)];
		const container = new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.heart2} **${action.label} Delivered**`))
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`${emojis.custom.person} **From:** ${interaction.user}\n${emojis.custom.arrowright} **To:** ${target}\n${emojis.custom.comment} ${interaction.user} ${action.verb} ${target}.`
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(image).setDescription(action.label)));

		await interaction.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
	}

	async showProfile(interaction, user) {
		const data = await profileschema.findOne({ User: user.id });

		if (!data) {
			return interaction.reply({
				components: [
					buildPanel(
						color.fail,
						`${emojis.custom.fail} **No Interaction Profile**`,
						`${emojis.custom.arrowright} ${user} does not have any interaction statistics yet.`
					)
				],
				flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
			});
		}

		const container = new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.person} **${user.username}'s Interaction Profile**`))
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					[
						`${emojis.custom.mail} **Received**`,
						`${emojis.custom.arrowright} Hugs: \`${data.Hug}\``,
						`${emojis.custom.arrowright} Slaps: \`${data.Slap}\``,
						`${emojis.custom.arrowright} Kills: \`${data.Kill}\``,
						`${emojis.custom.arrowright} Kisses: \`${data.Kiss}\``
					].join('\n')
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					[
						`${emojis.custom.pencil} **Given**`,
						`${emojis.custom.arrowright} Hugs: \`${data.HugGive}\``,
						`${emojis.custom.arrowright} Slaps: \`${data.SlapGive}\``,
						`${emojis.custom.arrowright} Kills: \`${data.KillGive}\``,
						`${emojis.custom.arrowright} Kisses: \`${data.KissGive}\``,
						'',
						`${emojis.custom.warning} **Fails:** \`${data.Fail}\``,
						`${emojis.custom.fail} **Errors:** \`${data.Err}\``
					].join('\n')
				)
			);

		await interaction.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
	}
}

function addUserAction(command, name, description) {
	return command
		.setName(name)
		.setDescription(description)
		.addUserOption((option) => option.setName('user').setDescription('Specified user will receive this interaction.').setRequired(true));
}

async function incrementStats(userId, increments) {
	const data = (await profileschema.findOne({ User: userId })) ?? (await profileschema.create({ User: userId, ...defaultStats }));
	const update = {};

	for (const [key, increment] of Object.entries(increments)) {
		update[key] = (data[key] ?? 0) + increment;
	}

	await profileschema.updateOne({ User: userId }, { $set: update });
}

function buildPanel(accentColor, title, body) {
	return new ContainerBuilder()
		.setAccentColor(Number.parseInt(accentColor.replace('#', ''), 16))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
		.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
		.addTextDisplayComponents(new TextDisplayBuilder().setContent(body));
}

module.exports = {
	UserCommand
};
