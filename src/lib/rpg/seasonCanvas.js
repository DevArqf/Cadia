const { createCanvas } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const width = 1200;
const height = 700;

function createSeasonCard({ season, progress, complete = false, claimed = false, fileName = 'rpg-season.png' }) {
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');
	const state = claimed ? 'CLAIMED' : complete ? 'READY TO CLAIM' : 'IN PROGRESS';
	const accent = claimed ? '#65e6a5' : complete ? '#ffd46b' : '#a98cff';

	drawBackground(ctx);
	drawAtmosphere(ctx);
	drawFrame(ctx, accent);
	drawHeader(ctx, season, state, accent);
	drawProgressCard(ctx, {
		x: 74,
		y: 250,
		width: 500,
		label: 'ENCOUNTER VICTORIES',
		value: progress.victories,
		target: season.quest.victories,
		accent: '#b99cff'
	});
	drawProgressCard(ctx, {
		x: 626,
		y: 250,
		width: 500,
		label: 'ACTIVE DAYS',
		value: progress.activeDays,
		target: season.quest.activeDays,
		accent: '#6fd7ff'
	});
	drawReward(ctx, season.cosmetic, claimed, complete, accent);
	drawFooter(ctx, claimed, complete);

	return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: fileName });
}

function drawBackground(ctx) {
	const background = ctx.createLinearGradient(0, 0, width, height);
	background.addColorStop(0, '#09091a');
	background.addColorStop(0.45, '#17113a');
	background.addColorStop(1, '#071827');
	ctx.fillStyle = background;
	ctx.fillRect(0, 0, width, height);

	const glow = ctx.createRadialGradient(600, 250, 20, 600, 250, 600);
	glow.addColorStop(0, 'rgba(123, 82, 220, 0.34)');
	glow.addColorStop(0.52, 'rgba(64, 73, 168, 0.13)');
	glow.addColorStop(1, 'rgba(4, 8, 23, 0)');
	ctx.fillStyle = glow;
	ctx.fillRect(0, 0, width, height);
}

function drawAtmosphere(ctx) {
	const particles = [
		[78, 86, 2.2],
		[151, 184, 1.4],
		[242, 96, 1.1],
		[339, 151, 2],
		[451, 70, 1.2],
		[545, 173, 1.6],
		[674, 82, 1.3],
		[773, 166, 2.1],
		[888, 74, 1.2],
		[1008, 138, 1.8],
		[1115, 82, 1.1],
		[95, 602, 1.4],
		[1090, 579, 1.7]
	];

	for (const [x, y, radius] of particles) {
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fillStyle = 'rgba(224, 226, 255, 0.72)';
		ctx.fill();
	}

	ctx.save();
	ctx.translate(600, 142);
	ctx.rotate(Math.PI / 4);
	ctx.strokeStyle = 'rgba(187, 154, 255, 0.45)';
	ctx.lineWidth = 2;
	ctx.strokeRect(-31, -31, 62, 62);
	ctx.strokeStyle = 'rgba(102, 215, 255, 0.25)';
	ctx.strokeRect(-21, -21, 42, 42);
	ctx.restore();
}

function drawFrame(ctx, accent) {
	ctx.save();
	ctx.shadowColor = accent;
	ctx.shadowBlur = 26;
	ctx.strokeStyle = withAlpha(accent, 0.58);
	ctx.lineWidth = 3;
	roundRect(ctx, 30, 28, width - 60, height - 56, 30);
	ctx.stroke();
	ctx.restore();

	ctx.fillStyle = 'rgba(7, 8, 24, 0.58)';
	roundRect(ctx, 48, 46, width - 96, height - 92, 24);
	ctx.fill();
	ctx.strokeStyle = 'rgba(222, 215, 255, 0.12)';
	ctx.lineWidth = 1;
	ctx.stroke();
}

function drawHeader(ctx, season, state, accent) {
	ctx.textAlign = 'center';
	ctx.fillStyle = '#a990ef';
	ctx.font = '700 19px Arial';
	ctx.fillText(`CADIA SEASON  •  ${String(season.id || '').toUpperCase()}`, width / 2, 87);

	ctx.fillStyle = '#f5f1ff';
	ctx.font = '700 55px Georgia';
	ctx.fillText(trimText(ctx, season.name, 680), width / 2, 154);

	ctx.fillStyle = '#a7b1cf';
	ctx.font = '500 19px Arial';
	ctx.fillText(`Limited quest ends ${formatDate(season.endsAt)}`, width / 2, 190);

	const badgeWidth = Math.max(ctx.measureText(state).width + 50, 160);
	ctx.fillStyle = withAlpha(accent, 0.14);
	roundRect(ctx, width / 2 - badgeWidth / 2, 207, badgeWidth, 34, 17);
	ctx.fill();
	ctx.strokeStyle = withAlpha(accent, 0.55);
	ctx.stroke();
	ctx.fillStyle = accent;
	ctx.font = '700 15px Arial';
	ctx.fillText(state, width / 2, 230);
	ctx.textAlign = 'left';
}

