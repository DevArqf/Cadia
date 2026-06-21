const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { items } = require('./data');

const width = 1024;
const height = 1024;
const questPagePath = path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Quests Page.png');
const emojiAssetDir = path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Emojis');
const rewardEmojiPaths = {
	gold: path.join(emojiAssetDir, 'Coin.png'),
	xp: path.join(emojiAssetDir, 'Orb Purple.png'),
	shards: path.join(emojiAssetDir, 'Shard.png')
};
let questPageImagePromise = null;
const emojiImageCache = new Map();
const questCardBufferCache = new Map();
const maxQuestCardCacheEntries = 80;

async function createQuestPageCard({ profile, region, questText, rewards = null, fileName = 'rpg-quest-page.png' }) {
	const cacheKey = questCardCacheKey(profile, region, questText, rewards);
	const cached = questCardBufferCache.get(cacheKey);
	if (cached) return new AttachmentBuilder(cached, { name: fileName });

	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	await drawBackground(ctx);
	drawQuestText(ctx, { profile, region, questText });
	await drawRewards(ctx, rewards);

	const buffer = await canvas.encode('png');
	rememberQuestCardBuffer(cacheKey, buffer);
	return new AttachmentBuilder(buffer, { name: fileName });
}

async function drawBackground(ctx) {
	try {
		questPageImagePromise ??= loadImage(questPagePath).catch(() => null);
		const background = await questPageImagePromise;
		if (!background) throw new Error('Quest background unavailable.');
		ctx.drawImage(background, 0, 0, width, height);
	} catch {
		ctx.fillStyle = '#f4dfb7';
		ctx.fillRect(0, 0, width, height);
	}
}

function drawQuestText(ctx, { profile, region, questText }) {
	ctx.fillStyle = '#4d2d19';
	ctx.textAlign = 'center';
	ctx.font = '700 48px "Courier New", Consolas, monospace';
	ctx.fillText('Story Ledger', width / 2, 185);

	ctx.font = '700 26px "Courier New", Consolas, monospace';
	ctx.fillStyle = '#7a4a27';
	ctx.fillText(`${profile.name} - Chapter ${region.chapter}`, width / 2, 228);
	ctx.fillText(region.name, width / 2, 262);

	drawDivider(ctx, 250, 300, 524);

	ctx.textAlign = 'left';
	ctx.fillStyle = '#4b2c17';
	ctx.font = '700 28px "Courier New", Consolas, monospace';
	ctx.fillText('Current Objective', 260, 358);

	ctx.fillStyle = '#2f2117';
	ctx.font = '700 28px "Courier New", Consolas, monospace';
	wrapText(ctx, questText, 250, 415, 550, 39, 680);
}

async function drawRewards(ctx, rewards) {
	const entries = rewardEntries(rewards);
	if (!entries.length) return;

	const startX = 260;
	const startY = 724;
	const columnGap = 280;
	const rowGap = 38;

	drawDivider(ctx, startX, startY - 34, 524);

	ctx.textAlign = 'left';
	ctx.fillStyle = '#4b2c17';
	ctx.font = '700 25px "Courier New", Consolas, monospace';
	ctx.fillText('Rewards', startX, startY);

	for (const [index, entry] of entries.slice(0, 4).entries()) {
		const x = startX + (index % 2) * columnGap;
		const y = startY + 42 + Math.floor(index / 2) * rowGap;
		const image = await loadEmojiImage(entry.imagePath);
		if (image) {
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(image, x, y - 26, 30, 30);
			ctx.imageSmoothingEnabled = true;
		} else {
			ctx.fillStyle = '#7a4a27';
			ctx.beginPath();
			ctx.arc(x + 15, y - 11, 14, 0, Math.PI * 2);
			ctx.fill();
		}

		ctx.fillStyle = '#2f2117';
		ctx.font = '700 22px "Courier New", Consolas, monospace';
		ctx.fillText(entry.label, x + 42, y - 2);
	}
}

function rewardEntries(rewards) {
	if (!rewards) return [];

	const entries = [];
	if (rewards.gold) entries.push({ imagePath: rewardEmojiPaths.gold, label: `${rewards.gold.toLocaleString()} Gold` });
	if (rewards.xp) entries.push({ imagePath: rewardEmojiPaths.xp, label: `${rewards.xp.toLocaleString()} XP` });
	if (rewards.shards) entries.push({ imagePath: rewardEmojiPaths.shards, label: `${rewards.shards.toLocaleString()} Shards` });
	for (const itemId of rewards.items || []) {
		const item = items[itemId];
		entries.push({
			imagePath: itemEmojiPath(item),
			label: item?.name || titleCase(itemId)
		});
	}
	return entries;
}

function itemEmojiPath(item) {
	if (!item?.name) return null;
	return path.join(emojiAssetDir, `${item.name}.png`);
}

async function loadEmojiImage(imagePath) {
	if (!imagePath) return null;
	if (emojiImageCache.has(imagePath)) return emojiImageCache.get(imagePath);

	try {
		const image = await loadImage(imagePath);
		emojiImageCache.set(imagePath, image);
		return image;
	} catch {
		emojiImageCache.set(imagePath, null);
		return null;
	}
}

function drawDivider(ctx, x, y, dividerWidth) {
	ctx.strokeStyle = 'rgba(103, 62, 31, 0.46)';
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.lineTo(x + dividerWidth, y);
	ctx.stroke();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxY = 780) {
	const words = String(text || '').split(/\s+/);
	let line = '';
	let currentY = y;

	for (const word of words) {
		const testLine = line ? `${line} ${word}` : word;
		if (ctx.measureText(testLine).width > maxWidth && line) {
			ctx.fillText(line, x, currentY);
			line = word;
			currentY += lineHeight;
			if (currentY > maxY) {
				return;
			}
		} else {
			line = testLine;
		}
	}

	if (line && currentY <= maxY) ctx.fillText(line, x, currentY);
}

function preloadQuestAssets() {
	questPageImagePromise ??= loadImage(questPagePath).catch(() => null);
	return Promise.allSettled([questPageImagePromise, ...Object.values(rewardEmojiPaths).map((imagePath) => loadEmojiImage(imagePath))]);
}

function questCardCacheKey(profile, region, questText, rewards) {
	return [profile.characterId, profile.updatedAt, region.id, questText, JSON.stringify(rewards || {})].join('|');
}

function rememberQuestCardBuffer(cacheKey, buffer) {
	questCardBufferCache.set(cacheKey, buffer);
	if (questCardBufferCache.size <= maxQuestCardCacheEntries) return;

	const oldestKey = questCardBufferCache.keys().next().value;
	if (oldestKey) questCardBufferCache.delete(oldestKey);
}

function titleCase(value) {
	return String(value || '')
		.replace(/[_-]+/g, ' ')
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

module.exports = {
	createQuestPageCard,
	preloadQuestAssets
};
