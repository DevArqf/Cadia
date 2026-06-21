const {
	ActionRowBuilder,
	ButtonStyle,
	ContainerBuilder,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	MessageFlags,
	SeparatorBuilder,
	SeparatorSpacingSize,
	StringSelectMenuBuilder,
	TextDisplayBuilder
} = require('discord.js');

const inventoryCategories = [
	{ id: 'weapon', label: 'Weapons', action: 'equip' },
	{ id: 'armor', label: 'Armor', action: 'equip' },
	{ id: 'charm', label: 'Charms', action: 'equip' },
	{ id: 'consumable', label: 'Consumables', action: 'use' }
];

function createInventoryView({
	actionButton,
	color,
	createInventoryCard,
	formatEquipment,
	formatItemName,
	formatStats,
	icon,
	itemSelectOption,
	items,
	panel,
	sceneImages,
	titleCase
}) {
	function buildInventoryPanel(profile, requestedBy) {
		const entries = profile.inventory || [];
		return panel({
			accentColor: color.default,
			title: `${icon.folder} **Inventory Satchel**`,
			subtitle: `${profile.name}'s carried gear`,
			image: sceneImages.inventory,
			sections: [
				entries.length
					? entries
							.map((entry, index) => {
								const item = items[entry.itemId];
								return `#${index + 1} **${item?.name ?? entry.itemId}** x${entry.quantity}\n-# ${item?.rarity ?? 'unknown'} ${item?.slot ?? 'item'} - ${item?.description ?? 'No notes.'}`;
							})
							.join('\n\n')
					: `${icon.info} This inventory is empty.`,
				formatEquipment(profile)
			],
			footer: `${icon.person} Requested by ${requestedBy}`
		});
	}

	async function buildInventoryReply(profile, state) {
		const category = inventoryCategories[state.categoryIndex] || inventoryCategories[0];
		const entries = inventoryEntriesForCategory(profile, category.id);
		const fileName = `rpg-inventory-${profile.characterId}-${category.id}.png`;
		const attachment = await createInventoryCard({ profile, category, entries, fileName });
		const selectedItem = state.pendingItemId ? items[state.pendingItemId] : null;
		const usableEntries = entries.filter(({ item, entry }) => item && (entry.quantity || 0) > 0);

		const container = new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					`${icon.folder} **Inventory Satchel**\n-# ${profile.name} - ${category.label} (${state.categoryIndex + 1}/${inventoryCategories.length})`
				)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${fileName}`)))
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					selectedItem ? buildInventoryConfirmText(selectedItem, category) : buildInventoryCategoryText(profile, entries, category)
				)
			)
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					actionButton(`${state.customIdBase}:prev`, 'Previous', ButtonStyle.Secondary).setDisabled(state.disabled),
					actionButton(`${state.customIdBase}:next`, 'Next', ButtonStyle.Secondary).setDisabled(state.disabled)
				)
			);

		if (usableEntries.length && !state.pendingItemId) {
			container.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(`${state.customIdBase}:select`)
						.setPlaceholder(`Choose ${category.action === 'use' ? 'an item to use' : 'gear to equip'}`)
						.setDisabled(state.disabled)
						.addOptions(
							usableEntries
								.slice(0, 25)
								.map(({ item, entry }) =>
									itemSelectOption(item, `${titleCase(item.rarity || 'common')} ${item.slot} - owned x${entry.quantity}`)
								)
						)
				)
			);
		}

		if (selectedItem) {
			container.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					actionButton(
						`${state.customIdBase}:confirm`,
						category.action === 'use' ? 'Use Item' : 'Equip Item',
						category.action === 'use' ? ButtonStyle.Success : ButtonStyle.Primary
					).setDisabled(state.disabled),
					actionButton(`${state.customIdBase}:cancel`, 'Cancel', ButtonStyle.Secondary).setDisabled(state.disabled)
				)
			);
		}

		container
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(
					state.disabled ? `-# Inventory controls expired. Run \`/rpg inventory\` again.` : `-# Inventory controls expire after 3 minutes.`
				)
			);

		return { components: [container], files: [attachment], flags: MessageFlags.IsComponentsV2 };
	}

	function inventoryEntriesForCategory(profile, categoryId) {
		return (profile.inventory || [])
			.map((entry) => ({ entry, item: items[entry.itemId] }))
			.filter(({ item, entry }) => item?.slot === categoryId && (entry.quantity || 0) > 0);
	}

	function buildInventoryCategoryText(profile, entries, category) {
		const equippedItemId = category.action === 'equip' ? (profile.equipment || {})[category.id] : null;
		const summary = entries.length
			? entries
					.slice(0, 8)
					.map(
						({ item, entry }) =>
							`${icon.arrowRight} **${formatItemName(item)}** x${entry.quantity}${equippedItemId === item.id ? ' - Equipped' : ''}`
					)
					.join('\n')
			: `${icon.info} No owned ${category.label.toLowerCase()} in this satchel.`;

		return [
			`${icon.equipment} **${category.label}**`,
			summary,
			'',
			category.action === 'use'
				? `${icon.info} Select an owned consumable, then confirm before using it.`
				: `${icon.info} Select owned gear, then confirm before equipping it.`
		].join('\n');
	}

	function buildInventoryConfirmText(item, category) {
		return [
			`${icon.warning} **Confirm ${category.action === 'use' ? 'Use' : 'Equip'}**`,
			`**${formatItemName(item)}**`,
			`-# ${titleCase(item.rarity || 'common')} ${item.slot}`,
			item.description || 'No item notes available.',
			`${icon.settings} **Stats:** ${formatStats(item.stats || {}) || 'None'}`,
			`${icon.arrowRight} Choose confirm to ${category.action === 'use' ? 'consume this item' : 'equip this gear'}.`
		].join('\n');
	}

	function buildEquippedPanel(result) {
		return panel({
			accentColor: color.success,
			title: `${icon.success} **Item Equipped**`,
			subtitle: `${formatItemName(result.item)} moved into ${result.item.slot}`,
			sections: [
				`${icon.folder} **${formatItemName(result.item)}**\n${result.item.description}`,
				`${icon.settings} **Stats:** ${formatStats(result.item.stats)}`
			],
			footer: `${icon.person} Warden ${result.profile.name}`
		});
	}

	function buildEquipPickerPanel(profile, equipableEntries, customId) {
		return new ContainerBuilder()
			.setAccentColor(Number.parseInt(color.RPG.replace('#', ''), 16))
			.addTextDisplayComponents(
				new TextDisplayBuilder().setContent(`${icon.equipment} **Equip Gear**\n-# Choose an owned item to equip for ${profile.name}.`)
			)
			.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small))
			.addActionRowComponents(
				new ActionRowBuilder().addComponents(
					new StringSelectMenuBuilder()
						.setCustomId(customId)
						.setPlaceholder('Choose gear to equip')
						.addOptions(
							equipableEntries
								.slice(0, 25)
								.map(({ entry, item }) => itemSelectOption(item, `${titleCase(item.rarity)} ${item.slot} - owned x${entry.quantity}`))
						)
				)
			);
	}

	return {
		buildEquipPickerPanel,
		buildEquippedPanel,
		buildInventoryPanel,
		buildInventoryReply,
		inventoryCategories,
		inventoryEntriesForCategory
	};
}

module.exports = { createInventoryView, inventoryCategories };
