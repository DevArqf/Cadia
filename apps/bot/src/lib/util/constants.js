const { envParseArray } = require('@skyra/env-utilities');

module.exports = {
	RandomLoadingMessage: ['Computing...', 'Thinking...', 'Cooking some food', 'Give me a moment', 'Loading...'],
	Owners: envParseArray('BOT_OWNERS'),
	Developers: envParseArray('DEVELOPERS'),
	PrivilegedUsers: [...envParseArray('BOT_OWNERS'), ...envParseArray('DEVELOPERS')]
};
