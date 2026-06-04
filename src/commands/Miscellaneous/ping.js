const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');;
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle , MessageFlags} = require('discord.js');
const { RandomLoadingMessage } = require('../../lib/util/constants');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: "Get the Bot's and API's Latency"
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('ping')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
		try {

			let circles = {
				good: `${emojis.custom.online}`,
				okay: `${emojis.custom.issues}`,
				bad: `${emojis.custom.offline}`,
			};

			const ws = this.container.client.ws.ping;
			const msgEdit = Date.now() - interaction.createdTimestamp;
	 
			const wsEmoji = ws <= 100 ? circles.good : ws <= 200 ? circles.okay : circles.bad;
			const msgEmoji = msgEdit <= 200 ? circles.good : circles.bad;
	
			const embed = new EmbedBuilder()
			.setThumbnail(interaction.client.user.displayAvatarURL({ size: 64 }))
			.setColor(color.default)
			.setTimestamp()
			.setFooter({ text: `Latency Recorded`, iconURL: interaction.client.user.displayAvatarURL() })
			.addFields(
				{
					name: `${wsEmoji} \`-\` Websocket Latency`,
					value: `\`\`\`${Math.round(this.container.client.ws.ping)}ms\`\`\``,
				},
				{
					name: `${msgEmoji} \`-\` API Latency`,
					value: `\`\`\`${msgEdit}ms\`\`\``,
				}
			);
	
			const btn = new ActionRowBuilder()
			.addComponents(
				new ButtonBuilder()
				.setCustomId('btn')
				.setStyle(ButtonStyle.Primary)
				.setEmoji(`${emojis.custom.reload}`)
			)
	
			const msg = await interaction.reply({ embeds: [embed], components: [btn] })
	
			const collector = msg.createMessageComponentCollector()
			
			collector.on('collect', async i => {
	
				if (i.user.id !== interaction.user.id) 
				return i.reply({ content: `${emojis.custom.forbidden} You **cannot** interact with this button. **Execute** the command yourself to **use** the button!`, flags: MessageFlags.Ephemeral });
	
				if(i.customId == 'btn') {
					i.update({ embeds: [
						new EmbedBuilder()
						.setThumbnail(interaction.client.user.displayAvatarURL({ size: 64 }))
						.setColor(color.default)
						.setTimestamp()
						.setFooter({ text: `Latency Recorded`, iconURL: interaction.client.user.displayAvatarURL() })
						.addFields(
							{
								name: `${wsEmoji} \`-\` Websocket Latency`,
								value: `\`\`\`${Math.round(this.container.client.ws.ping)}ms\`\`\``,
							},
							{
								name: `${msgEmoji} \`-\` API Latency`,
								value: `\`\`\`${msgEdit}ms\`\`\``,
							}
							)
						], components: [btn] })
					}
				})
			} catch (error) {
				console.error(error);
				const errorEmbed = new EmbedBuilder()
					.setColor(color.fail)
					.setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
					.setTimestamp();
		
				await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
				return;
			}
		}
};

module.exports = {
	UserCommand
};
