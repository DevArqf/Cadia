require('@sapphire/plugin-logger/register');
require('@sapphire/plugin-subcommands/register');

const { ApplicationCommandRegistries, RegisterBehavior } = require('@sapphire/framework');
const { setup, envParseString } = require('@skyra/env-utilities');
const { createColors } = require('colorette');
const { inspect } = require('util');

// Set default behavior to bulk overwrite
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

// Set default inspection depth
inspect.defaultOptions.depth = 1;

// Enable colorette
createColors({ useColor: true });

// Read env var
setup();
process.env.NODE_ENV = envParseString('NODE_ENV') ?? 'production';
