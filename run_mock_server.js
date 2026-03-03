const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const app = express();
const PORT = 3002;

app.get('/api/fred', (req, res) => {
    const { series_id: seriesId, period } = req.query;
    console.log(`[Mock] Requested: ${seriesId}, Period: ${period}`);

    const command = `python fred_api.py "${seriesId}" "${period}"`;
    console.log(`[Mock] Executing: ${command}`);

    exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Mock] ❌ Exec error: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message, stdout, stderr });
        }
        try {
            const jsonStart = stdout.indexOf('{');
            const jsonEnd = stdout.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1) {
                console.error(`[Mock] ❌ No JSON in: ${stdout}`);
                throw new Error('No JSON');
            }
            const jsonString = stdout.substring(jsonStart, jsonEnd + 1);
            const result = JSON.parse(jsonString);
            res.json(result);
        } catch (e) {
            console.error(`[Mock] ❌ Parse error: ${e.message}`);
            res.status(500).json({ success: false, error: e.message });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Mock server on http://localhost:${PORT}`);
});
