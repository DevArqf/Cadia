const path = require('node:path');
const { AttachmentBuilder } = require('discord.js');

const placeholderImage = 'https://placehold.co/900x520/png?text=RPG+Scene+Placeholder';
const profileImageFileName = 'rpg-profile-bg.png';
const profileImagePath = path.resolve(__dirname, '..', '..', '..', 'assets', 'RPG Assets', 'Profile BG.png');
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
	profile: `attachment://${profileImageFileName}`,
	quest: placeholderImage,
	inventory: placeholderImage,
	battle: placeholderImage,
	'broken-gate': placeholderImage,
	'ashwood-outskirts': placeholderImage,
	'glassmine-depths': placeholderImage
};

function createProfileImageAttachment() {
	return new AttachmentBuilder(profileImagePath, { name: profileImageFileName });
}

function adventureStoryImage(id) {
	const image = adventureStoryImages[id];
	if (!image) return null;
	return {
		url: `attachment://${image.fileName}`,
		attachment: new AttachmentBuilder(image.path, { name: image.fileName })
	};
}

function battleResultImage(id) {
	const image = battleResultImages[id];
	if (!image) return null;
	return {
		url: `attachment://${image.fileName}`,
		attachment: new AttachmentBuilder(image.path, { name: image.fileName })
	};
}

module.exports = {
	adventureStoryImage,
	battleResultImage,
	createProfileImageAttachment,
	placeholderImage,
	sceneImages
};
