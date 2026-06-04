const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { PermissionLevels } = require('../../lib/types/Enums');
const { emojis, color } = require('../../config');
const { EmbedBuilder , MessageFlags} = require('discord.js');

class UserCommand extends CadiaCommand {
	/**
	 * @param {CadiaCommand.Context} context
	 * @param {CadiaCommand.Options} options
	 */
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Get girls by using Cadia\'s rizz ;)'
		});
	}

	/**
	 * @param {CadiaCommand.Registry} registry
	 */
	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName("rizz")
                .setDescription(this.description),
		    );
	    }

	/**
	 * @param {CadiaCommand.ChatInputCommandInteraction} interaction
	 */
	async chatInputRun(interaction) {
    
        try { 
		    const rizz = [
                "Do you play Super Mario? Cause i want to smash with my bro",
                "Are you arabic? Cause you look bombastic",
                "I like humans in-values. But i wasnt into you.",
                "Are you a twin tower? Cause you look like a 9/11",
                "Can I buy you a drink? I’d like to see how good you are at swallowing.",
                "Kiss me if I’m wrong but, the earth is for sure flat.",
                "You must be my lucky charm, because you’re magically delicious!",
                "Hey, I’m sorry to bother you, but my phone must be broken because it doesn’t seem to have your number in it.",
                "Do you believe in love at first sight? Or, do I have to walk by again?",
                "Flip this coin! Mama’s got a 50/50 chance at getting some tail tonight.",
                "Are you a toaster? Because I am looking for something to take a bath with tonight.",
                "You want to know my favorite tea? I’m looking at her, shawTea!",
                "It doesn’t matter to me what you’ve got in your pants. Just as long as you can take what’s in mine!",
                "Ow! I just bit my lip. Can you kiss it and make it better?",
                "I can’t taste my cherry lip gloss! Can you give it a try?",
                "Hey boy, want to play shark attack? You eat! I-scream!",
                "I’m so jealous of your heart right now, because it’s pounding inside of you and I’m not",
                "Is that a beaver I see, because GOD DAM!",
                "I’m not quite Jesus, I’m more of an apostle. I could never turn water into wine. But I bet I can turn you into mine.",
                "I don’t care if you’re vegan. I got the only meat you’ll ever need.",
                "Are you a construction worker? Because I see a dump truck back there! Cla-Clow!",
                "If you were a room in my house I’d make you the basement. So I could put kids inside you.",
                "Are you from France? Cause MaDAMN you fine!",
                "I’m no cashier but you got a couple things on you I’d like to check out!",
                "When I was a kid I used to have to chase butterflies. Now you’re over here bringing them right to me.",
                "Are you part phone charger? Cause, I’m dying without you!",
                "Are you good at algebra? Because you could replace my ex without asking Y!",
                "I’m no waitress, but boy I’ll take your tip.",
                "Your body is 60% water, and I’m thirsty as FUCK.",
                "Malik#9999! (What’s that?) The WiFi password for when you come over later.",
                "Kissing is a love language. Want to start a conversation with me?",
                "My crush is ugly…without the GLY.",
                "You’re magnetic! My zipper is falling for you.",
                "My therapist tells me I’m Type-A, because I’m always on top of things. How’d you like to be one of them?",
                "You look like the scariest haunted house because I’m going to scream so loud when I’m inside you",
            ];

            const answer = Math.floor(Math.random() * rizz.length);
            const link = `${rizz[answer]}`;

            const embed = new EmbedBuilder()
            .setDescription(`${link}`)
            .setFooter({ text: `Requested by ${interaction.user.displayName}`, iconURL: interaction.user.displayAvatarURL() })
            .setColor(color.random)
            .setTimestamp();

            await interaction.reply({ embeds: [embed]})
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
