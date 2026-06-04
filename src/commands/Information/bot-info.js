const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { EmbedBuilder, ChatInputCommandInteraction, Client, version } = require('discord.js');
const { isMysqlConnected } = require('../../lib/database/mysql');
const os = require("os");

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: "Receive information regarding Cadia"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('bot-info')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		await interaction.deferReply()
    const databaseStatus = isMysqlConnected() ? 'Connected' : 'Disconnected';

       await interaction.client.user.fetch();
       await interaction.client.application.fetch();

       const getChannelTypeSize = type => interaction.client.channels.cache.filter(channel => type.includes(channel.type)).size;
       const developers = 'Malik, Oreo & Navin';
       const commandCount = this.container.stores.get('commands').size;

       const days = Math.floor(interaction.client.uptime / 86400000)
       const hours = Math.floor(interaction.client.uptime / 3600000) % 24
       const minutes = Math.floor(interaction.client.uptime / 60000) % 60
       const seconds = Math.floor(interaction.client.uptime / 1000) % 60

       let uptime = `${days}d ${hours}h ${minutes}m ${seconds}s`;

      await interaction.editReply({embeds: [
			new EmbedBuilder()
               .setColor(color.default)
               .setDescription(`${emojis.custom.info} \`-\` **Here are some information and statistics of Cadia!**`)
               .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
               .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
               .setTimestamp()
               .addFields(
                   { name: `${emojis.custom.emoji1} \`-\` Client`, value: `\`\`\`${interaction.client.user.tag}\`\`\``, inline: true },

                   { name: `${emojis.custom.developer} \`-\` Developer`, value: `\`\`\`${developers || "None"}\`\`\``, inline: true },

                   { name: `${emojis.custom.calendar} \`-\` Created`, value: `\`\`\`26/01/2024\`\`\``, inline: true },

                   { name: `${emojis.custom.clock} \`-\` Uptime`, value: `\`\`\`${uptime}\`\`\``, inline: true },

                   { name: `${emojis.custom.connected} \`-\` Latency`, value: `\`\`\`${interaction.client.ws.ping}ms\`\`\``, inline: true },

                   { name: `${emojis.custom.lock} \`-\` Database`, value: `\`\`\`${databaseStatus}\`\`\``, inline: true },

                   { name: `${emojis.custom.settings} \`-\` System`, value: `\`\`\`${os.type().replace("Windows_NT", "Windows").replace("Darwin", "macOS")}\`\`\``, inline: true },

                   { name: `${emojis.custom.nodejs} \`-\` Node.js`, value: `\`\`\`${process.version}\`\`\``, inline: true },

                   { name: `${emojis.custom.djs} \`-\` Discord.js`, value: `\`\`\`v${version}\`\`\``, inline: true },

                   { name: `${emojis.custom.slash} \`-\` Commands`, value: `\`\`\`${commandCount}\`\`\``, inline: true },

                   { name: `${emojis.custom.compass} \`-\` Servers`, value: `\`\`\`${interaction.client.guilds.cache.size}\`\`\``, inline: true },

                   { name: `${emojis.custom.friends} \`-\` Users`, value: `\`\`\`${interaction.client.guilds.cache.reduce((acc, guild) => acc+guild.memberCount, 0)}\`\`\``, inline: true }
            )
       ]});
   	}
};

module.exports = {
	UserCommand
};
