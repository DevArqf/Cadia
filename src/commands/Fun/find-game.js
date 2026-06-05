const CadiaCommand = require('../../lib/structures/commands/CadiaCommand');
const { color, emojis } = require('../../config');
const {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ContainerBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	TextDisplayBuilder
} = require('discord.js');

const gameCatalog = {
	FPS: [
		['Halo Infinite', 'https://store.steampowered.com/app/1240440/Halo_Infinite/'],
		['Doom Eternal', 'https://store.steampowered.com/app/782330/DOOM_Eternal/'],
		['Titanfall 2', 'https://store.steampowered.com/app/1237970/Titanfall_2/'],
		['Valorant', 'https://playvalorant.com'],
		['Team Fortress 2', 'https://store.steampowered.com/app/440/Team_Fortress_2/']
	],
	Shooter: [
		['Apex Legends', 'https://store.steampowered.com/app/1172470/Apex_Legends/'],
		['Destiny 2', 'https://store.steampowered.com/app/1085660/Destiny_2/'],
		['PUBG', 'https://store.steampowered.com/app/578080/PUBG_BATTLEGROUNDS/'],
		['Overwatch 2', 'https://overwatch.blizzard.com'],
		['Battlefield 2042', 'https://store.steampowered.com/app/1517290/Battlefield_2042/']
	],
	Arcade: [
		['Dead Cells', 'https://store.steampowered.com/app/588650/Dead_Cells/'],
		['NUTS', 'https://store.steampowered.com/app/768450/NUTS/'],
		['Assemble with Care', 'https://store.steampowered.com/app/1202900/Assemble_with_Care/'],
		['Card of Darkness', 'https://www.cardofdarkness.com']
	],
	Rythm: [
		['Beat Saber', 'https://store.steampowered.com/app/620980/Beat_Saber/'],
		['Ragnarock', 'https://store.steampowered.com/app/1345820/Ragnarock/'],
		['Thumper', 'https://store.steampowered.com/app/356400/Thumper/'],
		['Muse Dash', 'https://store.steampowered.com/app/774171/Muse_Dash/'],
		['OSU!', 'https://osu.ppy.sh/home/download']
	],
	Action: [
		['Sekiro: Shadows Die Twice', 'https://store.steampowered.com/app/814380/Sekiro_Shadows_Die_Twice__GOTY_Edition/'],
		['Hotline Miami', 'https://store.steampowered.com/app/219150/Hotline_Miami/'],
		['Devil May Cry 5', 'https://store.steampowered.com/app/601150/Devil_May_Cry_5/'],
		['Monster Hunter World', 'https://store.steampowered.com/app/582010/Monster_Hunter_World/']
	],
	Racing: [
		['Forza Horizon 5', 'https://store.steampowered.com/app/1551360/Forza_Horizon_5/'],
		['DiRT Rally 2.0', 'https://store.steampowered.com/app/690790/DiRT_Rally_20/'],
		['art of rally', 'https://store.steampowered.com/app/550320/art_of_rally/'],
		['Wreckfest', 'https://store.steampowered.com/app/228380/Wreckfest/']
	],
	Military: [
		['Hell Let Loose', 'https://store.steampowered.com/app/686810/Hell_Let_Loose/'],
		['ARMA 3', 'https://store.steampowered.com/app/107410/Arma_3/'],
		['Squad', 'https://store.steampowered.com/app/393380/Squad/'],
		['Tannenberg', 'https://store.steampowered.com/app/633460/Tannenberg/']
	],
	Adventure: [
		['The Walking Dead', 'https://store.steampowered.com/app/207610/The_Walking_Dead/'],
		['CHUCHEL', 'https://store.steampowered.com/app/711660/CHUCHEL/'],
		['Broken Sword', 'https://store.steampowered.com/app/57640/Broken_Sword_Directors_Cut/'],
		['Return to Monkey Island', 'https://store.steampowered.com/app/2060130/Return_to_Monkey_Island/']
	]
};

class UserCommand extends CadiaCommand {
	constructor(context, options) {
		super(context, {
			...options,
			description: 'Search for an game that you can enjoy!'
		});
	}

	registerApplicationCommands(registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName('find-game')
				.setDescription(this.description)
				.addStringOption((option) =>
					option
						.setName('category')
						.setDescription('Category of games')
						.addChoices(...Object.keys(gameCatalog).map((category) => ({ name: category, value: category })))
						.setRequired(true)
				)
		);
	}

	async chatInputRun(interaction) {
		const category = interaction.options.getString('category');
		const games = gameCatalog[category];
		const [name, url] = games[Math.floor(Math.random() * games.length)];

		const container = new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.default.replace('#', ''), 16))
			.addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emojis.custom.compass} **Game Finder**`))
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`${emojis.custom.gem} **Recommendation:** ${name}\n${emojis.custom.openfolder} **Category:** ${category}\n${emojis.custom.person} **Requested by:** ${interaction.user}`
				)
			)
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Open Game').setStyle(ButtonStyle.Link).setURL(url))
			);

		await interaction.reply({
			components: [container],
			flags: MessageFlags.IsComponentsV2
		});
	}
}

module.exports = {
	UserCommand
};
