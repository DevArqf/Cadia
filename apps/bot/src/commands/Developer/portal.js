const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { componentReply, linkButton, notice, panel } = require('../../lib/util/components');

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Generate an invite link to a server (DEV ONLY)'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('portal')
				.setDescription(this.description)
				.addStringOption((option) => option.setName('server_id').setDescription('The server ID to generate an invite for').setRequired(true))
		);
	}

	async chatInputRun(interaction) {
		const serverId = interaction.options.getString('server_id', true);
		const guild = interaction.client.guilds.cache.get(serverId);

		if (!guild) {
			return interaction.reply(
				componentReply(
					notice(`${emojis.custom.warning} **Server Not Found**`, `No cached guild matched \`${serverId}\`.`, color.warning),
					true
				)
			);
		}

		const invite = await createGuildInvite(guild);
		if (!invite) {
			return interaction.reply(
				componentReply(notice(`${emojis.custom.fail} **Portal Failed**`, 'No eligible channel could create an invite in that server.'), true)
			);
		}

		return interaction.reply(
			componentReply(
				panel({
					accentColor: color.success,
					title: `${emojis.custom.link} **Portal Created**`,
					subtitle: 'Developer server access link',
					sections: [
						`${emojis.custom.crown} **Server:** ${guild.name}`,
						`${emojis.custom.community} **Members:** ${(guild.memberCount ?? 0).toLocaleString()}`,
						`${emojis.custom.clock} **Expires:** <t:${Math.floor((Date.now() + 86_400_000) / 1000)}:R>`
					],
					buttons: [linkButton('Open Portal', invite.url)]
				}),
				true
			)
		);
	}
}

async function createGuildInvite(guild) {
	const channels = guild.channels.cache
		.filter((channel) => channel.type !== ChannelType.GuildCategory && typeof channel.createInvite === 'function')
		.sort((a, b) => a.rawPosition - b.rawPosition)
		.values();

	for (const channel of channels) {
		if (!channel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.CreateInstantInvite)) continue;
		const invite = await channel
			.createInvite({
				maxAge: 86400,
				maxUses: 0,
				unique: false,
				reason: 'Developer portal command'
			})
			.catch(() => null);
		if (invite) return invite;
	}

	return null;
}

module.exports = {
	UserCommand
};
