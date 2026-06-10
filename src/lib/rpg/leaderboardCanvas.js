const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const backgroundPath = path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Leaderboard BG.png');
const width = 960;
const height = 610;

async function createRpgLeaderboardCard({ guildName, leaders, type, page, totalPages, resolveUser, fileName = 'rpg-leaderboard.png' }) {
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	await drawBackground(ctx);
	drawFrame(ctx);
	drawTitle(ctx, guildName, type, page, totalPages);

	for (const [index, profile] of leaders.entries()) {
		const user = resolveUser(profile.userId);
		drawEntry(ctx, profile, user, page * 6 + index + 1, index, type);
	}

	if (!leaders.length) drawEmptyState(ctx);

	return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: fileName });
}

async function drawBackground(ctx) {
	try {
		const background = await loadImage(backgroundPath);
		ctx.drawImage(background, 0, 0, width, height);
	} catch {
		const gradient = ctx.createLinearGradient(0, 0, width, height);
		gradient.addColorStop(0, '#8a6422');
		gradient.addColorStop(0.5, '#e2c26d');
		gradient.addColorStop(1, '#6f4d18');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);
	}

	ctx.fillStyle = 'rgba(22, 13, 6, 0.48)';
	ctx.fillRect(0, 0, width, height);
}

function drawFrame(ctx) {
	ctx.strokeStyle = 'rgba(255, 232, 153, 0.7)';
	ctx.lineWidth = 4;
	roundRect(ctx, 28, 26, width - 56, height - 52, 22);
	ctx.stroke();

	ctx.fillStyle = 'rgba(28, 18, 10, 0.62)';
	roundRect(ctx, 48, 46, width - 96, height - 92, 18);
	ctx.fill();
}

function drawTitle(ctx, guildName, type, page, totalPages) {
	ctx.fillStyle = '#fff1b8';
	ctx.font = '700 44px Georgia';
	ctx.fillText('RPG Leaderboard', 76, 105);

	ctx.fillStyle = '#e4c776';
	ctx.font = '700 22px Arial';
	ctx.fillText(`${labelForType(type)} standings`, 80, 140);

	ctx.textAlign = 'right';
	ctx.fillStyle = '#f5deb0';
	ctx.font = '700 20px Arial';
	ctx.fillText(guildName, width - 78, 102);
	ctx.fillStyle = '#d2ad62';
	ctx.fillText(`Page ${page + 1} / ${totalPages}`, width - 78, 132);
	ctx.textAlign = 'left';
}

function drawEntry(ctx, profile, user, rank, index, type) {
	const y = 175 + index * 66;
	const isTopThree = rank <= 3;
	const metric = metricForType(profile, type);

	ctx.fillStyle = isTopThree ? 'rgba(255, 212, 91, 0.19)' : 'rgba(255, 255, 255, 0.08)';
	roundRect(ctx, 76, y, width - 152, 50, 12);
	ctx.fill();

	ctx.fillStyle = isTopThree ? '#ffe070' : '#d9c6a3';
	ctx.font = '700 24px Arial';
	ctx.fillText(`#${rank}`, 100, y + 33);

	ctx.fillStyle = '#fff8dc';
	ctx.font = '700 25px Arial';
	ctx.fillText(trimText(ctx, profile.name || 'Unknown Warden', 260), 168, y + 23);

	ctx.fillStyle = '#d8bd7a';
	ctx.font = '18px Arial';
	ctx.fillText(trimText(ctx, user ? `@${user.username}` : profile.userId, 260), 168, y + 43);

	ctx.textAlign = 'right';
	ctx.fillStyle = '#fff1b8';
	ctx.font = '700 25px Arial';
	ctx.fillText(metric.value, width - 100, y + 25);

	ctx.fillStyle = '#d8bd7a';
	ctx.font = '700 16px Arial';
	ctx.fillText(metric.label, width - 100, y + 45);

	if (type !== 'level') {
		ctx.fillStyle = '#caa45c';
		ctx.font = '700 18px Arial';
		ctx.fillText(`RANK ${profile.level}`, width - 270, y + 34);
	}
	ctx.textAlign = 'left';
}

function drawEmptyState(ctx) {
	ctx.fillStyle = '#fff1b8';
	ctx.font = '700 30px Arial';
	ctx.fillText('No Wardens have entered the record yet.', 250, 335);
}

function labelForType(type) {
	return (
		{
			level: 'Rank',
			gold: 'Gold',
			wins: 'Victories',
			shards: 'Relic Shards'
		}[type] || 'Rank'
	);
}

function metricForType(profile, type) {
	const metrics = {
		level: { label: 'RANK', value: `RANK ${profile.level}` },
		gold: { label: 'GOLD', value: profile.gold.toLocaleString() },
		wins: { label: 'VICTORIES', value: profile.battlesWon.toLocaleString() },
		shards: { label: 'RELIC SHARDS', value: profile.relicShards.toLocaleString() }
	};
	return metrics[type] || metrics.level;
}

function trimText(ctx, text, maxWidth) {
	if (ctx.measureText(text).width <= maxWidth) return text;
	let output = text;
	while (output.length > 1 && ctx.measureText(`${output}...`).width > maxWidth) output = output.slice(0, -1);
	return `${output}...`;
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
	createRpgLeaderboardCard
};
