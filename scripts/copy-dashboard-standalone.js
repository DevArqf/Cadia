const fs = require('node:fs');
const path = require('node:path');

const dashboardRoot = path.resolve(__dirname, '..', 'apps', 'dashboard');
const standaloneRoot = path.join(dashboardRoot, '.next', 'standalone');

copyDirectory(path.join(dashboardRoot, '.next', 'static'), path.join(standaloneRoot, '.next', 'static'));
copyDirectory(path.join(dashboardRoot, 'public'), path.join(standaloneRoot, 'public'));

function copyDirectory(source, destination) {
	if (!fs.existsSync(source)) return;
	fs.mkdirSync(path.dirname(destination), { recursive: true });
	fs.cpSync(source, destination, { recursive: true, force: true });
}
