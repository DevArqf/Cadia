const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../../lib/types/Enums');
const { color, emojis } = require('../../../config');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			permissionLevel: PermissionLevels.Developer,
			description: 'Vote for Cadia on Top.gg (DEV ONLY)'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('vote')
				.setDescription(this.description)
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
        const apiKey = process.env.TOPGG_TOKEN;
        const botId = "1200475110235197631";
        const userId = interaction.user.id;

        if (!apiKey) {
            return interaction.reply({ content: `${emojis.custom.fail} Missing \`TOPGG_TOKEN\` in the environment.`, flags: MessageFlags.Ephemeral });
        }

        try {
            const response = await fetch (`https://top.gg/api/bots/${botId}/check?userId=${userId}`, 
            { headers: {
                Authorization: apiKey,
            },
        });
        if (response.ok) {
            const data = await response.json();
            if (data.voted === 1) {
                return interaction.reply(`${emojis.custom.fail} You have **already** voted for Cadia. We **appreciate** you trying again!`)
            } else if (data.voted === 0){
                const voteEmbed = new EmbedBuilder()
                    .setColor(color.default)
                    .setDescription(`${emojis.custom.heart2} It appears you're interested in **voting** for Cadia. To **cast** your vote, simply **click** the buttons **below** at your convenience!`)
                    .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();

					const voteButton1 = new ActionRowBuilder()
						.addComponents(
							new ButtonBuilder()
								.setLabel('Top.gg')
								.setURL(`https://top.gg/bot/1200475110235197631`)
								.setStyle(ButtonStyle.Link)
						)

						.addComponents(
							new ButtonBuilder()
								.setLabel('DiscordBotList.com')
								.setURL(`https://discordbotlist.com/bots/cadia`)
								.setStyle(ButtonStyle.Link)
						)

						.addComponents(
							new ButtonBuilder()
								.setLabel('DiscordList.gg')
								.setURL(`https://discordlist.gg/bot/1200475110235197631?message=success`)
								.setStyle(ButtonStyle.Link)
						)

						.addComponents(
							new ButtonBuilder()
								.setLabel('Omenlist.xyz')
								.setURL(`https://omenlist.xyz/bot/1200475110235197631`)
								.setStyle(ButtonStyle.Link)
						)
						
                    return interaction.reply({ embeds: [voteEmbed], components: [voteButton1] })
            }
        } else {
            return interaction.reply(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
        }

        } catch (error) {
            return interaction.reply(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
        }
	}
};

module.exports = {
	UserCommand
};
