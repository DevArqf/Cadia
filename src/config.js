// Compatibility facade: existing consumers can migrate to focused config modules incrementally.
const { ClientConfig } = require('./config/client');
const { branding } = require('./config/branding');
const { channels } = require('./config/channels');
const { color } = require('./config/colors');
const { emojis } = require('./config/emojis');

module.exports = { ClientConfig, branding, channels, color, emojis };
