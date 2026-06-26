const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { getLevelProgress } = require('./leveling');
const avatarImageCache = new Map();
const MAX_AVATAR_CACHE_ENTRIES = 100;

async function createRankCard({ user, member, level, rank, guild }) {
	const width = 1000;
	const height = 320;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');
	const progress = getLevelProgress(level);

	drawBackground(ctx, width, height);
	drawAccent(ctx);
	await drawAvatar(ctx, user.displayAvatarURL({ extension: 'png', size: 256 }));
	drawIdentity(ctx, user, member, guild);
	drawStats(ctx, progress, rank);
	drawProgressBar(ctx, progress);

	return new AttachmentBuilder(await canvas.encode('png'), { name: 'rank-card.png' });
}

function drawBackground(ctx, width, height) {
	const gradient = ctx.createLinearGradient(0, 0, width, height);
	gradient.addColorStop(0, '#111827');
	gradient.addColorStop(0.45, '#172033');
	gradient.addColorStop(1, '#071019');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, width, height);

	ctx.globalAlpha = 0.2;
	ctx.fillStyle = '#65b8da';
	for (let i = 0; i < 9; i++) {
		ctx.beginPath();
		ctx.arc(120 + i * 120, 80 + (i % 3) * 70, 70, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalAlpha = 1;
}

function drawAccent(ctx) {
	ctx.fillStyle = '#65b8da';
	ctx.fillRect(0, 0, 18, 320);

	ctx.fillStyle = 'rgba(255,255,255,0.08)';
	roundRect(ctx, 42, 34, 916, 252, 28);
	ctx.fill();
}

async function drawAvatar(ctx, avatarUrl) {
	try {
		const avatar = await loadCachedAvatar(avatarUrl);
		ctx.save();
		ctx.beginPath();
		ctx.arc(168, 160, 92, 0, Math.PI * 2);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(avatar, 76, 68, 184, 184);
		ctx.restore();
	} catch {
		ctx.fillStyle = '#65b8da';
		ctx.beginPath();
		ctx.arc(168, 160, 92, 0, Math.PI * 2);
		ctx.fill();
	}

	ctx.strokeStyle = '#65b8da';
	ctx.lineWidth = 8;
	ctx.beginPath();
	ctx.arc(168, 160, 96, 0, Math.PI * 2);
	ctx.stroke();
}

async function loadCachedAvatar(avatarUrl) {
	if (!avatarImageCache.has(avatarUrl)) {
		avatarImageCache.set(
			avatarUrl,
			loadImage(avatarUrl).catch(() => null)
		);
		if (avatarImageCache.size > MAX_AVATAR_CACHE_ENTRIES) avatarImageCache.delete(avatarImageCache.keys().next().value);
	}
	const avatar = await avatarImageCache.get(avatarUrl);
	if (!avatar) throw new Error('Avatar image unavailable.');
	return avatar;
}

function drawIdentity(ctx, user, member, guild) {
	ctx.fillStyle = '#ffffff';
	ctx.font = '700 42px Arial';
	ctx.fillText(member?.displayName || user.username, 305, 112);

	ctx.fillStyle = '#9ca3af';
	ctx.font = '24px Arial';
	ctx.fillText(`@${user.username}`, 308, 150);
	ctx.fillText(guild.name, 308, 185);
}

function drawStats(ctx, progress, rank) {
	drawStat(ctx, 'RANK', `#${rank}`, 720, 78);
	drawStat(ctx, 'LEVEL', progress.currentLevel.toLocaleString(), 840, 78);

	ctx.fillStyle = '#d1d5db';
	ctx.font = '700 26px Arial';
	ctx.fillText(`${progress.currentXp.toLocaleString()} / ${progress.neededXp.toLocaleString()} XP`, 308, 238);

	ctx.fillStyle = '#9ca3af';
	ctx.font = '20px Arial';
	ctx.fillText(`${progress.totalXp.toLocaleString()} total XP`, 308, 268);
}

function drawStat(ctx, label, value, x, y) {
	ctx.fillStyle = '#9ca3af';
	ctx.font = '700 18px Arial';
	ctx.fillText(label, x, y);

	ctx.fillStyle = '#ffffff';
	ctx.font = '700 34px Arial';
	ctx.fillText(value, x, y + 40);
}

function drawProgressBar(ctx, progress) {
	const x = 305;
	const y = 205;
	const width = 615;
	const height = 18;

	ctx.fillStyle = 'rgba(255,255,255,0.12)';
	roundRect(ctx, x, y, width, height, 9);
	ctx.fill();

	const fillWidth = Math.max(height, width * progress.progress);
	const gradient = ctx.createLinearGradient(x, y, x + width, y);
	gradient.addColorStop(0, '#65b8da');
	gradient.addColorStop(1, '#7c3aed');
	ctx.fillStyle = gradient;
	roundRect(ctx, x, y, fillWidth, height, 9);
	ctx.fill();
}

function roundRect(ctx, x, y, width, height, radius) {
	const r = Math.min(radius, width / 2, height / 2);
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + width, y, x + width, y + height, r);
	ctx.arcTo(x + width, y + height, x, y + height, r);
	ctx.arcTo(x, y + height, x, y, r);
	ctx.arcTo(x, y, x + width, y, r);
	ctx.closePath();
}

module.exports = {
	createRankCard
};
