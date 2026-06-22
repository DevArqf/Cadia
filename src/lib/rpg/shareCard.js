const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { badgeAssetPath } = require('./badges');
const { badges } = require('./data');

async function createCharacterShareCard({ profile, userName, badge = null }) {
	return renderCard({
		title: profile.name,
		subtitle: `${userName} • Rank ${profile.level} • ${profile.battlesWon || 0} victories`,
		lines: [
			`Region: ${profile.region}`,
			`Gold: ${(profile.gold || 0).toLocaleString()}  •  Shards: ${(profile.relicShards || 0).toLocaleString()}`,
			badge ? `Featured Badge: ${badge.name}` : 'Featured Badge: None'
		],
		badge,
		fileName: `cadia-character-${profile.characterId}.png`
	});
}

async function createAchievementShareCard({ profile, userName, achievement }) {
	const rewardParts = [];
	if (achievement.rewards?.gold) rewardParts.push(`${achievement.rewards.gold.toLocaleString()} Gold`);
	if (achievement.rewards?.shards) rewardParts.push(`${achievement.rewards.shards.toLocaleString()} Relic Shards`);
	const badge = badges[achievement.badgeId] || null;
	return renderCard({
		title: achievement.name,
		subtitle: `${profile.name} • ${userName}`,
		lines: [
			achievement.description,
			`Rank ${profile.level} • ${profile.battlesWon || 0} victories`,
			rewardParts.length ? `Reward: ${rewardParts.join(' + ')}` : 'Achievement earned in Cadia RPG'
		],
		badge,
		fileName: `cadia-achievement-${achievement.id}.png`
	});
}

async function renderCard({ title, subtitle, lines, badge = null, fileName }) {
	const canvas = createCanvas(1000, 560);
	const ctx = canvas.getContext('2d');
	const gradient = ctx.createLinearGradient(0, 0, 1000, 560);
	gradient.addColorStop(0, '#140d25');
	gradient.addColorStop(0.55, '#432a63');
	gradient.addColorStop(1, '#0e5361');
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, 1000, 560);
	ctx.strokeStyle = '#d9b8ff';
	ctx.lineWidth = 5;
	ctx.strokeRect(34, 34, 932, 492);
	ctx.fillStyle = 'rgba(8, 6, 18, 0.55)';
	ctx.fillRect(62, 62, 876, 436);
	ctx.fillStyle = '#e8d8ff';
	ctx.font = '700 58px Georgia';
	ctx.fillText(trim(ctx, title, 800), 96, 155);
	ctx.fillStyle = '#91dce6';
	ctx.font = '700 27px Arial';
	ctx.fillText(trim(ctx, subtitle, 800), 98, 205);
	ctx.fillStyle = '#f5efff';
	ctx.font = '25px Arial';
	const lineWidth = badge ? 620 : 800;
	lines.forEach((line, index) => ctx.fillText(trim(ctx, line, lineWidth), 98, 295 + index * 54));
	if (badge) await drawBadge(ctx, badge);
	ctx.fillStyle = '#b79bd8';
	ctx.font = '700 20px Arial';
	ctx.fillText('CADIA • SHARE YOUR LEGEND', 98, 470);
	return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: fileName });
}

async function drawBadge(ctx, badge) {
	const imagePath = badgeAssetPath(badge);
	if (!imagePath) return;
	const image = await loadImage(imagePath).catch(() => null);
	if (!image) return;
	ctx.save();
	ctx.shadowColor = '#b99cff';
	ctx.shadowBlur = 24;
	ctx.drawImage(image, 760, 250, 140, 140);
	ctx.restore();
	ctx.fillStyle = '#d9c8f5';
	ctx.font = '700 18px Arial';
	ctx.textAlign = 'center';
	ctx.fillText(trim(ctx, badge.name, 180), 830, 420);
	ctx.textAlign = 'left';
}

function trim(ctx, value, width) {
	let text = String(value);
	while (text.length > 1 && ctx.measureText(text).width > width) text = `${text.slice(0, -2)}…`;
	return text;
}

module.exports = { createAchievementShareCard, createCharacterShareCard };
