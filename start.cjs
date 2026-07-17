const { spawn } = require('child_process');

let args = process.argv.slice(2);
// Remove unsupported arguments injected by the platform
let filteredArgs = [];
let i = 0;
while (i < args.length) {
    if (args[i].startsWith('--host')) {
        if (!args[i].includes('=')) i++;
    } else if (args[i].startsWith('--port')) {
        if (!args[i].includes('=')) i++;
    } else {
        filteredArgs.push(args[i]);
    }
    i++;
}

filteredArgs.push('--port', '3000', '--ip', '0.0.0.0', '--local');

console.log('Running wrangler dev worker.js ' + filteredArgs.join(' '));
const child = spawn('./node_modules/.bin/wrangler', ['dev', 'worker.js', ...filteredArgs], { stdio: 'inherit' });

child.on('exit', (code) => {
    process.exit(code || 0);
});
