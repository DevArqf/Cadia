const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { color, emojis } = require('../../config');
const { EmbedBuilder , MessageFlags} = require('discord.js');

const answers = [
    '`🎱` **|** It is certain', 
    '`🎱` **|** Reply hazy, try again', 
    '`🎱` **|** Don’t count on it', 
    '`🎱` **|** It is decidedly so', 
    '`🎱` **|** Ask again later', 
    '`🎱` **|** My reply is no', 
    '`🎱` **|** Without a doubt', 
    '`🎱` **|** Better not tell you now', 
    '`🎱` **|** My sources say no', 
    '`🎱` **|** Yes definitely', 
    '`🎱` **|** Cannot predict now', 
    '`🎱` **|** Outlook not so good', 
    '`🎱` **|** You may rely on it', 
    '`🎱` **|** Concentrate and ask again', 
    '`🎱` **|** Very doubtful', 
    '`🎱` **|** As I see it, yes', 
    '`🎱` **|** Most likely', 
    '`🎱` **|** Outlook good', 
    '`🎱` **|** Yes', 
    '`🎱` **|** No', 
    '`🎱` **|** Signs point to yes'
    ];

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Ask 8 Ball a question'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName('8ball')
				.setDescription(this.description)
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('The question you want to ask 8ball')
                        .setRequired(true))
		);
	}

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {

        const question = interaction.options.getString('question');

        try {
            var get_response = answers[Math.floor(Math.random() * answers.length)];
        
        const embed = new EmbedBuilder()
            .setColor(color.default)
            .setTitle(`\`🎱\` | ${interaction.user.displayName}'s 8ball game`)
            .setDescription(`${emojis.custom.question} \`-\` **Question:**\n ${emojis.custom.arrowright} **${question}**\n\n ${emojis.custom.mail} \`-\` **Response:**\n ${emojis.custom.arrowright} ${get_response}`)
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            
        await interaction.reply({
            embeds: [embed]
        });

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
