const { spawn } = require('child_process');

let args = process.argv.slice(2);
// Remove unsupported arguments injected by the platform
let filteredArgs = [];
let i = 0;
while (i < args.length) {
    if (args[i] === '--host') {
        i += 2;
    } else if (args[i].startsWith('--host=')) {
        i += 1;
    } else if (args[i] === '--port') {
        i += 2;
    } else if (args[i].startsWith('--port=')) {
        i += 1;
    } else {
        filteredArgs.push(args[i]);
        i += 1;
    }
}

filteredArgs.push('--port', '3000', '--ip', '0.0.0.0', '--local');

console.log('Running wrangler dev src/index.ts ' + filteredArgs.join(' '));
const child = spawn('./node_modules/.bin/wrangler', ['dev', 'src/index.ts', ...filteredArgs], { stdio: 'inherit' });

child.on('exit', (code) => {
    process.exit(code || 0);
});
