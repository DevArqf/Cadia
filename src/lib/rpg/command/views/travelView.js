const {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextDisplayBuilder,
	ContainerBuilder,
	SeparatorBuilder,
	SeparatorSpacingSize
} = require('discord.js');

function createTravelView({ actionButton, color, componentReply, createTravelImageAttachment, icon, panel, regions, sceneImages, service }) {
	function buildTravelCompleteReply(result, ephemeral = false) {
		return {
			...componentReply(buildTravelCompletePanel(result), ephemeral),
			files: [createTravelImageAttachment()]
		};
	}

	function buildTravelCompletePanel(result) {
		return panel({
			accentColor: color.default,
			title: `${icon.compass} **Travel Complete**`,
			subtitle: `Now stationed in ${result.region.name}`,
			image: sceneImages.travel,
			sections: [
				travelStory(result.region),
				[
					`${icon.chapter} **Chapter:** ${result.region.chapter}`,
					`${icon.level} **Unlocks at Rank:** ${result.region.unlockRank}`,
					`${icon.person} **Warden:** ${result.profile.name}`,
					`${icon.region} **Destination:** ${result.region.name}`
				]
			],
			footer: `${icon.clock} Region updated <t:${Math.floor(Date.now() / 1000)}:R>`
		});
	}

	function buildLockedRegionPanel(profile, region, gate) {
		const nextSteps = [];
		if (!region) {
			nextSteps.push('Choose a valid region from the `/rpg travel` region option.');
		} else if ((profile.level || 1) < region.unlockRank) {
			nextSteps.push(`Reach **Rank ${region.unlockRank}**. You are currently **Rank ${profile.level || 1}**.`);
			nextSteps.push('Use `/rpg adventure` to farm mobs for XP, gold, and gear.');
			nextSteps.push('Use `/rpg profile` to check your Rank progress.');
		} else if (gate.bossRequired) {
			const boss = service.getBossById(gate.bossId);
			nextSteps.push(`Defeat **${boss.name}** to unlock **${region.name}**.`);
			nextSteps.push(`Use \`/rpg boss-info boss:${boss.id}\` to study weaknesses and resistances.`);
			nextSteps.push('Farm region mobs with `/rpg adventure`, equip better gear with `/rpg equip`, then try `/rpg travel` again.');
		} else {
			nextSteps.push(gate.reason || 'This destination is not available yet.');
			nextSteps.push('Use `/rpg quest` for your current objective.');
		}

		return panel({
			accentColor: color.warning,
			title: `${icon.warning} **Travel Locked**`,
			subtitle: region ? region.name : 'Unknown Region',
			sections: [
				gate.reason || 'That region is locked right now.',
				`${icon.objective} **What to do next**\n${nextSteps.map((step) => `${icon.arrowRight} ${step}`).join('\n')}`
			],
			footer: `${icon.person} Warden ${profile.name}`
		});
	}

	function buildTravelPickerPanel(profile, travelRegions, customId) {
		return new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`${icon.compass} **Travel**\n-# Choose a destination for ${profile.name}. Locked regions explain how to unlock them.`
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(customId)
						.setPlaceholder('Choose destination')
						.addOptions(
							travelRegions.slice(0, 25).map((region) =>
								new StringSelectMenuOptionBuilder()
									.setLabel(region.name)
									.setDescription(`Chapter ${region.chapter} - unlock rank ${region.unlockRank}`)
									.setValue(region.id)
									.setDefault(region.id === profile.region)
							)
						)
				)
			);
	}

	function travelStory(region) {
		const stories = [
			[
				`${icon.compass} **The road opens slowly.**`,
				`${region.name} does not appear all at once. ${region.description}`,
				'Your boots cross old borders, fresh dust, and quiet places where the relic storm has already passed.',
				`By the final mile, the signs all point toward **${region.name}**.`
			],
			[
				`${icon.compass} **You follow a half-buried route marker.**`,
				'The path bends through empty fields, broken stone, and stretches of silence where even the wind seems careful.',
				`${region.description}`,
				`When the terrain changes under your feet, you know you have reached **${region.name}**.`
			],
			[
				`${icon.compass} **The journey takes longer than the map promised.**`,
				'You pass ruined posts, cold campfires, and footprints that vanish whenever you look back.',
				`${region.description}`,
				`At last, the road gives way to **${region.name}**. Your next chapter begins here.`
			]
		];
		return stories[Math.floor(Math.random() * stories.length)].join('\n');
	}

	return { buildLockedRegionPanel, buildTravelCompletePanel, buildTravelCompleteReply, buildTravelPickerPanel };
}

module.exports = { createTravelView };
