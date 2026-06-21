const path = require('node:path');
const fs = require('node:fs');
const { AttachmentBuilder } = require('discord.js');

const placeholderImage = 'https://placehold.co/900x520/png?text=RPG+Scene+Placeholder';
const characterCreationImageFileName = 'rpg-character-creation-bg.png';
const characterCreationImagePath = path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Character Creation BG.png');
const profileImageFileName = 'rpg-profile-bg.png';
const profileImagePath = path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Profile BG.png');
const travelImageFileName = 'rpg-travel-bg.png';
const travelImagePath = path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Travel BG Image.png');
const serverBossImages = {
	active: {
		fileName: 'stormglass-colossus-battle.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Stormglass Colossus Battle.png')
	},
	defeated: {
		fileName: 'stormglass-colossus-defeat.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Stormglass Colossus Defeat.png')
	}
};
const npcPortraitPath = path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'NPC Portraits');
const attachmentBufferCache = new Map();
const adventureStoryImages = {
	'broken-gate-gatehouse-corridor': {
		fileName: 'region-1-adventure-story-2.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Region 1 - Adventure Story Image 2.png')
	},
	'broken-gate-market-arch': {
		fileName: 'region-1-adventure-story-1.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Region 1 - Adventure Story Image 1.png')
	},
	'broken-gate-black-brick-street': {
		fileName: 'region-1-adventure-story-3.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Region 1 - Adventure Story Image 3.png')
	},
	'ashwood-black-snow-trail': {
		fileName: 'region-2-adventure-story-3.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Region 2 - Adventure Story Image 3.png')
	},
	'ashwood-watch-post': {
		fileName: 'region-2-adventure-story-1.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Region 2 - Adventure Story Image 1.png')
	},
	'ashwood-hunter-camp': {
		fileName: 'region-2-adventure-story-2.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Region 2 - Adventure Story Image 2.png')
	},
	'glassmine-reflection-wall': {
		fileName: 'region-3-adventure-story-2.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Region 3 - Adventure Story Image 2.png')
	},
	'glassmine-crystal-bridge': {
		fileName: 'region-3-adventure-story-1.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Region 3 - Adventure Story Image 1.png')
	},
	'glassmine-broken-carts': {
		fileName: 'region-3-adventure-story-3.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Region 3 - Adventure Story Image 3.png')
	}
};
const battleResultImages = {
	'echo-miner-defeat': {
		fileName: 'echo-miner-defeat.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Echo Miner Defeat.png')
	},
	'gate-wisp-defeat': {
		fileName: 'gate-wisp-defeat.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Gate Wisp Defeat.png')
	},
	'glass-mite-defeat': {
		fileName: 'glass-mite-defeat.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Glass Mite Defeat.png')
	},
	'hollow-fire-defeat': {
		fileName: 'hollow-fire-defeat.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Hollow Fire Defeat.png')
	},
	'mossbound-regent-defeat': {
		fileName: 'mossbound-regent-defeat.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Mossbound Regent Defeat.png')
	},
	'mummy-defeat': {
		fileName: 'mummy-defeat.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Mummy Defeat.png')
	},
	'mossbound-knight-defeat': {
		fileName: 'mossbound-knight-defeat.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Mossbound Knight Defeat.png')
	},
	'rust-hound-defeat': {
		fileName: 'rust-hound-defeat.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Rust Hound Defeat.png')
	},
	'thorn-stalker-defeat': {
		fileName: 'thorn-stalker-defeat.png',
		path: path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Thorn Stalker Defeat.png')
	}
};

const sceneImages = {
	create: `attachment://${characterCreationImageFileName}`,
	profile: `attachment://${profileImageFileName}`,
	quest: placeholderImage,
	inventory: placeholderImage,
	battle: placeholderImage,
	'broken-gate': placeholderImage,
	'ashwood-outskirts': placeholderImage,
	'glassmine-depths': placeholderImage,
	travel: `attachment://${travelImageFileName}`
};

function createCharacterCreationImageAttachment() {
	return attachmentFromFile(characterCreationImagePath, characterCreationImageFileName);
}

function createProfileImageAttachment() {
	return attachmentFromFile(profileImagePath, profileImageFileName);
}

function createTravelImageAttachment() {
	return attachmentFromFile(travelImagePath, travelImageFileName);
}

function serverBossImage(status) {
	const image = status === 'defeated' ? serverBossImages.defeated : serverBossImages.active;
	return {
		url: `attachment://${image.fileName}`,
		attachment: attachmentFromFile(image.path, image.fileName)
	};
}

function npcPortrait(portrait) {
	if (!portrait) return null;
	const extension = path.extname(portrait) || '.png';
	const baseName = path
		.basename(portrait, extension)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-');
	const fileName = `rpg-npc-${baseName}${extension}`;
	return {
		url: `attachment://${fileName}`,
		attachment: attachmentFromFile(path.join(npcPortraitPath, portrait), fileName)
	};
}

function adventureStoryImage(id) {
	const image = adventureStoryImages[id];
	if (!image) return null;
	return {
		url: `attachment://${image.fileName}`,
		attachment: attachmentFromFile(image.path, image.fileName)
	};
}

function battleResultImage(id) {
	const image = battleResultImages[id];
	if (!image) return null;
	return {
		url: `attachment://${image.fileName}`,
		attachment: attachmentFromFile(image.path, image.fileName)
	};
}

function attachmentFromFile(filePath, fileName) {
	if (!attachmentBufferCache.has(filePath)) attachmentBufferCache.set(filePath, fs.readFileSync(filePath));
	return new AttachmentBuilder(attachmentBufferCache.get(filePath), { name: fileName });
}

module.exports = {
	adventureStoryImage,
	battleResultImage,
	createCharacterCreationImageAttachment,
	createProfileImageAttachment,
	createTravelImageAttachment,
	npcPortrait,
	placeholderImage,
	sceneImages,
	serverBossImage
};
