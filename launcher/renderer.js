const { ipcRenderer } = require('electron');

const portInput = document.getElementById('port-input');
const ngrokInput = document.getElementById('ngrok-input');
const serverBtn = document.getElementById('server-btn');
const ngrokBtn = document.getElementById('ngrok-btn');
const consoleOutput = document.getElementById('console-output');
const serverStatus = document.getElementById('server-status');
const ngrokStatus = document.getElementById('ngrok-status');

const minBtn = document.getElementById('min-btn');
const closeBtn = document.getElementById('close-btn');

let isServerRunning = false;
let isNgrokRunning = false;

// 초기 안내 로그 추가
window.addEventListener('DOMContentLoaded', () => {
    log('시스템 초기화 중...', 'info');
    log('키움 주식 데이터 서버 준비 완료.', 'success');
    log('ngrok 터널링 엔진 대기 중.', 'info');
    log('설정을 확인하고 버튼을 눌러주세요.');
});

// 초기 설정 로드 (localStorage)
portInput.value = localStorage.getItem('last-port') || '3001';
ngrokInput.value = localStorage.getItem('last-ngrok') || '';

// 설정 저장 함수
function saveConfig() {
    localStorage.setItem('last-port', portInput.value);
    localStorage.setItem('last-ngrok', ngrokInput.value);
}

// 로그 출력 함수
function log(msg, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const color = type === 'error' ? '#ef4444' : (type === 'success' ? '#22c55e' : '#a7f3d0');

    const span = document.createElement('span');
    span.style.color = color;
    span.textContent = `[${timestamp}] ${msg}\n`;
    consoleOutput.appendChild(span);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// 서버 제어
serverBtn.addEventListener('click', () => {
    if (!isServerRunning) {
        saveConfig();
        ipcRenderer.send('start-server', portInput.value);
        serverBtn.textContent = '1. 서버 중지';
        serverBtn.classList.add('active');
        serverStatus.classList.add('online');
        isServerRunning = true;
        log(`서버를 포트 ${portInput.value}에서 시작합니다...`, 'info');
    } else {
        ipcRenderer.send('stop-server');
    }
});

ipcRenderer.on('server-log', (event, data) => {
    log(data.trim());
});

ipcRenderer.on('server-stopped', (event, code) => {
    serverBtn.textContent = '1. 서버 시작';
    serverBtn.classList.remove('active');
    serverStatus.classList.remove('online');
    isServerRunning = false;
    log(`서버가 종료되었습니다. (코드: ${code})`, 'error');
});

// Ngrok 제어
ngrokBtn.addEventListener('click', () => {
    if (!isNgrokRunning) {
        if (!ngrokInput.value) {
            log('ngrok 고정 도메인을 입력해주세요!', 'error');
            return;
        }
        saveConfig();
        ipcRenderer.send('start-ngrok', {
            url: ngrokInput.value,
            port: portInput.value
        });
        ngrokBtn.textContent = '2. 터널 해제';
        ngrokBtn.classList.add('active');
        ngrokStatus.classList.add('online');
        isNgrokRunning = true;
        log(`ngrok 터널을 연결합니다: ${ngrokInput.value}`, 'info');
    } else {
        ipcRenderer.send('stop-ngrok');
    }
});

ipcRenderer.on('ngrok-log', (event, data) => {
    log(data.trim());
});

ipcRenderer.on('ngrok-stopped', (event, code) => {
    ngrokBtn.textContent = '2. 터널 연결';
    ngrokBtn.classList.remove('active');
    ngrokStatus.classList.remove('online');
    isNgrokRunning = false;
    log(`ngrok 터널이 해제되었습니다. (코드: ${code})`, 'error');
});

// 창 제어 버튼
minBtn.addEventListener('click', () => {
    ipcRenderer.send('minimize-app');
});

closeBtn.addEventListener('click', () => {
    ipcRenderer.send('close-app');
});
