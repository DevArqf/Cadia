const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { items } = require('./data');

const width = 900;
const height = 720;
const columns = 3;
const rows = 2;
const cardWidth = 246;
const cardHeight = 252;
const gapX = 34;
const gapY = 28;
const startX = Math.floor((width - columns * cardWidth - (columns - 1) * gapX) / 2);
const startY = 140;
const emojiImageCache = new Map();
const cardBufferCache = new Map();
const maxCardCacheEntries = 80;

async function createInventoryCard({ profile, category, entries, fileName = 'rpg-inventory.png' }) {
	const cacheKey = inventoryCardCacheKey(profile, category, entries);
	const cached = cardBufferCache.get(cacheKey);
	if (cached) return new AttachmentBuilder(cached, { name: fileName });

	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	drawBackground(ctx);
	drawHeader(ctx, profile, category, entries);
	await drawSlots(ctx, entries);

	const buffer = canvas.toBuffer('image/png');
	rememberCardBuffer(cacheKey, buffer);
	return new AttachmentBuilder(buffer, { name: fileName });
}

function drawBackground(ctx) {
	const gradient = ctx.createLinearGradient(0, 0, width, height);
	gradient.addColorStop(0, '#07130d');
	gradient.addColorStop(0.5, '#102319');
	gradient.addColorStop(1, '#050b08');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);

	ctx.fillStyle = 'rgba(20, 42, 29, 0.72)';
	roundRect(ctx, 18, 18, width - 36, height - 36, 14);
	ctx.fill();
	ctx.strokeStyle = 'rgba(102, 185, 111, 0.58)';
	ctx.lineWidth = 4;
	roundRect(ctx, 18, 18, width - 36, height - 36, 14);
	ctx.stroke();
}

function drawHeader(ctx, profile, category, entries) {
	ctx.fillStyle = '#ffd08a';
	ctx.font = '700 34px "Courier New", Consolas, monospace';
	ctx.fillText(`${profile.name}'s Inventory`, 54, 68);

	ctx.fillStyle = '#8bd17d';
	ctx.font = '700 21px "Courier New", Consolas, monospace';
	ctx.fillText(`${category.label} - ${entries.length} owned`, 56, 104);
}

async function drawSlots(ctx, entries) {
	for (let index = 0; index < columns * rows; index++) {
		const x = startX + (index % columns) * (cardWidth + gapX);
		const y = startY + Math.floor(index / columns) * (cardHeight + gapY);
		const entry = entries[index];
		await drawCard(ctx, x, y, entry);
	}
}

async function drawCard(ctx, x, y, entry) {
	const item = entry?.item || items[entry?.itemId] || items[entry?.entry?.itemId] || null;
	const quantity = entry?.quantity ?? entry?.entry?.quantity ?? 0;

	const cardGradient = ctx.createLinearGradient(x, y, x + cardWidth, y + cardHeight);
	cardGradient.addColorStop(0, '#17291f');
	cardGradient.addColorStop(0.52, '#102017');
	cardGradient.addColorStop(1, '#0a160f');
	ctx.fillStyle = cardGradient;
	roundRect(ctx, x, y, cardWidth, cardHeight, 8);
	ctx.fill();

	ctx.fillStyle = 'rgba(9, 18, 12, 0.28)';
	ctx.beginPath();
	ctx.moveTo(x + cardWidth * 0.62, y);
	ctx.lineTo(x + cardWidth, y);
	ctx.lineTo(x + cardWidth, y + cardHeight * 0.55);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = rarityColor(item?.rarity);
	roundRect(ctx, x + 18, y + 24, cardWidth - 36, 5, 3);
	ctx.fill();

	ctx.fillStyle = '#1d3325';
	roundRect(ctx, x + 18, y + 50, cardWidth - 36, 132, 8);
	ctx.fill();
	ctx.strokeStyle = '#07110b';
	ctx.lineWidth = 3;
	roundRect(ctx, x + 18, y + 50, cardWidth - 36, 132, 8);
	ctx.stroke();

	if (!item) {
		ctx.fillStyle = 'rgba(255, 208, 138, 0.22)';
		ctx.font = '700 54px "Courier New", Consolas, monospace';
		ctx.textAlign = 'center';
		ctx.fillText('?', x + cardWidth / 2, y + 130);
		ctx.textAlign = 'left';
		return;
	}

	const emojiImage = await loadItemEmojiImage(item);
	if (emojiImage) {
		ctx.imageSmoothingEnabled = false;
		ctx.drawImage(emojiImage, x + 78, y + 72, 90, 90);
		ctx.imageSmoothingEnabled = true;
	} else {
		ctx.fillStyle = rarityColor(item.rarity);
		ctx.beginPath();
		ctx.arc(x + cardWidth / 2, y + 116, 42, 0, Math.PI * 2);
		ctx.fill();

		ctx.fillStyle = '#fff7d8';
		ctx.font = '700 38px "Courier New", Consolas, monospace';
		ctx.textAlign = 'center';
		ctx.fillText(initials(item.name), x + cardWidth / 2, y + 130);
	}

	ctx.fillStyle = '#6db96e';
	roundRect(ctx, x + 18, y + cardHeight - 64, cardWidth - 36, 44, 7);
	ctx.fill();
	ctx.strokeStyle = 'rgba(5, 30, 13, 0.35)';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x + cardWidth - 76, y + cardHeight - 58);
	ctx.lineTo(x + cardWidth - 76, y + cardHeight - 26);
	ctx.stroke();

	drawFittedLabel(ctx, `${item.name} | x${quantity}`, x + 30, y + cardHeight - 35, cardWidth - 60);
	ctx.textAlign = 'left';
}

