const CadiaCommand = require('../../../lib/structures/commands/CadiaCommand');
const { EmbedBuilder, Embed , MessageFlags} = require('discord.js');
const { color, emojis } = require('../../../config');
const { CharacterSchema } = require('../../../lib/schemas/RPG System/characterSchema');

class UserCommand extends CadiaCommand {
    /**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
    constructor(context, options) {
        super(context, {
            ...options,
            description: 'Manage your character'
        });
    }

    /**
	 * @param {CadiaCommand.Registry} registry
	 */
    registerApplicationCommands(registry) {
        registry.registerChatInputCommand((builder) =>
            builder //
                .setName('character')
                .setDescription(this.description)
                .addSubcommand(command => 
                    command.setName('create')
                        .setDescription('Create your own custom character')
                        .addStringOption(option =>
                            option.setName('name')
                                .setDescription('The name you want your character to have')
                                .setRequired(true))
                        .addIntegerOption(option =>
                            option.setName('age')
                                .setDescription('The age of your character (14-100)')
                                .setRequired(false)
                                .setMinValue(14)
                                .setMaxValue(100))
                        .addStringOption(option =>
                            option.setName('gender')
                                .setDescription('The gender you want your character to have')
                                .addChoices(
                                    { name: 'Male', value: 'male' },
                                    { name: 'Female', value: 'female' }
                                )
                                .setRequired(false)))
                .addSubcommand(command => 
                    command.setName('delete')
                        .setDescription('Delete your current character')
                        .addStringOption(option => 
                            option.setName('ucid')
                            .setDescription('The UCID of the character you want to permanently delete')
                            .setRequired(false))
                        .addStringOption(option => 
                            option
                                .setName('name')
                                .setDescription('The name of the character you want to permanently delete')
                                .setRequired(false))),
                );
            }

    /**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
    async chatInputRun(interaction) {
        try {
            const sub = interaction.options.getSubcommand();
            
            if (sub === 'create') {
                const characterName = interaction.options.getString('name');
                const characterAge = interaction.options.getInteger('age') || 'Unknown';
                const characterGender = interaction.options.getString('gender') || 'Unknown';
                
                const existCharacter = await CharacterSchema.findOne({ UserId: interaction.user.id });
                
                if (existCharacter) {
                    return await interaction.reply({
                            embeds: [new EmbedBuilder().setColor(color.invis).setDescription(`You have already created a character named **${characterName}**!`)],
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    
                    let UCID = '';
                    let letter = ['0','1','2','3','4','5','6','7','8','9','a','A','b','B','c','C','d','D','e','E','f','F','g','G','h','H','i','I','j','J','f','F','l','L','m','M','n','N','o','O','p','P','q','Q','r','R','s','S','t','T','u','U','v','V','w','W','x','X','y','Y','z','Z',]
                    for (let i = 0; i < 16; i++) {
                        UCID += letter[Math.floor(Math.random() * letter.length)]
                    }
                    
                    await CharacterSchema.create({
                        Name: characterName,
                        Age: characterAge,
                        Gender: characterGender,
                        UserId: interaction.user.id,
                        UCID: UCID
                    });
                    
                    const CreateEmbed = new EmbedBuilder()
                    .setTitle(`Hello ${characterName}`)
                        .setColor(color.RPG)
                        .setDescription(`Character **${characterName}** created!\n\n **Age:**\n ${characterAge}\n\n **Gender:**\n ${characterGender}\n\n **UCID:** ${UCID}`)
                        .setFooter({ text: `Character Creation`, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp();
                        
                        await interaction.reply({ embeds: [CreateEmbed] });
                    } 
                        
                    if (sub === 'delete') {
                        let UCID = interaction.options.getString('ucid') || '';
                        const name = interaction.options.getString('name');

                        if (!UCID && !name) {
                            const noValue = new EmbedBuilder()
                                .setColor(color.fail)
                                .setDescription('Please enter a valid character **UCID** or **Name** to delete');
                        return interaction.reply({ embeds: [noValue], flags: MessageFlags.Ephemeral });
                    }

                        if (!UCID && name) {
                            const getUCID = await CharacterSchema.findOne({ Name: name });

                        if (getUCID) {
                            UCID = getUCID.UCID;
                        } else {
                            const noCharacter = new EmbedBuilder()
                                .setColor(color.fail)
                                .setDescription('No character has been **found** with the provided **Name** or **UCID**!');
                            return await interaction.reply({ embeds: [noCharacter], flags: MessageFlags.Ephemeral });
                        }
                    }

                        const NoExistCharacter = await CharacterSchema.findOne({ UCID: UCID });

                        if (!NoExistCharacter) {
                            const NoUCID = new EmbedBuilder()
                                .setColor(color.fail)
                                .setDescription('This character does not exist. Please enter a **valid** UCID code or **Name**!');

                            return await interaction.reply({ embeds: [NoUCID], flags: MessageFlags.Ephemeral });
                        }

                        if (NoExistCharacter.UserId === interaction.user.id) {
                            await CharacterSchema.findOneAndDelete({ 
                                UserId: interaction.user.id,
                                UCID: UCID
                            });

                        const deleteEmbed = new EmbedBuilder()
                            .setColor(color.RPG)
                            .setDescription(`Your character has been successfully deleted!`)
                            .setFooter({ text: `Character Deletion`, iconURL: interaction.user.displayAvatarURL() })
                            .setTimestamp();

                        return await interaction.reply({ embeds: [deleteEmbed] });
                    } else {
                        const CantDelete = new EmbedBuilder()
                            .setColor(color.fail)
                            .setDescription(`You **cannot** delete another user's character!`);

                        return await interaction.reply({ embeds: [CantDelete], flags: MessageFlags.Ephemeral });
                    }
            }
        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setColor(color.fail)
                .setDescription(`${emojis.custom.fail} Oopsie, I have encountered an error. The error has been **forwarded** to the developers, so please be **patient** and try running the command again later.\n\n > ${emojis.custom.link} *Have you already tried and still encountering the same error? Then please consider joining our support server [here](https://discord.gg/2XunevgrHD) for assistance or use </bugreport:1219050295770742934>*`)
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
        }
    }
}

module.exports = {
    UserCommand
};
