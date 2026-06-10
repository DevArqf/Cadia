const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const bossBattlePaths = {
	harlequin: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Harlequin Battle.png'),
	'mossbound-regent': path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Mossbound Regent Battle.png'),
	mummy: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Mummy Battle.png')
};
const mobBattlePaths = {
	'echo-miner': path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Echo Miner Battle.png'),
	'gate-wisp': path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Gate Wisp Battle.png'),
	'glass-mite': path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Glass Mite Battle.png'),
	'hollow-fire': path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Hollow Fire Battle.png'),
	'mossbound-knight': path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Mossbound Knight Battle.png'),
	'rust-hound': path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Rust Hound Battle.png'),
	'thorn-stalker': path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Thorn Stalker Battle.png')
};
const width = 1024;
const height = 1024;

async function createBossBattleCard({ encounter, enemyHp, playerHp, playerMaxHp, playerName, fileName = 'boss-battle.png' }) {
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	await drawBackground(ctx, bossBattlePaths[encounter.id]);
	drawVignette(ctx);
	drawHealthPanel(ctx, {
		x: 58,
		y: 54,
		width: 430,
		kicker: `${encounter.name} Boss`,
		label: encounter.name,
		value: enemyHp,
		max: encounter.hp,
		fill: '#d83c3c',
		back: 'rgba(74, 13, 18, 0.88)'
	});
	drawHealthPanel(ctx, {
		x: width - 438,
		y: height - 132,
		width: 380,
		label: playerName,
		value: playerHp,
		max: playerMaxHp,
		fill: '#45d18b',
		back: 'rgba(10, 45, 33, 0.9)',
		align: 'right'
	});

	return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: fileName });
}

async function createHarlequinBattleCard(options) {
	return createBossBattleCard({ ...options, fileName: options.fileName || 'harlequin-battle.png' });
}

async function createEncounterBattleCard({ encounter, enemyHp, playerHp, playerMaxHp, playerName, fileName = 'encounter-battle.png' }) {
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	await drawBackground(ctx, mobBattlePaths[encounter.id]);
	drawVignette(ctx);
	drawHealthPanel(ctx, {
		x: 58,
		y: 54,
		width: 410,
		kicker: 'Wild Encounter',
		label: encounter.name,
		value: enemyHp,
		max: encounter.hp,
		fill: '#d8833c',
		back: 'rgba(74, 36, 13, 0.88)'
	});
	drawHealthPanel(ctx, {
		x: width - 438,
		y: height - 132,
		width: 380,
		label: playerName,
		value: playerHp,
		max: playerMaxHp,
		fill: '#45d18b',
		back: 'rgba(10, 45, 33, 0.9)',
		align: 'right'
	});

	return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: fileName });
}

function hasEncounterBattleCard(encounterId) {
	return Boolean(mobBattlePaths[encounterId]);
}

async function drawBackground(ctx, imagePath) {
	try {
		const background = await loadImage(imagePath);
		ctx.drawImage(background, 0, 0, width, height);
	} catch {
		ctx.fillStyle = '#18141e';
		ctx.fillRect(0, 0, width, height);
	}
}

function drawVignette(ctx) {
	const gradient = ctx.createRadialGradient(width / 2, height / 2, 180, width / 2, height / 2, 650);
	gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
	gradient.addColorStop(1, 'rgba(0, 0, 0, 0.48)');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);
}

function drawHealthPanel(ctx, options) {
	const barHeight = 30;
	const hasKicker = Boolean(options.kicker);
	const labelY = options.y + (hasKicker ? 42 : 28);
	const barY = options.y + (hasKicker ? 56 : 42);
	const percent = Math.max(Math.min(options.value / Math.max(options.max, 1), 1), 0);

	ctx.fillStyle = 'rgba(7, 8, 12, 0.68)';
	roundRect(ctx, options.x - 18, options.y - 12, options.width + 36, hasKicker ? 122 : 104, 18);
	ctx.fill();

	if (hasKicker) {
		ctx.textAlign = options.align || 'left';
		ctx.fillStyle = '#ffd66b';
		ctx.font = '700 22px "Courier New", Consolas, monospace';
		ctx.fillText(options.kicker, options.align === 'right' ? options.x + options.width : options.x, options.y + 22);
	}

	ctx.textAlign = options.align || 'left';
	ctx.fillStyle = '#fff4cc';
	ctx.font = '700 25px "Courier New", Consolas, monospace';
	ctx.fillText(options.label, options.align === 'right' ? options.x + options.width : options.x, labelY);

	ctx.fillStyle = options.back;
	roundRect(ctx, options.x, barY, options.width, barHeight, 10);
	ctx.fill();

	ctx.fillStyle = options.fill;
	roundRect(ctx, options.x, barY, Math.max(options.width * percent, percent > 0 ? 8 : 0), barHeight, 10);
	ctx.fill();

	ctx.strokeStyle = 'rgba(255, 236, 183, 0.72)';
	ctx.lineWidth = 3;
	roundRect(ctx, options.x, barY, options.width, barHeight, 10);
	ctx.stroke();

	ctx.fillStyle = '#fff8dc';
	ctx.font = '700 18px Arial';
	ctx.fillText(
		`${Math.max(options.value, 0)} / ${options.max}`,
		options.align === 'right' ? options.x + options.width - 10 : options.x + 10,
		barY + 22
	);
	ctx.textAlign = 'left';
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
	createBossBattleCard,
	createEncounterBattleCard,
	createHarlequinBattleCard,
	hasEncounterBattleCard
};
