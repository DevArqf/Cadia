module.exports = {
	apps: [
		{
			name: 'cadia',
			script: 'src/index.js',
			instances: process.env.PM2_INSTANCES || 1,
			exec_mode: 'cluster',
			wait_ready: false,
			kill_timeout: 10_000,
			restart_delay: 1_000,
			max_memory_restart: process.env.PM2_MAX_MEMORY || '768M',
			env: {
				NODE_ENV: 'production'
			}
		},
		{
			name: 'cadia-dashboard',
			script: 'dashboard/server.js',
			instances: process.env.DASHBOARD_PM2_INSTANCES || 1,
			exec_mode: 'cluster',
			wait_ready: false,
			kill_timeout: 10_000,
			restart_delay: 1_000,
			max_memory_restart: process.env.DASHBOARD_PM2_MAX_MEMORY || '512M',
			env: {
				NODE_ENV: 'production',
				PORT: process.env.DASHBOARD_PORT || 3000
			}
		}
	]
};