function drawProgressCard(ctx, { x, y, width: cardWidth, label, value, target, accent }) {
	const safeTarget = Math.max(Number(target) || 0, 1);
	const safeValue = Math.max(Math.min(Number(value) || 0, safeTarget), 0);
	const percentage = Math.round((safeValue / safeTarget) * 100);

	ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
	roundRect(ctx, x, y, cardWidth, 154, 20);
	ctx.fill();
	ctx.strokeStyle = 'rgba(211, 205, 255, 0.13)';
	ctx.lineWidth = 1;
	ctx.stroke();

	ctx.fillStyle = '#9ca8c8';
	ctx.font = '700 15px Arial';
	ctx.fillText(label, x + 28, y + 39);

	ctx.textAlign = 'right';
	ctx.fillStyle = '#f5f3ff';
	ctx.font = '700 30px Arial';
	ctx.fillText(`${safeValue} / ${safeTarget}`, x + cardWidth - 28, y + 44);
	ctx.textAlign = 'left';

	ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
	roundRect(ctx, x + 28, y + 78, cardWidth - 56, 20, 10);
	ctx.fill();

	if (safeValue > 0) {
		const progressWidth = Math.max((cardWidth - 56) * (safeValue / safeTarget), 20);
		const gradient = ctx.createLinearGradient(x + 28, 0, x + cardWidth - 28, 0);
		gradient.addColorStop(0, accent);
		gradient.addColorStop(1, '#f0e8ff');
		ctx.save();
		ctx.shadowColor = accent;
		ctx.shadowBlur = 14;
		ctx.fillStyle = gradient;
		roundRect(ctx, x + 28, y + 78, progressWidth, 20, 10);
		ctx.fill();
		ctx.restore();
	}

	ctx.fillStyle = '#8e99b7';
	ctx.font = '600 15px Arial';
	ctx.fillText(`${percentage}% complete`, x + 28, y + 128);
}

function drawReward(ctx, cosmetic, claimed, complete, accent) {
	const y = 436;
	ctx.fillStyle = 'rgba(113, 84, 186, 0.13)';
	roundRect(ctx, 74, y, width - 148, 132, 22);
	ctx.fill();
	ctx.strokeStyle = withAlpha(accent, 0.3);
	ctx.stroke();

	ctx.save();
	ctx.translate(142, y + 66);
	ctx.rotate(Math.PI / 4);
	ctx.fillStyle = withAlpha(accent, 0.17);
	ctx.strokeStyle = accent;
	ctx.lineWidth = 3;
	ctx.fillRect(-30, -30, 60, 60);
	ctx.strokeRect(-30, -30, 60, 60);
	ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
	ctx.strokeRect(-19, -19, 38, 38);
	ctx.restore();

	ctx.fillStyle = '#a995e6';
	ctx.font = '700 14px Arial';
	ctx.fillText('LIMITED COSMETIC REWARD', 207, y + 38);
	ctx.fillStyle = '#f4efff';
	ctx.font = '700 31px Georgia';
	ctx.fillText(trimText(ctx, cosmetic.name, 580), 207, y + 79);
	ctx.fillStyle = '#98a3c1';
	ctx.font = '500 16px Arial';
	ctx.fillText(
		claimed ? 'Added to your collection' : complete ? 'Unlocked and ready to claim' : 'Complete both objectives to unlock',
		207,
		y + 105
	);

	ctx.textAlign = 'right';
	ctx.fillStyle = claimed ? '#65e6a5' : '#aab3ce';
	ctx.font = '700 17px Arial';
	ctx.fillText(claimed ? 'OWNED' : cosmetic.rarity || 'LIMITED', width - 104, y + 72);
	ctx.textAlign = 'left';
}

function drawFooter(ctx, claimed, complete) {
	const message = claimed
		? 'Season reward secured. Your legend carries into the next chapter.'
		: complete
			? 'Quest complete. Use /rpg season action:Claim to secure your reward.'
			: 'Win encounters and return on multiple days before the season ends.';
	ctx.fillStyle = '#a8b1cb';
	ctx.font = '500 17px Arial';
	ctx.textAlign = 'center';
	ctx.fillText(message, width / 2, 617);
	ctx.fillStyle = '#716c91';
	ctx.font = '700 13px Arial';
	ctx.fillText('THE RELIC STORM REMEMBERS EVERY WARDEN', width / 2, 650);
	ctx.textAlign = 'left';
}

function formatDate(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'at the close of the season';
	return new Intl.DateTimeFormat('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(date);
}

function trimText(ctx, text, maxWidth) {
	const input = String(text || 'Unnamed Season');
	if (ctx.measureText(input).width <= maxWidth) return input;
	let output = input;
	while (output.length > 1 && ctx.measureText(`${output}...`).width > maxWidth) output = output.slice(0, -1);
	return `${output}...`;
}

function withAlpha(hex, alpha) {
	const value = hex.replace('#', '');
	const red = Number.parseInt(value.slice(0, 2), 16);
	const green = Number.parseInt(value.slice(2, 4), 16);
	const blue = Number.parseInt(value.slice(4, 6), 16);
	return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
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

module.exports = { createSeasonCard };
