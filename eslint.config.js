const importPlugin = require('eslint-plugin-import');

module.exports = [
	{
		ignores: ['node_modules/**', 'apps/**/.next/**', 'apps/bot/assets/**', 'coverage/**', 'Cadia-Bot.zip']
	},
	{
		files: ['apps/**/*.js', 'libs/**/*.js'],
		plugins: {
			import: importPlugin
		},
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'commonjs',
			globals: {
				Buffer: 'readonly',
				console: 'readonly',
				module: 'readonly',
				process: 'readonly',
				require: 'readonly',
				setInterval: 'readonly',
				setTimeout: 'readonly',
				clearInterval: 'readonly',
				clearTimeout: 'readonly'
			}
		},
		rules: {
			'import/no-cycle': ['error', { maxDepth: Infinity }]
		}
	}
];
