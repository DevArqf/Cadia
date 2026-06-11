const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const width = 1024;
const height = 1024;
const questPagePath = path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Quests Page.png');

async function createQuestPageCard({ profile, region, questText, fileName = 'rpg-quest-page.png' }) {
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext('2d');

	await drawBackground(ctx);
	drawQuestText(ctx, { profile, region, questText });

	return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: fileName });
}

async function drawBackground(ctx) {
	try {
		const background = await loadImage(questPagePath);
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
	wrapText(ctx, questText, 250, 415, 550, 39, 765);

	ctx.textAlign = 'center';
	ctx.fillStyle = '#7a4a27';
	ctx.font = '700 21px "Courier New", Consolas, monospace';
	ctx.fillText('Progress through encounters, ranks, gear, and boss gates.', width / 2, 840);
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
				ctx.fillText('...', x, maxY);
				return;
			}
		} else {
			line = testLine;
		}
	}

	if (line && currentY <= maxY) ctx.fillText(line, x, currentY);
}

module.exports = {
	createQuestPageCard
};
