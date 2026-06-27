const { SimpleShardingStrategy } = require('@discordjs/ws');

const SHARD_MAX_LISTENERS = 20;

class CadiaShardingStrategy extends SimpleShardingStrategy {
	async spawn(shardIds) {
		await super.spawn(shardIds);
		configureShardListenerCapacity(this.shards.values());
	}
}

function buildCadiaShardingStrategy(manager) {
	return new CadiaShardingStrategy(manager);
}

function configureShardListenerCapacity(shards) {
	for (const shard of shards) shard.setMaxListeners(SHARD_MAX_LISTENERS);
}

module.exports = {
	CadiaShardingStrategy,
	SHARD_MAX_LISTENERS,
	buildCadiaShardingStrategy,
	configureShardListenerCapacity
};
