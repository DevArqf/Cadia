function createAdminHandlers({
	buildAdminProfilePanel,
	color,
	commandMention,
	componentReply,
	formatItemName,
	forceBossFight,
	icon,
	isDeveloper,
	notice,
	rpg,
	showRpgAnalytics,
	titleCase
}) {
	async function adminPanel(interaction, subcommand) {
		if (!isDeveloper(interaction.user.id)) {
			return interaction.reply(
				componentReply(notice(`${icon.forbidden} **Developer Only**`, 'Only Cadia developers can use RPG admin tools.'), true)
			);
		}

		if (subcommand === 'find') {
			const user = interaction.options.getUser('user', true);
			const profile = await rpg.requireProfile(interaction.guild.id, user.id);
			return interaction.reply(componentReply(buildAdminProfilePanel(profile, user, 'Character ID Lookup'), true));
		}

		if (subcommand === 'inspect') {
			const profile = await rpg.getProfileByCharacterId(interaction.options.getString('id', true));
			return interaction.reply(componentReply(buildAdminProfilePanel(profile, `<@${profile.userId}>`, 'Character Inspection'), true));
		}

		if (subcommand === 'add-currency') {
			const currency = interaction.options.getString('currency', true);
			const amount = interaction.options.getInteger('amount', true);
			const profile = await rpg.adminAddCurrency(interaction.options.getString('id', true), currency, amount);
			return interaction.reply(
				componentReply(
					buildAdminProfilePanel(
						profile,
						`<@${profile.userId}>`,
						'Currency Adjusted',
						`${icon.success} Applied **${amount.toLocaleString()}** to **${titleCase(currency)}**.`
					),
					true
				)
			);
		}

		if (subcommand === 'add-item') {
			const result = await rpg.adminAddItem(
				interaction.options.getString('id', true),
				interaction.options.getString('item', true),
				interaction.options.getInteger('quantity') ?? 1
			);
			return interaction.reply(
				componentReply(
					buildAdminProfilePanel(
						result.profile,
						`<@${result.profile.userId}>`,
						'Item Added',
						`${icon.success} Added **${result.quantity}x ${formatItemName(result.item)}** to inventory.`
					),
					true
				)
			);
		}

		if (subcommand === 'wipe') {
			if (!interaction.options.getBoolean('confirm', true)) {
				return interaction.reply(
					componentReply(notice(`${icon.warning} **Wipe Cancelled**`, 'Set `confirm` to true to wipe this character.'), true)
				);
			}

			const { profile, result } = await rpg.adminWipeCharacter(interaction.options.getString('id', true));
			return interaction.reply(
				componentReply(
					notice(
						result.deletedCount ? `${icon.deleted} **Character Wiped**` : `${icon.warning} **No Character Wiped**`,
						result.deletedCount
							? `Deleted **${profile.name}** owned by <@${profile.userId}>.\nCharacter ID: \`${profile.characterId}\``
							: 'No matching character was deleted.',
						result.deletedCount ? color.warning : color.fail
					),
					true
				)
			);
		}

		if (subcommand === 'max') {
			const result = await rpg.adminMaxCharacter(interaction.options.getString('id', true));
			return interaction.reply(
				componentReply(
					buildAdminProfilePanel(
						result.profile,
						`<@${result.profile.userId}>`,
						'Character Maxed',
						[
							`${icon.success} Set Rank to **${result.rank}** and restored HP to full.`,
							`${icon.coin} Maxed gold and relic shards.`,
							`${icon.loot} Granted **${result.itemQuantity}x** of **${result.itemCount}** RPG items.`,
							`${icon.compass} Cleared all boss gates and moved character to the final region.`
						].join('\n')
					),
					true
				)
			);
		}

		if (subcommand === 'harlequin') return forceBossFight(interaction, 'harlequin');
		if (subcommand === 'boss') return forceBossFight(interaction, interaction.options.getString('boss', true));
		if (subcommand === 'analytics') return showRpgAnalytics(interaction);

		throw new rpg.RpgError('Unknown RPG admin action.');
	}

	return { adminPanel };
}

module.exports = {
	createAdminHandlers
};