function drawFittedLabel(ctx, text, x, baseline, maxWidth) {
	let fontSize = 22;
	ctx.textAlign = 'center';
	ctx.fillStyle = '#061008';
	do {
		ctx.font = `700 ${fontSize}px Arial`;
		if (ctx.measureText(text).width <= maxWidth) break;
		fontSize -= 1;
	} while (fontSize > 13);
	ctx.fillText(text, x + maxWidth / 2, baseline);
}

async function loadItemEmojiImage(item) {
	const emoji = item?.emoji;
	const match = /^<a?:[^:]+:(\d+)>$/.exec(emoji || '');
	if (!match) return null;

	const emojiId = match[1];
	if (emojiImageCache.has(emojiId)) return emojiImageCache.get(emojiId);

	try {
		const image = await loadImage(`https://cdn.discordapp.com/emojis/${emojiId}.png?size=128&quality=lossless`);
		emojiImageCache.set(emojiId, image);
		return image;
	} catch {
		emojiImageCache.set(emojiId, null);
		return null;
	}
}

function rarityColor(rarity) {
	return (
		{
			common: '#9ca3af',
			uncommon: '#22c55e',
			rare: '#3b82f6',
			epic: '#a855f7',
			legendary: '#f59e0b'
		}[rarity] || '#9ca3af'
	);
}

function initials(name = '?') {
	return name
		.split(/\s+/)
		.map((part) => part.charAt(0))
		.join('')
		.slice(0, 2)
		.toUpperCase();
}

function trim(text, max) {
	return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function inventoryCardCacheKey(profile, category, entries) {
	return [
		profile.characterId,
		profile.updatedAt,
		category.id,
		entries.map((entry) => `${entry.item?.id || entry.itemId || entry.entry?.itemId}:${entry.quantity ?? entry.entry?.quantity ?? 0}`).join(',')
	].join('|');
}

function rememberCardBuffer(cacheKey, buffer) {
	cardBufferCache.set(cacheKey, buffer);
	if (cardBufferCache.size <= maxCardCacheEntries) return;

	const oldestKey = cardBufferCache.keys().next().value;
	if (oldestKey) cardBufferCache.delete(oldestKey);
}

function roundRect(ctx, x, y, rectWidth, rectHeight, radius) {
	const r = Math.min(radius, rectWidth / 2, rectHeight / 2);
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + rectWidth, y, x + rectWidth, y + rectHeight, r);
	ctx.arcTo(x + rectWidth, y + rectHeight, x, y + rectHeight, r);
	ctx.arcTo(x, y + rectHeight, x, y, r);
	ctx.arcTo(x, y, x + rectWidth, y, r);
	ctx.closePath();
}

module.exports = {
	createInventoryCard
};
