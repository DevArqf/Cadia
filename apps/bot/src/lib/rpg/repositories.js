const database = {
	acquireLock: (...args) => require('../database/mysql').acquireTransactionLock(...args),
	error: () => require('../database/mysql').getMysqlError(),
	isConnected: () => require('../database/mysql').isMysqlConnected(),
	transaction: (...args) => require('../database/mysql').withTransaction(...args)
};

const profiles = modelRepository(() => require('../schemas/RPG System/rpgProfileSchema').RpgProfileSchema);
const access = modelRepository(() => require('../schemas/RPG System/rpgAccessSchema').RpgAccessSchema);
const tutorials = modelRepository(() => require('../schemas/RPG System/rpgTutorialSchema').RpgTutorialSchema);
const activity = modelRepository(() => require('../schemas/rpgGrowthSchema').RpgGrowthSchema);
const players = modelRepository(() => require('../schemas/rpgPlayerGrowthSchema').RpgPlayerGrowthSchema);
const bosses = modelRepository(() => require('../schemas/rpgServerBossSchema').RpgServerBossSchema);
const analyticsGuilds = modelRepository(() => require('../schemas/botAnalyticsGuildSchema').BotAnalyticsGuildSchema);

function modelRepository(resolveModel) {
	return {
		create: (data) => resolveModel().create(data),
		createRecord: (data) => new (resolveModel())(data),
		deleteOne: (filter) => resolveModel().deleteOne(filter),
		find: (filter = {}) => resolveModel().find(filter),
		findOne: (filter = {}) => resolveModel().findOne(filter),
		findOneForUpdate: (filter = {}) => {
			const Model = resolveModel();
			return typeof Model.findOneForUpdate === 'function' ? Model.findOneForUpdate(filter) : Model.findOne(filter);
		}
	};
}

module.exports = {
	access,
	activity,
	analyticsGuilds,
	bosses,
	database,
	players,
	profiles,
	tutorials
};
