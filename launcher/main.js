const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess = null;
let ngrokProcess = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 750,
        frame: false,
        transparent: false, // 투명도를 제거하여 창 크기 조절 및 최대화 안정성 확보
        backgroundColor: '#0f172a',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // mainWindow.webContents.openDevTools(); // 디버깅 시 사용

    // 우측 마우스 클릭 시 복사 메뉴 (기본 기능 활성화)
    const { Menu, MenuItem } = require('electron');
    mainWindow.webContents.on('context-menu', (e, props) => {
        const menu = new Menu();
        if (props.selectionText && props.selectionText.trim() !== '') {
            menu.append(new MenuItem({ label: '복사', role: 'copy' }));
            menu.popup(mainWindow);
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    stopAllProcesses();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 앱이 종료되기 직전에 프로세스 정리 보장
app.on('before-quit', () => {
    stopAllProcesses();
});

function stopAllProcesses() {
    if (serverProcess) {
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
        } else {
            serverProcess.kill();
        }
        serverProcess = null;
    }
    if (ngrokProcess) {
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', ngrokProcess.pid, '/f', '/t']);
        } else {
            ngrokProcess.kill();
        }
        ngrokProcess = null;
    }
}

let isLoggingEnabled = false;
const LAUNCHER_LOG_FILE = path.join(__dirname, '..', 'launcher_debug.log');

function writeLogToFile(msg) {
    if (!isLoggingEnabled) return;
    const timestamp = new Date().toLocaleString();
    try {
        fs.appendFileSync(LAUNCHER_LOG_FILE, `[${timestamp}] ${msg}\n`);
    } catch (e) {
        console.error('Failed to write to log file:', e);
    }
}

// IPC 핸들러: 서버 시작
ipcMain.on('start-server', (event, { port, saveLog }) => {
    if (serverProcess) return;

    isLoggingEnabled = saveLog;
    writeLogToFile('--- SERVER START ATTEMPT ---');

    const serverPath = path.join(__dirname, '..', 'server.js');
    serverProcess = spawn('node', [serverPath], {
        env: { ...process.env, PORT: port, SAVE_LOG: 'false' }, // 서버 자체 로깅은 끔 (메인에서 통합 관리)
        cwd: path.join(__dirname, '..')
    });

    serverProcess.stdout.on('data', (data) => {
        const str = data.toString();
        event.reply('server-log', str);
        writeLogToFile(`[SERVER] ${str.trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
        const str = data.toString();
        event.reply('server-log', `ERROR: ${str}`);
        writeLogToFile(`[SERVER-ERROR] ${str.trim()}`);
    });

    serverProcess.on('close', (code) => {
        event.reply('server-stopped', code);
        writeLogToFile(`--- SERVER STOPPED (Code: ${code}) ---`);
        serverProcess = null;
    });
});

// IPC 핸들러: 서버 중지
ipcMain.on('stop-server', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

// IPC 핸들러: ngrok 시작
ipcMain.on('start-ngrok', (event, { url, port }) => {
    if (ngrokProcess) return;

    writeLogToFile('--- NGROK START ATTEMPT ---');

    const ngrokPath = path.join(__dirname, '..', 'ngrok.exe');
    ngrokProcess = spawn(ngrokPath, ['http', '--url=' + url, port], {
        cwd: path.join(__dirname, '..')
    });

    ngrokProcess.stdout.on('data', (data) => {
        const str = data.toString();
        event.reply('ngrok-log', str);
        writeLogToFile(`[NGROK] ${str.trim()}`);
    });

    ngrokProcess.stderr.on('data', (data) => {
        const str = data.toString();
        event.reply('ngrok-log', `ERROR: ${str}`);
        writeLogToFile(`[NGROK-ERROR] ${str.trim()}`);
    });

    ngrokProcess.on('close', (code) => {
        event.reply('ngrok-stopped', code);
        writeLogToFile(`--- NGROK STOPPED (Code: ${code}) ---`);
        ngrokProcess = null;
    });
});

// 시스템 로그 저장을 위한 추가 IPC
ipcMain.on('save-system-log', (event, msg) => {
    writeLogToFile(`[LAUNCHER] ${msg}`);
});

// 로그 저장 설정을 실시간으로 반영하기 위한 IPC
ipcMain.on('set-logging', (event, enabled) => {
    isLoggingEnabled = enabled;
    writeLogToFile(`--- LOGGING ${enabled ? 'ENABLED' : 'DISABLED'} BY USER ---`);
});

// IPC 핸들러: ngrok 중지
ipcMain.on('stop-ngrok', () => {
    if (ngrokProcess) {
        ngrokProcess.kill();
    }
});

// 창 제어
ipcMain.on('close-app', () => {
    app.quit();
});

ipcMain.on('minimize-app', () => {
    mainWindow.minimize();
});

ipcMain.on('maximize-app', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

// 창 상태 변경 감지하여 UI 업데이트
app.on('browser-window-maximize', (e, window) => {
    window.webContents.send('window-maximized', true);
});

app.on('browser-window-unmaximize', (e, window) => {
    window.webContents.send('window-maximized', false);
});
