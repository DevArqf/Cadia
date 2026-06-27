const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

process.env.BOT_OWNERS ??= 'test-owner';
process.env.DEVELOPERS ??= 'test-developer';

const {
	applyVote,
	buildSuggestionModal,
	buildSuggestionPanel,
	buildSuggestionPost,
	cleanInput
} = require('../src/lib/suggestions/suggestionSystem');
const { normalizeSuggestionAppearance } = require('../src/lib/suggestions/appearance');
const { serializeSuggestionConfig } = require('../src/lib/ipc/botIpcServer');

test('suggestion panels support embed and message styling with persistent controls', () => {
	const embedPanel = buildSuggestionPanel('embed');
	const messagePanel = buildSuggestionPanel('message');

	assert.equal(embedPanel.embeds.length, 1);
	assert.equal(embedPanel.components[0].components[0].data.custom_id, 'suggestions:open');
	assert.equal(messagePanel.embeds, undefined);
	assert.match(messagePanel.content, /suggestion/i);
	assert.equal(messagePanel.components[0].components[0].data.custom_id, 'suggestions:open');
	assert.deepEqual(messagePanel.allowedMentions, { parse: [] });
});

test('suggestion modal enforces bounded title and body input', () => {
	const modal = buildSuggestionModal().toJSON();
	const title = modal.components[0].components[0];
	const body = modal.components[1].components[0];

	assert.equal(modal.custom_id, 'suggestions:submit');
	assert.equal(title.min_length, 3);
	assert.equal(title.max_length, 100);
	assert.equal(body.min_length, 10);
	assert.equal(body.max_length, 1000);
});

test('suggestion posts render stored counts and disable direct mentions', () => {
	const post = buildSuggestionPost({
		suggestionId: 'suggestion-id',
		authorId: 'user-id',
		title: 'Improve onboarding',
		body: '@everyone Add a guided setup.',
		upvotes: ['one', 'two'],
		downvotes: ['three'],
		status: 'open',
		createdAt: 1_000
	});
	const embed = post.embeds[0].data;
	const buttons = post.components[0].components;

	assert.match(embed.description, /@everyone Add a guided setup\./);
	assert.match(embed.description, /Upvotes:\*\* 2/);
	assert.match(embed.description, /Downvotes:\*\* 1/);
	assert.deepEqual(post.allowedMentions, { parse: [] });
	assert.equal(buttons[0].data.custom_id, 'suggestions:vote:suggestion-id:up');
	assert.equal(buttons[1].data.custom_id, 'suggestions:vote:suggestion-id:down');
});

test('dashboard appearance settings customize panel and suggestion embeds', () => {
	const config = {
		style: 'embed',
		panel: {
			title: 'Ideas Lab',
			description: 'Build the next update.',
			footer: 'Community reviewed',
			color: '#12abef',
			thumbnailUrl: 'https://example.com/thumb.png',
			imageUrl: 'https://example.com/banner.png',
			buttonLabel: 'Share idea',
			buttonEmoji: '💡'
		},
		post: {
			title: 'Idea: {title}',
			description: '{body}\nVotes: {upvotes}/{downvotes}\nBy {author}',
			footer: '{status} • {id}',
			color: '#abcdef',
			thumbnailUrl: '',
			imageUrl: 'https://example.com/post.png',
			showTimestamp: false
		}
	};
	const panel = buildSuggestionPanel(config);
	const post = buildSuggestionPost(
		{
			suggestionId: 'idea-1',
			authorId: 'user-1',
			title: 'Events',
			body: 'Run monthly events.',
			upvotes: ['one'],
			downvotes: [],
			status: 'open',
			createdAt: 1_000
		},
		config
	);

	assert.equal(panel.embeds[0].data.title, 'Ideas Lab');
	assert.equal(panel.embeds[0].data.color, 0x12abef);
	assert.equal(panel.embeds[0].data.image.url, 'https://example.com/banner.png');
	assert.equal(panel.components[0].components[0].data.label, 'Share idea');
	assert.equal(post.embeds[0].data.title, 'Idea: Events');
	assert.match(post.embeds[0].data.description, /Votes: 1\/0/);
	assert.equal(post.embeds[0].data.footer.text, 'open • idea-1');
	assert.equal(post.embeds[0].data.timestamp, undefined);
});

test('dashboard suggestion settings normalize unsafe colors, URLs, and button emoji', () => {
	const config = normalizeSuggestionAppearance({
		panel: { color: 'red', imageUrl: 'http://unsafe.test/image.png', buttonEmoji: 'not-an-emoji' },
		post: { color: '#AABBCC', thumbnailUrl: 'https://example.com/image.png' }
	});

	assert.equal(config.panel.color, '#65b8da');
	assert.equal(config.panel.imageUrl, '');
	assert.equal(config.panel.buttonEmoji, '✏️');
	assert.equal(config.post.color, '#aabbcc');
	assert.equal(config.post.thumbnailUrl, 'https://example.com/image.png');
});

test('suggestion IPC returns normalized dashboard configuration', () => {
	const config = serializeSuggestionConfig(
		{
			guildId: 'guild',
			channelId: 'channel',
			panelMessageId: 'message',
			enabled: true,
			style: 'embed',
			panel: { title: 'Ideas', color: '#123456' }
		},
		'guild'
	);

	assert.equal(config.enabled, true);
	assert.equal(config.panel.title, 'Ideas');
	assert.equal(config.panel.color, '#123456');
	assert.equal(config.post.title, '{title}');
});

test('voting removes duplicates and switches a user to exactly one side', () => {
	const suggestion = {
		upvotes: ['user', 'user', 'other'],
		downvotes: ['user', 'third']
	};

	applyVote(suggestion, 'user', 'down');
	assert.deepEqual(suggestion.upvotes, ['other']);
	assert.deepEqual(suggestion.downvotes, ['third', 'user']);

	applyVote(suggestion, 'user', 'up');
	assert.deepEqual(suggestion.upvotes, ['other', 'user']);
	assert.deepEqual(suggestion.downvotes, ['third']);
});

test('suggestion input removes unsafe control characters and respects limits', () => {
	assert.equal(cleanInput('  First\r\nSecond\u0000  ', 100), 'First\nSecond');
	assert.equal(cleanInput('abcdefgh', 5), 'abcde');
});

test('suggestion interactions are registered as restart-safe global controls', () => {
	const root = path.resolve(__dirname, '..', 'src');
	const listener = fs.readFileSync(path.join(root, 'listeners', 'globalInteractions.js'), 'utf8');
	const router = fs.readFileSync(path.join(root, 'lib', 'runtime', 'interactionRouter.js'), 'utf8');
	const suggestionSystem = fs.readFileSync(path.join(root, 'lib', 'suggestions', 'suggestionSystem.js'), 'utf8');
	const submitHandler = suggestionSystem.slice(
		suggestionSystem.indexOf('async function submitSuggestion'),
		suggestionSystem.indexOf('async function voteOnSuggestion')
	);

	assert.match(listener, /registerInteractionHandler\('suggestions', handleSuggestionInteraction\)/);
	assert.match(router, /'suggestions'/);
	assert.ok(submitHandler.indexOf('interaction.deferReply') < submitHandler.indexOf('SuggestionConfig.findOne'));
});
