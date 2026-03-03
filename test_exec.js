const { exec } = require('child_process');

const seriesId = 'DGS10';
const period = '10년';
const command = `python fred_api.py "${seriesId}" "${period}"`;

console.log(`Executing: ${command}`);
exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
        console.error('Exec error:', error.message);
        console.error('Stderr:', stderr);
        process.exit(1);
    }
    console.log('Stdout:', stdout);
    console.log('Stderr:', stderr);
});
