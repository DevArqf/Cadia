const { EmbedBuilder } = require('discord.js');
const { color } = require('../../config');

const welcomeTemplates = {
	classic: {
		id: 'classic',
		name: 'Classic',
		type: 'embed',
		message: 'Welcome {user} to **{serverName}**.\nYou are member **{memberOrdinal}**. Take a look around and enjoy your stay.',
		embed: {
			title: 'Welcome to {serverName}',
			color: color.default,
			thumbnail: '{userAvatar}',
			footer: 'Member #{serverMembers} - Account age: {accountAge}'
		}
	},
	clean: {
		id: 'clean',
		name: 'Clean',
		type: 'regular',
		message: 'Welcome {user} to **{serverName}**. You are member **{memberOrdinal}**.'
	},
	community: {
		id: 'community',
		name: 'Community',
		type: 'embed',
		message: '{user} just joined **{serverName}**.\nSay hello and help them get settled. We now have **{serverMembers}** members.',
		embed: {
			title: 'A New Member Arrived',
			color: '#65b8da',
			thumbnail: '{serverIcon}',
			footer: 'User ID: {userId}'
		}
	},
	bold: {
		id: 'bold',
		name: 'Bold',
		type: 'embed',
		message: '**{userTag}** entered **{serverName}**.\nMember count: **{serverMembers}**.',
		embed: {
			title: 'Member Joined',
			color: '#f2b84b',
			thumbnail: '{userAvatar}',
			image: '{serverIcon}',
			footer: 'Joined as {memberOrdinal}'
		}
	}
};

function listWelcomeTemplates() {
	return Object.values(welcomeTemplates);
}

function getWelcomeTemplate(templateId = 'classic') {
	return welcomeTemplates[templateId] || welcomeTemplates.classic;
}

function renderWelcomePreview(member, config) {
	return renderWelcomeMessage(member, normalizeWelcomeConfig(config));
}

function renderWelcomeMessage(member, config) {
	const values = getWelcomeVariables(member);
	const template = getWelcomeTemplate(config.templateId || 'classic');
	const type = config.messageType || template.type;
	const message = applyWelcomeVariables(config.message || template.message, values);

	if (type !== 'embed') return { content: message };

	const embedConfig = {
		...template.embed,
		title: config.title ?? template.embed?.title,
		footer: config.footer ?? template.embed?.footer,
		thumbnail: config.iconURL ?? template.embed?.thumbnail,
		image: config.thumbnailImage ?? template.embed?.image,
		author: config.authorName ?? template.embed?.author,
		color: config.hexCode ?? template.embed?.color
	};
	const embed = new EmbedBuilder().setColor(resolveColor(embedConfig.color)).setDescription(message);
	const title = applyWelcomeVariables(embedConfig.title, values);
	const footer = applyWelcomeVariables(embedConfig.footer, values);
	const thumbnail = applyWelcomeVariables(embedConfig.thumbnail, values);
	const image = applyWelcomeVariables(embedConfig.image, values);
	const author = applyWelcomeVariables(embedConfig.author, values);

	if (title) embed.setTitle(title);
	if (footer) embed.setFooter({ text: footer });
	if (isValidUrl(thumbnail)) embed.setThumbnail(thumbnail);
	if (isValidUrl(image)) embed.setImage(image);
	if (author) embed.setAuthor({ name: author });

	return { embeds: [embed] };
}

function normalizeWelcomeConfig(config = {}) {
	const template = getWelcomeTemplate(config.templateId || 'classic');
	return {
		...config,
		enabled: config.enabled !== false,
		templateId: config.templateId || template.id,
		messageType: config.messageType || template.type,
		message: config.message || template.message
	};
}

function applyWelcomeVariables(value, values) {
	if (!value) return null;

	return String(value)
		.replaceAll('{user}', values.user)
		.replaceAll('{userMention}', values.user)
		.replaceAll('{userName}', values.userName)
		.replaceAll('{userTag}', values.userTag)
		.replaceAll('{userId}', values.userId)
		.replaceAll('{serverName}', values.serverName)
		.replaceAll('{serverMembers}', values.serverMembers)
		.replaceAll('{memberOrdinal}', values.memberOrdinal)
		.replaceAll('{serverIcon}', values.serverIcon)
		.replaceAll('{userAvatar}', values.userAvatar)
		.replaceAll('{accountAge}', values.accountAge)
		.replace(/\\n/g, '\n');
}

function getWelcomeVariables(member) {
	const memberCount = member.guild.memberCount ?? member.guild.members.cache.size;
	const createdTimestamp = member.user.createdTimestamp ?? Date.now();

	return {
		user: `${member}`,
		userName: member.user.username,
		userTag: member.user.tag,
		userId: member.id,
		serverName: member.guild.name,
		serverMembers: String(memberCount),
		memberOrdinal: ordinal(memberCount),
		serverIcon: member.guild.iconURL?.({ extension: 'png', size: 1024 }) ?? '',
		userAvatar: member.user.displayAvatarURL({ extension: 'png', size: 1024 }),
		accountAge: formatDuration(Date.now() - createdTimestamp)
	};
}

function resolveColor(value) {
	if (typeof value === 'number') return value;
	if (typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)) return value;
	return color.default;
}

function isValidUrl(value) {
	return typeof value === 'string' && /^https?:\/\//i.test(value);
}

function ordinal(value) {
	const number = Number(value);
	const mod100 = number % 100;
	if (mod100 >= 11 && mod100 <= 13) return `${number}th`;

	const suffixes = ['th', 'st', 'nd', 'rd'];
	return `${number}${suffixes[number % 10] || 'th'}`;
}

function formatDuration(milliseconds) {
	const days = Math.max(0, Math.floor(milliseconds / 86_400_000));
	if (days >= 365) return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? '' : 's'}`;
	if (days >= 30) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? '' : 's'}`;
	return `${days} day${days === 1 ? '' : 's'}`;
}

module.exports = {
	applyWelcomeVariables,
	getWelcomeTemplate,
	listWelcomeTemplates,
	normalizeWelcomeConfig,
	renderWelcomeMessage,
	renderWelcomePreview
};
