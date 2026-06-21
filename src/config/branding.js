const { version } = require('../../package.json');

const branding = {
	name: 'Cadia',
	tagline: 'A story-driven Discord RPG with community tools',
	userAgent: `Cadia-Bot/v${version}`,
	supportServerUrl: 'https://discord.gg/26R7kXa6dx',
	applicationId: '1200475110235197631',
	ownerUserId: '899385550585364481',
	helpCommandId: '1221554638910787585',
	bugReportCommandId: '1219050295770742934',
	alertCommandId: '1512787844664528928'
};

module.exports = { branding };
