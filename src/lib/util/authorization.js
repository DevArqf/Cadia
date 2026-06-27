function configuredUserIds(value) {
	return String(value || '')
		.split(/\s+/)
		.filter(Boolean);
}

function isDeveloper(userId, value = process.env.DEVELOPERS) {
	return configuredUserIds(value).includes(String(userId));
}

module.exports = {
	configuredUserIds,
	isDeveloper
};
