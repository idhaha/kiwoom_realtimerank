const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess = null;
let ngrokProcess = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        frame: false, // 커스텀 타이틀바 사용 예정
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, 'icon.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.webContents.openDevTools(); // 디버깅 시 사용

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

// IPC 핸들러: 서버 시작
ipcMain.on('start-server', (event, port) => {
    if (serverProcess) return;

    const serverPath = path.join(__dirname, '..', 'server.js');
    serverProcess = spawn('node', [serverPath], {
        env: { ...process.env, PORT: port },
        cwd: path.join(__dirname, '..')
    });

    serverProcess.stdout.on('data', (data) => {
        event.reply('server-log', data.toString());
    });

    serverProcess.stderr.on('data', (data) => {
        event.reply('server-log', `ERROR: ${data.toString()}`);
    });

    serverProcess.on('close', (code) => {
        event.reply('server-stopped', code);
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

    const ngrokPath = path.join(__dirname, '..', 'ngrok.exe');
    ngrokProcess = spawn(ngrokPath, ['http', '--url=' + url, port], {
        cwd: path.join(__dirname, '..')
    });

    ngrokProcess.stdout.on('data', (data) => {
        event.reply('ngrok-log', data.toString());
    });

    ngrokProcess.stderr.on('data', (data) => {
        event.reply('ngrok-log', `ERROR: ${data.toString()}`);
    });

    ngrokProcess.on('close', (code) => {
        event.reply('ngrok-stopped', code);
        ngrokProcess = null;
    });
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
