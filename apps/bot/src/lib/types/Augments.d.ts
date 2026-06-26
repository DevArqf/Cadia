import { ArrayString } from '@skyra/env-utilities';

declare module '@skyra/env-utilities' {
	interface Env {
		TOKEN: string;
		DATABASE_URL: string;
		MYSQL_URL: string;
		MYSQL_CONNECTION_LIMIT: string;

		BOT_OWNERS: ArrayString;
		DEVELOPERS: ArrayString;
	}
}

declare module '@sapphire/framework' {
	interface Preconditions {
		GuildOnly: never;
		DevOnly: never;
		BotOwner: never;
		Everyone: never;
		Moderator: never;
		Administrator: never;
		Staff: never;
		ServerOwner: never;
	}
}
