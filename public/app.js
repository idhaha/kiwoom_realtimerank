window.onerror = function (msg, url, line, col, error) {
    alert("⚠️ 자바스크립트 에러 발생:\n" + msg + "\n위치: " + line + ":" + col);
    return false;
};

const API_URL = '/api/stock';

// --- Tab & State Constants ---
const STORAGE_KEY = 'MultiChart_State_v1';
const PERM_TAB_ID = 'tab_rank';
const ADR_TAB_ID = 'tab_adr';
const MEMO_TAB_ID = 'tab_memo';
const EARNINGS_TAB_ID = 'tab_earnings';
let tabData = {};
let targetTabBtn = null;
let isInitializing = false; // Flag to prevent auto-save during startup

/**
 * ===== GOOGLE AUTHENTICATION & CALENDAR API =====
 */
const GOOGLE_CLIENT_ID = "218429663028-l66pfc3i804uec317arj717r1hrf519u.apps.googleusercontent.com";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
let tokenClient;
let accessToken = null;
let calendar = null;

window.handleCredentialResponse = function (response) {
    const payload = parseJwt(response.credential);
    console.log("🔓 Login Successful:", payload.email);

    localStorage.setItem('user_session', JSON.stringify({
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 Hours
    }));

    unlockApp();
    initTokenClient(); // Initialize token client for API access
};

function initTokenClient() {
    if (typeof google === 'undefined') return;
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: CALENDAR_SCOPE,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                accessToken = tokenResponse.access_token;
                console.log("🎟️ Calendar Access Token Acquired");
                if (calendar) calendar.refetchEvents();
            }
        },
    });
}

function requestCalendarAccess(callback) {
    if (accessToken) {
        if (callback) callback();
        return;
    }
    if (!tokenClient) initTokenClient();
    tokenClient.callback = (resp) => {
        if (resp.access_token) {
            accessToken = resp.access_token;
            if (callback) callback();
        }
    };
    tokenClient.requestAccessToken({ prompt: 'consent' });
}

function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

function unlockApp() {
    const loginOverlay = document.getElementById('loginOverlay');
    const tabContainer = document.getElementById('tabContainer');
    const tabContents = document.getElementById('tabContents');

    if (loginOverlay) loginOverlay.style.display = 'none';
    if (tabContainer) tabContainer.style.display = 'flex';
    if (tabContents) tabContents.style.display = 'block';
    console.log("🚀 App Unlocked & Ready");
}

function checkLoginSession() {
    const session = localStorage.getItem('user_session');
    if (session) {
        try {
            const sessionData = JSON.parse(session);
            if (Date.now() < sessionData.expiry) {
                unlockApp();
                initTokenClient();
                return true;
            }
        } catch (e) {
            console.error("Session parse error", e);
        }
    }
    return false;
}

// Check session immediately
checkLoginSession();

/**
 * ===== FULLCALENDAR INITIALIZATION =====
 */
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || calendar) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        themeSystem: 'standard',
        height: '100%',
        editable: true,
        selectable: true,
        events: fetchCalendarEvents,
        dateClick: function (info) {
            openEventModal(info.dateStr);
        },
        eventClick: function (info) {
            if (confirm(`일정: ${info.event.title}\n상세 페이지로 이동하시겠습니까?`)) {
                window.open(info.event.url || 'https://calendar.google.com/calendar/r', '_blank');
            }
            info.jsEvent.preventDefault();
        }
    });

    calendar.render();
}

async function fetchCalendarEvents(fetchInfo, successCallback, failureCallback) {
    if (!accessToken) {
        successCallback([]); // Return empty if no token yet
        return;
    }

    try {
        const start = fetchInfo.start.toISOString();
        const end = fetchInfo.end.toISOString();
        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (response.status === 401) {
            accessToken = null; // Token expired
            requestCalendarAccess(() => calendar.refetchEvents());
            return;
        }

        const data = await response.json();
        const events = data.items.map(item => ({
            id: item.id,
            title: item.summary,
            start: item.start.dateTime || item.start.date,
            end: item.end.dateTime || item.end.date,
            url: item.htmlLink,
            allDay: !item.start.dateTime
        }));
        successCallback(events);
    } catch (error) {
        console.error("❌ Calendar fetch error:", error);
        failureCallback(error);
    }
}

/**
 * ===== EVENT MODAL LOGIC =====
 */
function openEventModal(dateStr) {
    const modal = document.getElementById('eventModal');
    const startInput = document.getElementById('eventStartDate');
    const titleInput = document.getElementById('eventTitle');

    if (!modal || !startInput) return;

    titleInput.value = '';
    startInput.value = dateStr;
    document.getElementById('eventStartTime').value = '09:00';
    document.getElementById('eventAllDay').checked = false;
    document.getElementById('endTimeGroup').style.display = 'none';
    document.getElementById('eventRecurrence').value = '';

    modal.style.display = 'flex';
}

function closeEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) modal.style.display = 'none';
}

async function saveGoogleEvent() {
    const title = document.getElementById('eventTitle').value;
    const startDate = document.getElementById('eventStartDate').value;
    const startTime = document.getElementById('eventStartTime').value;
    const isAllDay = document.getElementById('eventAllDay').checked;
    const recurrence = document.getElementById('eventRecurrence').value;

    if (!title) {
        alert("일정 제목을 입력해주세요.");
        return;
    }

    if (!accessToken) {
        requestCalendarAccess(saveGoogleEvent);
        return;
    }

    const event = {
        summary: title,
        start: isAllDay ? { date: startDate } : { dateTime: `${startDate}T${startTime}:00`, timeZone: 'Asia/Seoul' },
        end: isAllDay ? { date: startDate } : { dateTime: `${startDate}T${parseInt(startTime.split(':')[0]) + 1}:00:00`.replace(/:(\d):/, ':0$1:'), timeZone: 'Asia/Seoul' }
    };

    // Quick end time fix: +1 hour
    if (!isAllDay) {
        const [h, m] = startTime.split(':').map(Number);
        const endH = (h + 1).toString().padStart(2, '0');
        event.end.dateTime = `${startDate}T${endH}:${m.toString().padStart(2, '0')}:00`;
    }

    if (recurrence) {
        if (recurrence === 'WEEKLY') {
            // Get day of week for RRULE (e.g., TU for Tuesday)
            const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
            const d = new Date(startDate).getDay();
            event.recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${days[d]}`];
        } else {
            event.recurrence = [`RRULE:FREQ=${recurrence}`];
        }
    }

    try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(event)
        });

        if (response.ok) {
            console.log("✅ Event saved successfully");
            closeEventModal();
            if (calendar) calendar.refetchEvents();
        } else {
            const err = await response.json();
            console.error("❌ Save error:", err);
            alert("일정 저장에 실패했습니다.");
        }
    } catch (error) {
        console.error("❌ Save error:", error);
    }
}

// DOM Elements

const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const dataContainer = document.getElementById('dataContainer');
const tableBody = document.getElementById('tableBody');
const lastUpdate = document.getElementById('lastUpdate');
const statusText = document.getElementById('statusText');
const refreshIntervalSelect = document.getElementById('refreshInterval');
const manualRefreshBtn = document.getElementById('manualRefresh');
const globalRefreshBtn = document.getElementById('globalRefreshBtn');

const transactionBody = document.getElementById('transactionBody');
const mrktTpSelect = document.getElementById('mrktTp');
const stexTpSelect = document.getElementById('stexTp');

// --- Tab DOM Elements ---
const tabContainer = document.getElementById("tabContainer");
const tabContents = document.getElementById("tabContents");
const addTabBtn = document.getElementById("addTabBtn");
const captureBtn = document.getElementById("captureBtn");
const contextMenu = document.getElementById("contextMenu");
const addTabMenu = document.getElementById("addTabMenu");

let currentConfigTabId = null; // Track which tab is being configured

let autoRefreshInterval = null;
let adrAutoRefreshInterval = null;
// Default to '2' (10 minutes) as requested
let lastSavedSettings = { rankInterval: '2', adrInterval: '2' };

/**
 * 상태 업데이트
 */
function updateStatus(status, message, data = {}) {
    statusText.textContent = message;
    if (data.start_time) {
        statusText.textContent += ` (Srv Start: ${data.start_time})`;
    }
}

/**
 * 시간 포맷팅
 */
function formatTime(date) {
    if (!date) return '-';
    const d = new Date(date);
    const dateStr = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    return `${dateStr} ${timeStr}`;
}

/**
 * 숫자 포맷팅 (천 단위 콤마)
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 등락률 포맷팅
 */
function formatChangeRate(rate) {
    const numRate = parseFloat(rate);
    if (isNaN(numRate)) return '-';

    const sign = numRate > 0 ? '+' : '';
    return `${sign}${numRate.toFixed(2)}%`;
}

/**
 * 등락률에 따른 CSS 클래스 반환
 */
function getPriceClass(rate) {
    const numRate = parseFloat(rate);
    if (isNaN(numRate) || numRate === 0) return 'price-neutral';
    return numRate > 0 ? 'price-up' : 'price-down';
}

/**
 * 테이블 렌더링
 */
function renderTable(data) {
    const stocks = Array.isArray(data) ? data : (data.data || data.output || []);

    if (!Array.isArray(stocks) || stocks.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    조회된 데이터가 없습니다.
                </td>
            </tr>
        `;
        return;
    }

    console.log("📊 렌더링할 종목 데이터 예시:", stocks[0]);

    tableBody.innerHTML = stocks.map((stock, index) => {
        const changeRate = stock.base_comp_chgr || '0';
        let trdeAmtRaw = stock.trde_amt ? String(stock.trde_amt).replace(/[+,-]/g, '') : '0';
        let trdeAmtNum = parseInt(trdeAmtRaw) || 0;
        const trdeAmtMillion = trdeAmtNum;

        const marketLabel = stock.mkt_type || '-';

        return `
            <tr class="fade-in">
                <td class="align-right">${stock.bigd_rank || (index + 1)}</td>
                <td class="market-type">${marketLabel}</td>
                <td>
                    ${stock.stk_nm || '-'}
                </td>
                <td class="align-right num-cell ${getPriceClass(changeRate)}">
                    ${formatChangeRate(changeRate)}
                </td>
                <td class="align-right num-cell">${formatNumber(trdeAmtMillion)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Transaction Rank 데이터 로드
 */
async function loadTransactionRank() {
    const mrktTp = mrktTpSelect.value;
    const stexTp = stexTpSelect.value;

    console.log(`fetching Transaction Rank (mrkt=${mrktTp}, stex=${stexTp})...`);

    try {
        const response = await fetch(`/api/transaction_rank?mrkt_tp=${mrktTp}&stex_tp=${stexTp}`);
        const result = await response.json();

        console.log("Transaction Rank Raw Result:", result);

        if (result.success) {
            const items = result.data || [];
            console.log("Transaction Items:", items.length);

            if (items.length === 0) {
                transactionBody.innerHTML = `<tr><td colspan="4" class="align-center">데이터 없음</td></tr>`;
                return;
            }

            transactionBody.innerHTML = items.map((stock, index) => {
                const changeRate = stock.fluc_rt || stock.base_comp_chgr || '0';
                const trdeAmtRaw = stock.trde_amt || stock.acml_tr_pbmn || '0';
                const trdeAmtNum = parseInt(String(trdeAmtRaw).replace(/[^0-9]/g, '')) || 0;
                const trdeAmtMillion = (trdeAmtNum > 100000000) ? Math.round(trdeAmtNum / 1000000) : trdeAmtNum;

                const marketLabel = stock.mkt_type || '-';

                return `
                    <tr class="fade-in">
                        <td class="align-right">${stock.rank || (index + 1)}</td>
                        <td class="market-type">${marketLabel}</td>
                        <td>${stock.stk_nm || stock.isu_nm || '-'}</td>
                        <td class="align-right num-cell ${getPriceClass(changeRate)}">
                            ${formatChangeRate(changeRate)}
                        </td>
                        <td class="align-right num-cell">${formatNumber(trdeAmtMillion)}</td>
                    </tr>
                `;
            }).join('');

        } else {
            console.error("Trans Rank Error:", result.error);
            transactionBody.innerHTML = `<tr><td colspan="4" class="align-center error">로드 실패: ${result.error}</td></tr>`;
        }
    } catch (e) {
        console.error("Trans Rank Fetch Fail:", e);
        transactionBody.innerHTML = `<tr><td colspan="4" class="align-center error">통신 오류</td></tr>`;
    }
}

/**
 * 데이터 로드
 */
async function loadData() {

    try {
        const activeTab = document.querySelector('.tab-content.active');
        const isRankActive = activeTab && activeTab.id === PERM_TAB_ID;

        if (errorMessage) errorMessage.style.display = 'none';
        updateStatus('loading', '데이터 로딩 중...');

        const selectedOption = refreshIntervalSelect.options[refreshIntervalSelect.selectedIndex];
        const qryTp = selectedOption.value;

        const response = await fetch(`${API_URL}?qry_tp=${qryTp}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            let errorMessageText = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorJson = await response.json();
                if (errorJson.error) {
                    errorMessageText += ` (${errorJson.error})`;
                    if (errorJson.details) {
                        errorMessageText += ` - Details: ${JSON.stringify(errorJson.details)}`;
                    }
                }
            } catch (e) {
            }
            throw new Error(errorMessageText);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || '알 수 없는 오류가 발생했습니다');
        }

        renderTable(result.data);

        dataContainer.style.display = 'block';
        lastUpdate.textContent = formatTime(new Date());
        updateStatus('success', '데이터 로딩 완료');

    } catch (error) {
        console.error('데이터 로딩 실패:', error);

        const activeTab = document.querySelector('.tab-content.active');
        const isRankActive = activeTab && activeTab.id === PERM_TAB_ID;

        if (isRankActive) {
            if (errorMessage) errorMessage.style.display = 'flex';
            if (errorText) errorText.textContent = error.message;
            updateStatus('error', '데이터 로딩 실패');
        } else {
            console.warn('[Rank] 백그라운드 갱신 실패 (UI 억제됨):', error.message);
        }
    } finally {
    }
}

function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }

    const selectedOption = refreshIntervalSelect.options[refreshIntervalSelect.selectedIndex];
    const intervalMs = parseInt(selectedOption.dataset.interval) || 30000;

    console.log(`[Rank] 🔄 자동 새로고침 시작 (간격: ${intervalMs}ms, qry_tp: ${selectedOption.value})`);

    autoRefreshInterval = setInterval(() => {
        const now = new Date().toLocaleTimeString();
        console.log(`[Rank] ⚡ 자동 새로고침 실행 (${now})`);
        loadData();
        loadTransactionRank();
    }, intervalMs);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

function startAdrAutoRefresh() {
    if (adrAutoRefreshInterval) {
        clearInterval(adrAutoRefreshInterval);
    }

    const select = document.getElementById('adrRefreshInterval');
    if (!select) return;

    const selectedOption = select.options[select.selectedIndex];
    const intervalMs = parseInt(selectedOption.dataset.interval) || 30000;

    console.log(`[ADR] 🔄 자동 새로고침 시작 (간격: ${intervalMs}ms)`);

    adrAutoRefreshInterval = setInterval(() => {
        const now = new Date().toLocaleTimeString();
        console.log(`[ADR] ⚡ 자동 새로고침 실행 (${now})`);
        updateAdrFromSource();
    }, intervalMs);
}

function stopAdrAutoRefresh() {
    if (adrAutoRefreshInterval) {
        clearInterval(adrAutoRefreshInterval);
        adrAutoRefreshInterval = null;
    }
}

refreshIntervalSelect.addEventListener('change', (e) => {
    console.log('[Rank] 새로고침 설정 변경');
    lastSavedSettings.rankInterval = e.target.value;
    loadData();
    startAutoRefresh();
    saveAppData();
});

manualRefreshBtn.addEventListener('click', () => {
    console.log('수동 새로고침 실행');
    loadData();
    loadTransactionRank();
});

if (globalRefreshBtn) {
    globalRefreshBtn.addEventListener('click', () => {
        refreshAllTabs();
    });
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
    saveAppData();
});

// ==========================================================
// Tab Management Logic
// ==========================================================

function ensurePermanentTabs() {
    // 1. Rank Tab (PERM_TAB_ID)
    if (!document.querySelector(`.tab-btn[data-tab="${PERM_TAB_ID}"]`)) {
        const btn = document.createElement('button');
        btn.className = 'tab-btn perm-tab';
        btn.dataset.tab = PERM_TAB_ID;
        btn.textContent = 'Rank';
        btn.draggable = false;
        btn.dataset.perm = 'true';
        btn.title = '고정 탭 (조회 순위)';

        if (tabContainer.firstChild) tabContainer.insertBefore(btn, tabContainer.firstChild);
        else tabContainer.appendChild(btn);
    }

    // 2. ADR Tab (ADR_TAB_ID)
    if (!document.querySelector(`.tab-btn[data-tab="${ADR_TAB_ID}"]`)) {
        const btn = document.createElement('button');
        btn.className = 'tab-btn perm-tab';
        btn.dataset.tab = ADR_TAB_ID;
        btn.textContent = 'ADR';
        btn.draggable = false;
        btn.dataset.perm = 'true';
        btn.title = '고정 탭 (ADR 차트)';

        const rankBtn = document.querySelector(`.tab-btn[data-tab="${PERM_TAB_ID}"]`);
        if (rankBtn && rankBtn.nextSibling) tabContainer.insertBefore(btn, rankBtn.nextSibling);
        else if (addTabBtn) tabContainer.insertBefore(btn, addTabBtn);
        else tabContainer.appendChild(btn);

        createTabContentElement(ADR_TAB_ID);
    }

    // 3. Memo Tab (MEMO_TAB_ID)
    if (!document.querySelector(`.tab-btn[data-tab="${MEMO_TAB_ID}"]`)) {
        const btn = document.createElement('button');
        btn.className = 'tab-btn perm-tab';
        btn.dataset.tab = MEMO_TAB_ID;
        btn.textContent = '📝 메모';
        btn.draggable = false;
        btn.dataset.perm = 'true';
        btn.title = '고정 탭 (메모)';
        btn.style.fontWeight = 'bold';

        const adrBtn = document.querySelector(`.tab-btn[data-tab="${ADR_TAB_ID}"]`);
        if (adrBtn && adrBtn.nextSibling) tabContainer.insertBefore(btn, adrBtn.nextSibling);
        else if (addTabBtn) tabContainer.insertBefore(btn, addTabBtn);
        else tabContainer.appendChild(btn);
    }

    // 4. Earnings Tab (EARNINGS_TAB_ID)
    if (!document.querySelector(`.tab-btn[data-tab="${EARNINGS_TAB_ID}"]`)) {
        const btn = document.createElement('button');
        btn.className = 'tab-btn perm-tab';
        btn.dataset.tab = EARNINGS_TAB_ID;
        btn.textContent = '실적';
        btn.draggable = false;
        btn.dataset.perm = 'true';
        btn.title = '고정 탭 (실적 발표 캘린더)';

        const memoBtn = document.querySelector(`.tab-btn[data-tab="${MEMO_TAB_ID}"]`);
        if (memoBtn && memoBtn.nextSibling) tabContainer.insertBefore(btn, memoBtn.nextSibling);
        else if (addTabBtn) tabContainer.insertBefore(btn, addTabBtn);
        else tabContainer.appendChild(btn);

        createTabContentElement(EARNINGS_TAB_ID);
    }
}

function saveAppData(overrideTabData = null) {
    // CRITICAL: Prevent saving if we are in the middle of initialization or if tabData is empty (safety)
    if (isInitializing) {
        console.log("⏳ [saveAppData] Skipped: System is still initializing.");
        return Promise.resolve(false);
    }

    const activeContent = document.querySelector('.tab-content.active');
    if (activeContent && activeContent.id !== PERM_TAB_ID && activeContent.id !== ADR_TAB_ID && activeContent.id !== EARNINGS_TAB_ID && activeContent.id !== MEMO_TAB_ID) {
        saveTabState(activeContent.id);
    }

    // Clear tabs array and rebuild from DOM to preserve order
    const capturedTabs = [];
    document.querySelectorAll('.tab-btn:not(.add-tab-btn)').forEach(btn => {
        capturedTabs.push({ id: btn.dataset.tab, name: btn.textContent });
    });

    // Fallback: If DOM missed some custom tabs, populate from tabData
    const sourceData = overrideTabData || tabData;

    Object.keys(sourceData).forEach(key => {
        const type = sourceData[key]?.type;
        const isDynamic = (type === 'overseas_custom' || type === 'exchange_rate');

        if (isDynamic && !capturedTabs.find(t => t.id === key)) {
            const btn = document.querySelector(`.tab-btn[data-tab="${key}"]`);
            const name = btn ? btn.textContent : (type === 'exchange_rate' ? "환율/금리(복구)" : "해외종목(복구)");
            capturedTabs.push({ id: key, name: name });
            console.warn("[saveAppData] Dynamic tab found in data but not in DOM list (Recovered):", key, name);
        }
    });

    if (capturedTabs.length === 0 && Object.keys(tabData).length > 0) {
        console.error("🛑 [saveAppData] Refused to save: DOM tabs are empty but data exists. Preventing data loss.");
        return Promise.resolve(false);
    }

    const activeTabId = activeContent ? activeContent.id : (capturedTabs.length > 0 ? capturedTabs[0].id : PERM_TAB_ID);

    // Capture Memo content if Quill is initialized
    let memoHtml = '';
    let memoDelta = null;
    if (quillEditor) {
        memoHtml = quillEditor.root.innerHTML;
        memoDelta = quillEditor.getContents();
    } else {
        // Fallback to localStorage if Quill not ready but we are saving
        memoHtml = localStorage.getItem('memoContent_html') || '';
        const savedDelta = localStorage.getItem('memoContent_delta');
        if (savedDelta) memoDelta = JSON.parse(savedDelta);
    }

    const storageData = {
        activeTabId: activeTabId,
        tabs: capturedTabs,
        contents: sourceData,
        rankInterval: refreshIntervalSelect.value,
        adrInterval: document.getElementById('adrRefreshInterval')?.value,
        memoHtml: memoHtml,
        memoDelta: memoDelta,
        updatedAt: Date.now() // Version control
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    console.log("💾 데이터 로컬 저장 완료. updatedAt:", new Date(storageData.updatedAt).toLocaleString());

    // Sync to server (Return promise)
    return syncSettingsToServer(storageData);
}

async function syncSettingsToServer(data) {
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status} ${response.statusText}`);
        }

        const resData = await response.json();
        if (resData.success) {
            console.log("☁️ 데이터 서버 동기화 완료");
            return true;
        } else {
            console.error("❌ 서버 동기화 실패 (Response false):", resData);
            alert("서버 저장 실패: " + (resData.error || "알 수 없는 오류"));
            return false;
        }
    } catch (e) {
        console.error("❌ 서버 동기화 실패:", e);
        alert("서버 저장 중 오류 발생: " + e.message);
        return false;
    }
}

function saveTabState(tabId) {
    const content = document.getElementById(tabId);
    if (!content || tabId === PERM_TAB_ID || tabId === ADR_TAB_ID || tabId === EARNINGS_TAB_ID || tabId === MEMO_TAB_ID) return;

    // Special handling for dynamic overseas/exchange tabs: they don't use standard grid saving
    const type = tabData[tabId]?.type;
    if (type === 'overseas_custom' || type === 'exchange_rate') return;

    const boxes = content.querySelectorAll('.chart-box');
    const state = [];
    boxes.forEach(box => {
        const input = box.querySelector('.chart-input');
        const mainIframe = box.querySelector('.iframe-main');
        const subIframe = box.querySelector('.iframe-sub');
        const isSubMode = subIframe ? (window.getComputedStyle(subIframe).display !== 'none') : false;

        let currentMainSrc = (mainIframe && mainIframe.src) ? mainIframe.src : '';
        if (currentMainSrc === 'about:blank' || currentMainSrc === window.location.href) currentMainSrc = '';

        state.push({
            symbol: (input && input.value) ? input.value.trim() : 'KRX:KOSPI',
            lastSymbol: box.dataset.lastSymbol,
            mode: isSubMode ? 'sub' : 'main',
            mainSrc: currentMainSrc,
            subSrc: (subIframe && subIframe.src) ? subIframe.src : ''
        });
    });
    tabData[tabId] = state;
}

function loadFromLocalStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const data = JSON.parse(raw);
        if (!data.tabs || data.tabs.length === 0) return null;
        return data;
    } catch (e) {
        console.error("로컬 스토리지 로딩 실패:", e);
        return null;
    }
}

function loadFromSyncData(data) {
    if (!data || !data.tabs || data.tabs.length === 0) return false;
    applyData(data);
    return true;
}

async function loadAppDataFromServer() {
    try {
        console.log("☁️ 서버에서 설정 불러오는 중...");
        const response = await fetch(`/api/settings?_t=${Date.now()}`);
        const resData = await response.json();

        if (resData.success && resData.data) {
            console.log("✅ 서버 설정 로드 성공 (updatedAt):", resData.data.updatedAt);
            return resData.data;
        }
        return null;
    } catch (e) {
        console.error("❌ 서버 설정 로드 실패:", e);
        return null;
    }
}

function applyData(data) {
    if (!data || !data.tabs) return;

    isInitializing = true; // Block auto-save during application
    try {
        ensurePermanentTabs(); // Always ensure permanent tabs first
        resetDynamicTabs();
        tabData = data.contents || {};

        data.tabs.forEach(t => {
            if (t.id === PERM_TAB_ID || t.id === ADR_TAB_ID || t.id === EARNINGS_TAB_ID || t.id === MEMO_TAB_ID) {
                const btn = document.querySelector(`.tab-btn[data-tab="${t.id}"]`);
                if (btn) btn.textContent = t.name;
                return;
            }
            createTabButtonElement(t.id, t.name);
            createTabContentElement(t.id);
        });

        if (data.rankInterval) {
            lastSavedSettings.rankInterval = data.rankInterval;
            refreshIntervalSelect.value = data.rankInterval;
        } else {
            // Enforce default 10 min if not saved
            refreshIntervalSelect.value = '2';
            lastSavedSettings.rankInterval = '2';
        }
        if (data.adrInterval) {
            lastSavedSettings.adrInterval = data.adrInterval;
        } else {
            lastSavedSettings.adrInterval = '2';
        }

        const targetId = (data.activeTabId && document.getElementById(data.activeTabId)) ? data.activeTabId : PERM_TAB_ID;
        activateTab(targetId);

        // Restore Memo content from server data
        if (data.memoHtml || data.memoDelta) {
            console.log("📝 [applyData] Restoring Memo from server data...");
            if (data.memoHtml) localStorage.setItem('memoContent_html', data.memoHtml);
            if (data.memoDelta) localStorage.setItem('memoContent_delta', typeof data.memoDelta === 'string' ? data.memoDelta : JSON.stringify(data.memoDelta));

            if (quillEditor) {
                if (data.memoDelta) {
                    quillEditor.setContents(data.memoDelta);
                } else if (data.memoHtml) {
                    quillEditor.root.innerHTML = data.memoHtml;
                }
            }
        }
    } finally {
        // Delay unblocking a bit to ensure all internal activateTab calls finished
        setTimeout(() => {
            isInitializing = false;
            console.log("🔓 [InitialLoad] System ready. Auto-save enabled.");
        }, 500);
    }
}

function resetDynamicTabs() {
    document.querySelectorAll('.tab-btn:not(.add-tab-btn):not([data-perm])').forEach(b => b.remove());
    document.querySelectorAll('.tab-content:not(#tab_rank):not(#tab_adr):not(#tab_earnings):not(#tab_memo)').forEach(c => c.remove());
}

function activateTab(tabId) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const content = document.getElementById(tabId);
    if (!btn || !content) return;

    // Background refresh allowed: Do NOT stop refreshes here

    document.querySelectorAll(".tab-content.active").forEach(tab => {
        if (tab.id !== tabId) {
            if (tab.id !== PERM_TAB_ID && tab.id !== ADR_TAB_ID && tab.id !== EARNINGS_TAB_ID && tab.id !== MEMO_TAB_ID) {
                saveTabState(tab.id);
                // tab.innerHTML = ''; // Removed to persist content and prevent reload
            }
            tab.classList.remove("active");
        }
    });

    document.querySelectorAll(".tab-btn.active").forEach(b => {
        if (b.dataset.tab !== tabId) b.classList.remove("active");
    });

    btn.classList.add("active");
    content.classList.add("active");

    // Initialize tab if empty, or just ensure intervals/listeners are active
    const wasEmpty = initializeTab(tabId);

    if (tabId === ADR_TAB_ID) {
        startAdrAutoRefresh();
    } else if (tabId === MEMO_TAB_ID) {
        // Initialize FullCalendar when memo tab is active
        setTimeout(initCalendar, 100);
    } else if (tabId === EARNINGS_TAB_ID || (tabData[tabId] && (tabData[tabId].type === 'overseas_custom' || tabData[tabId].type === 'exchange_rate'))) {
        if (!wasEmpty) {
            redrawTabCharts(tabId);
        }
    } else if (tabId !== PERM_TAB_ID && wasEmpty) {
        loadChartsSequentially(content);
    }
}

/**
 * 전 전용 탭들의 레이어 구성 및 이벤트 리스너 통합 초기화
 * @returns {boolean} true if the tab was newly initialized (rendered)
 */
function initializeTab(tabId) {
    const content = document.getElementById(tabId);
    if (!content) return false;

    const isInitialized = content.innerHTML.trim().length > 0;

    // 1. Render layout if empty
    if (!isInitialized) {
        console.log(`🏗️ [InitTab] Rendering initial layout for ${tabId}`);
        content.innerHTML = createChartGrid(tabId);
    }

    // 2. Attach specialized listeners (idempotent checks included)
    if (tabId === ADR_TAB_ID) {
        const adrSelect = document.getElementById('adrRefreshInterval');
        if (adrSelect && lastSavedSettings.adrInterval) {
            adrSelect.value = lastSavedSettings.adrInterval;
        }
    } else if (tabId === EARNINGS_TAB_ID) {
        const refreshBtn = document.getElementById(`refreshEarnings_${tabId}`);
        if (refreshBtn && !refreshBtn.hasAttribute('data-listener-attached')) {
            refreshBtn.addEventListener('click', () => refreshEarningsTab(tabId));
            refreshBtn.setAttribute('data-listener-attached', 'true');
        }
    } else if (tabData[tabId] && tabData[tabId].type === 'overseas_custom') {
        const prefix = `overseasCustom_${tabId}`;
        const refreshBtn = document.getElementById(`refreshOverlay_${tabId}`);
        if (refreshBtn && !refreshBtn.hasAttribute('data-listener-attached')) {
            refreshBtn.addEventListener('click', () => refreshOverseasCustomCharts(tabId));
            refreshBtn.setAttribute('data-listener-attached', 'true');
        }
        setupOverseasCursorSync();
        setupSectorGroupListeners(tabId);
    } else if (tabData[tabId] && tabData[tabId].type === 'exchange_rate') {
        const refreshBtn = document.getElementById(`refreshExchangeRate_${tabId}`);
        if (refreshBtn && !refreshBtn.hasAttribute('data-listener-attached')) {
            refreshBtn.addEventListener('click', () => refreshExchangeRateCharts(tabId));
            refreshBtn.setAttribute('data-listener-attached', 'true');
        }
        setupSectorGroupListeners(tabId);
    }

    // 3. Trigger initial load if it was empty
    if (!isInitialized) {
        if (tabId === ADR_TAB_ID) {
            setTimeout(() => updateAdrFromSource(), 100);
        } else if (tabData[tabId] && tabData[tabId].type === 'overseas_custom') {
            refreshOverseasCustomCharts(tabId);
        } else if (tabData[tabId] && tabData[tabId].type === 'exchange_rate') {
            refreshExchangeRateCharts(tabId);
        }
        return true;
    }

    return false;
}




function createTabButtonElement(id, name) {
    const btn = document.createElement("button");
    btn.className = "tab-btn";
    btn.dataset.tab = id;
    btn.textContent = name;
    btn.draggable = true;
    if (addTabBtn) tabContainer.insertBefore(btn, addTabBtn);
    else tabContainer.appendChild(btn);
    return btn;
}

function createTabContentElement(id) {
    if (document.getElementById(id)) return document.getElementById(id);
    const div = document.createElement("div");
    div.className = "tab-content";
    if (id === EARNINGS_TAB_ID) div.classList.add("full-tab");
    div.id = id;
    tabContents.appendChild(div);
    return div;
}

// --- Charting Logic ---

const commonStudies = [
    { "id": "MASimple@tv-basicstudies", "inputs": { "length": 5 } },
    { "id": "MASimple@tv-basicstudies", "inputs": { "length": 10 } },
    { "id": "MASimple@tv-basicstudies", "inputs": { "length": 20 } },
    { "id": "MASimple@tv-basicstudies", "inputs": { "length": 60 } },
    { "id": "MASimple@tv-basicstudies", "inputs": { "length": 120 } }
];

function getDirectTradingViewUrl(symbol) {
    const studiesStr = encodeURIComponent(JSON.stringify(commonStudies));
    return `https://s.tradingview.com/widgetembed/?symbol=${symbol}&interval=D&hidesidetoolbar=1&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=F1F3F6&studies=${studiesStr}&hideideas=1&theme=Light&style=1&timezone=Etc%2FUTC&withdateranges=1&showpopupbutton=1&locale=kr&hide_volume=1`;
}

function getTradingViewDataUrl(symbol) {
    const htmlContent = `
        <html>
        <head><style>body { margin: 0; padding: 0; overflow: hidden; width: 100%; height: 100%; }</style></head>
        <body>
            <div id="tradingview_widget" style="height:100%;width:100%"></div>
            <script type="text/javascript" src="https://s3.tradingview.com/tv.js"><\/script>
            <script type="text/javascript">
            new TradingView.widget({
                "autosize": true, "symbol": "${symbol}", "interval": "D", "timezone": "Etc/UTC", "theme": "light", "style": "1", "locale": "kr", "hide_volume": true, "container_id": "tradingview_widget",
                "studies": ${JSON.stringify(commonStudies)}
            });
            <\/script>
        </body></html>`;
    return "data:text/html;charset=utf-8," + encodeURIComponent(htmlContent);
}

function getInvestingUrl() {
    return "https://ssltvc.investing.com/?pair_ID=1&lang_ID=18&timezone_ID=8&width=100%&height=100%&interval=86400";
}


function createChartGrid(tabId) {
    // 1. ADR Tab
    if (tabId === ADR_TAB_ID) {
        return `
            <div class="container" style="height: 100%; display: flex; flex-direction: column;">
                <header>
                    <div class="header-single-line">
                        <h1><strong>ADR Chart</strong></h1>
                        <div class="header-controls">
                            <div class="refresh-control">
                                <select id="adrRefreshInterval" class="interval-select">
                                    <option value="5" data-interval="30000" selected>30초 간격</option>
                                    <option value="1" data-interval="60000">1분 간격</option>
                                    <option value="2" data-interval="600000">10분 간격</option>
                                    <option value="3" data-interval="3600000">1시간 간격</option>
                                    <option value="4" data-interval="30000">당일누적</option>
                                </select>
                            </div>
                            <button id="adrManualRefresh" class="btn-refresh adr-update-btn" aria-label="조회">조회</button>
                        </div>
                    </div>
                    <div class="status-info">
                        <span id="adrLastUpdate">-</span>
                        <span class="status-separator">|</span>
                        <span id="adrStatusText">대기 중...</span>
                    </div>
                </header>

                <div class="adr-chart-container" style="flex: 1; overflow: auto;">
                    <div class="adr-chart-wrapper">
                        <div class="adr-chart-header"><h3>K</h3></div>
                        <div class="adr-period-selector">
                            <button class="period-btn" data-period="6m">6m</button>
                            <button class="period-btn active" data-period="1y">1y</button>
                            <button class="period-btn" data-period="2y">2y</button>
                            <button class="period-btn" data-period="5y">5y</button>
                            <button class="period-btn" data-period="10y">10y</button>
                        </div>
                        <canvas id="adr_kospi" class="adr-canvas-new" width="500" height="300"></canvas>
                    </div>
                    <div class="adr-chart-wrapper">
                        <div class="adr-chart-header"><h3>Q</h3></div>
                        <div class="adr-period-selector">
                            <button class="period-btn" data-period="6m">6m</button>
                            <button class="period-btn active" data-period="1y">1y</button>
                            <button class="period-btn" data-period="2y">2y</button>
                            <button class="period-btn" data-period="5y">5y</button>
                            <button class="period-btn" data-period="10y">10y</button>
                        </div>
                        <canvas id="adr_kosdaq" class="adr-canvas-new" width="500" height="300"></canvas>
                    </div>
                </div>
            </div>`;
    }

    // 2. Earnings Tab
    if (tabId === EARNINGS_TAB_ID) {
        const perm = "clipboard-write; autoplay; fullscreen; encrypted-media; picture-in-picture; web-share";
        const sand = "allow-forms allow-scripts allow-same-origin allow-popups allow-modals allow-downloads allow-presentation";
        return `
            <div class="container overseas-container">
                <header>
                    <div class="header-single-line">
                        <h1><strong>실적 캘린더</strong></h1>
                        <div class="header-controls">
                            <button id="refreshEarnings_${tabId}" class="btn-refresh" aria-label="조회">조회</button>
                        </div>
                    </div>
                    <div class="status-info">
                        <span id="earningsLastUpdate_${tabId}">-</span>
                        <span class="status-separator">|</span>
                        <span id="earningsStatusText_${tabId}">대기 중...</span>
                    </div>
                </header>
                <div class="overseas-content-scroll" style="flex:1; overflow:hidden;">
                    <iframe id="iframeEarnings_${tabId}" src="https://kr.investing.com/earnings-calendar/" class="embedded-iframe" style="width:100%; height:100%; border:none;" allow="${perm}" sandbox="${sand}"></iframe>
                </div>
            </div>`;
    }

    // 3. Custom Overseas Tab
    if (tabData[tabId] && tabData[tabId].type === 'overseas_custom') {
        const prefix = `overseasCustom_${tabId}`;
        let titleText = '해외종목';
        const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (btn) titleText = btn.textContent;

        let charts = [];
        if (tabData[tabId].config) {
            charts = parseCustomCharts(tabData[tabId].config);
        }

        let gridContent = '';
        if (charts.length === 0) {
            gridContent = `<div class="empty-custom-charts" style="padding: 50px; text-align: center; color: var(--text-muted);"><p>등록된 차트가 없습니다. [종목입력] 버튼을 눌러 차트를 추가하세요.</p></div>`;
        } else {
            const sectorColors = tabData[tabId].sectorColors || {};
            let currentItemColor = '';
            let colorIdx = 0;

            const renderedItems = charts.map((item, idx) => {
                if (item.type === 'comment') return '';
                if (item.type === 'divider') {
                    currentItemColor = item.color || sectorColors[item.title] || SECTOR_COLORS[colorIdx++ % SECTOR_COLORS.length];
                    return `
                        <div class="finviz-divider" data-index="${idx}" style="--section-color: ${currentItemColor}">
                            <div class="divider-title"><span class="title-text">${item.title}</span></div>
                            <div class="divider-line"></div>
                            <div class="divider-controls">
                                <button class="btn-section-edit" title="섹션 편집">⚙️</button>
                                <div class="section-edit-popup">
                                    <div class="edit-group">
                                        <label>제목</label>
                                        <input type="text" class="edit-section-title" value="${item.title}">
                                    </div>
                                    <div class="edit-group">
                                        <label>색상</label>
                                        <div class="color-presets">
                                            ${SECTOR_COLORS.map(c => `<div class="color-swatch" style="background:${c}" data-color="${c}"></div>`).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                } else {
                    return renderCustomChartItem(item, currentItemColor, tabId, idx);
                }
            }).join('');
            gridContent = `<div class="finviz-container">${renderedItems}</div>`;
        }

        return `
            <div class="container overseas-container">
                <header>
                    <div class="header-single-line">
                        <h1><strong>${titleText}</strong></h1>
                        <div class="header-controls">
                            <button id="refreshOverlay_${tabId}" class="btn-refresh" aria-label="조회">조회</button>
                        </div>
                    </div>
                    <div class="status-info">
                        <span id="${prefix}LastUpdate">-</span>
                        <span class="status-separator">|</span>
                        <span id="${prefix}StatusText">대기 중...</span>
                        <button class="btn-config status-btn config-trigger" data-tab="${tabId}">종목입력</button>
                    </div>
                </header>
                <div class="overseas-content-scroll" style="flex:1; overflow:auto;">
                    ${gridContent}
                </div>
            </div>`;
    }

    // 4. Exchange Rate Tab
    if (tabData[tabId] && tabData[tabId].type === 'exchange_rate') {
        const prefix = `exchangeRate_${tabId}`;
        let titleText = '환율/금리';
        const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (btn) titleText = btn.textContent;

        let charts = [];
        if (tabData[tabId].config) {
            charts = parseCustomCharts(tabData[tabId].config);
        }

        let gridContent = '';
        if (charts.length === 0) {
            gridContent = `<div class="empty-custom-charts" style="padding: 50px; text-align: center; color: var(--text-muted);"><p>등록된 차트가 없습니다. [종목입력] 버튼을 눌러 TradingEconomics 차트를 추가하세요.</p></div>`;
        } else {
            const sectorColors = tabData[tabId].sectorColors || {};
            let currentItemColor = '';
            let colorIdx = 0;

            const renderedItems = charts.map((item, idx) => {
                if (item.type === 'comment') return '';
                if (item.type === 'divider') {
                    currentItemColor = item.color || sectorColors[item.title] || SECTOR_COLORS[colorIdx++ % SECTOR_COLORS.length];
                    return `
                        <div class="finviz-divider" data-index="${idx}" style="--section-color: ${currentItemColor}">
                            <div class="divider-title"><span class="title-text">${item.title}</span></div>
                            <div class="divider-line"></div>
                            <div class="divider-controls">
                                <button class="btn-section-edit" title="섹션 편집">⚙️</button>
                                <div class="section-edit-popup">
                                    <div class="edit-group">
                                        <label>제목</label>
                                        <input type="text" class="edit-section-title" value="${item.title}">
                                    </div>
                                    <div class="edit-group">
                                        <label>색상</label>
                                        <div class="color-presets">
                                            ${SECTOR_COLORS.map(c => `<div class="color-swatch" style="background:${c}" data-color="${c}"></div>`).join('')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                } else {
                    const isMulti = item.urls && item.urls.length > 1;
                    const isFred = item.urls && item.urls.some(url => url.toLowerCase().includes('fred('));
                    if (isMulti || isFred) return renderCustomChartItem(item, currentItemColor, tabId, idx);
                    else return renderTradingEconomicsChartItem(item, currentItemColor, tabId, idx);
                }
            }).join('');
            gridContent = `<div class="finviz-container te-container">${renderedItems}</div>`;
        }

        return `
            <div class="container overseas-container">
                <header>
                    <div class="header-single-line">
                        <h1><strong>${titleText}</strong></h1>
                        <div class="header-controls">
                            <button id="refreshExchangeRate_${tabId}" class="btn-refresh" aria-label="조회">조회</button>
                        </div>
                    </div>
                    <div class="status-info">
                        <span id="${prefix}LastUpdate">-</span>
                        <span class="status-separator">|</span>
                        <span id="${prefix}StatusText">대기 중...</span>
                        <button class="btn-config status-btn config-trigger" data-tab="${tabId}">종목입력</button>
                    </div>
                </header>
                <div class="overseas-content-scroll" style="flex:1; overflow:auto;">
                    ${gridContent}
                </div>
            </div>`;
    }

    // 5. Default Dynamic Charts Tab (Multiple Iframes)
    if (!tabData[tabId]) {
        const defaults = ["FX_IDC:USDKRW", "KRX:KOSPI", "KRX:KOSDAQ", "BINANCE:BTCUSDT", "SP:SPX", "KRX:005930"];
        tabData[tabId] = defaults.map(sym => ({ symbol: sym, lastSymbol: sym, mode: 'main', mainSrc: '', subSrc: '' }));
    }

    let states = tabData[tabId];
    let html = '<div class="chart-grid">';
    const perm = "clipboard-write; autoplay; fullscreen; encrypted-media; picture-in-picture; web-share";
    const sand = "allow-forms allow-scripts allow-same-origin allow-popups allow-modals allow-downloads allow-presentation";

    states.forEach((state, i) => {
        const symbol = state.symbol;
        const lastSymbol = state.lastSymbol || symbol;
        let mainSrcAttr = '', mainSrcVal = 'about:blank';
        if (state.mode === 'main') {
            if (!state.mainSrc || state.mainSrc === 'about:blank' || state.mainSrc.includes('tradingview.com') || state.mainSrc.startsWith('data:')) {
                mainSrcAttr = `data-src="${getDirectTradingViewUrl(lastSymbol)}"`;
            } else {
                mainSrcVal = state.mainSrc;
                mainSrcAttr = `data-src="${state.mainSrc}"`;
            }
        }
        const subSrc = state.subSrc || getInvestingUrl();
        const mainStyle = state.mode === 'sub' ? 'display:none;' : 'display:block;';
        const subStyle = state.mode === 'sub' ? 'display:block;' : 'display:none;';
        html += `
            <div class="chart-box" data-last-symbol="${lastSymbol}">
                <div class="chart-header">
                    <input type="text" class="chart-title-input" value="Chart ${i + 1}" readonly>
                    <input type="text" class="chart-input" value="${symbol}" placeholder="심볼 또는 URL">
                    <button class="chart-go-btn">이동</button>
                    <img src="https://www.google.com/s2/favicons?domain=tradingview.com&sz=32" class="chart-control-icon chart-t-btn" title="TradingView">
                    <img src="https://www.google.com/s2/favicons?domain=investing.com&sz=32" class="chart-control-icon chart-i-btn" title="Investing.com">
                    <img src="https://www.google.com/s2/favicons?domain=alphasquare.co.kr&sz=32" class="chart-control-icon chart-a-btn" title="AlphaSquare">
                </div>
                <iframe class="iframe-main" ${mainSrcAttr} src="${mainSrcVal}" style="${mainStyle}" allow="${perm}" sandbox="${sand}"></iframe>
                <iframe class="iframe-sub" src="${subSrc}" style="${subStyle}" allow="${perm}" sandbox="${sand}"></iframe>
            </div>`;
    });
    html += '</div>';
    return html;
}

function loadChartsSequentially(container) {
    if (container.id === ADR_TAB_ID) {
        const adrCache = (tabData[ADR_TAB_ID] && tabData[ADR_TAB_ID].adr) ? tabData[ADR_TAB_ID].adr : null;
        if (adrCache) {
            setTimeout(() => renderAdr(adrCache.kospi, adrCache.kosdaq), 100);
        } else {
            updateAdrFromSource();
        }
        return;
    }
    const iframes = container.querySelectorAll('iframe[data-src]');
    iframes.forEach((iframe, index) => {
        const chartBox = iframe.closest('.chart-box');
        setTimeout(() => {
            if (document.body.contains(iframe) && iframe.dataset.src) {
                iframe.src = iframe.dataset.src;
                iframe.removeAttribute('data-src');
            }
        }, index * 800);

        setTimeout(() => {
            if (!container.classList.contains('active')) return;
            if (document.body.contains(iframe) && iframe.src && iframe.src.includes('s.tradingview.com/widgetembed')) {
                iframe.src = getTradingViewDataUrl(chartBox.dataset.lastSymbol);
            }
        }, index * 800 + 10000);
    });
}

function loadChartFromInput(inputElement) {
    const chartBox = inputElement.closest('.chart-box');
    const iframeMain = chartBox.querySelector('.iframe-main');
    const iframeSub = chartBox.querySelector('.iframe-sub');
    let val = inputElement.value.trim();
    if (!val) return;
    iframeMain.style.display = 'block';
    iframeSub.style.display = 'none';
    if (val.startsWith('http://') || val.startsWith('https://')) {
        iframeMain.src = val;
    } else {
        val = val.toUpperCase();
        chartBox.dataset.lastSymbol = val;
        iframeMain.src = getDirectTradingViewUrl(val);
        setTimeout(() => {
            if (document.body.contains(iframeMain) && iframeMain.src.includes('s.tradingview.com/widgetembed'))
                iframeMain.src = getTradingViewDataUrl(val);
        }, 5000);
    }
    saveAppData();
}

// --- ADR Data & Drawing ---

async function updateAdrFromSource() {
    const url = `/api/adr?t=${Date.now()}`;
    console.log("🔄 [ADR] Step 1: Fetching from backend proxy:", url);
    const activeTab = document.querySelector('.tab-content.active');
    const isAdrActive = activeTab && activeTab.id === ADR_TAB_ID;



    const adrStatusTextElem = document.getElementById('adrStatusText');
    const adrLastUpdateElem = document.getElementById('adrLastUpdate');
    if (adrStatusTextElem) adrStatusTextElem.textContent = "데이터 로딩 중...";

    try {
        const res = await fetch(url, { cache: 'no-store' });
        console.log("📥 [ADR] Step 2: Response received, status:", res.status, res.ok);
        if (!res.ok) throw new Error('네트워크 오류: ' + res.status);

        const text = await res.text();
        console.log("📄 [ADR] Step 3: HTML received, length:", text.length);
        if (!text || text.length < 100) throw new Error('응답 데이터가 너무 짧거나 비어있습니다.');

        const parsed = parseAdrHtml(text);

        const kLen = parsed.kospi.length;
        const qLen = parsed.kosdaq.length;
        const kLastDate = kLen > 0 ? new Date(parsed.kospi[kLen - 1].date).toLocaleDateString() : 'N/A';
        const qLastDate = qLen > 0 ? new Date(parsed.kosdaq[qLen - 1].date).toLocaleDateString() : 'N/A';

        console.log(`✅ [ADR] Step 4: Parsed Data - KOSPI: ${kLen} (${kLastDate}), KOSDAQ: ${qLen} (${qLastDate})`);

        if (kLen !== qLen) {
            console.warn(`⚠️ [ADR] Data length mismatch! K:${kLen} vs Q:${qLen}`);
        }

        tabData[ADR_TAB_ID] = tabData[ADR_TAB_ID] || {};
        tabData[ADR_TAB_ID].adr = { kospi: parsed.kospi, kosdaq: parsed.kosdaq, updated: Date.now() };

        console.log("🎨 [ADR] Step 5: Calling renderAdr...");
        renderAdr(parsed.kospi, parsed.kosdaq);

        const last = new Date().toLocaleString();
        if (adrStatusTextElem) adrStatusTextElem.textContent = "업데이트 완료";
        if (adrLastUpdateElem) adrLastUpdateElem.textContent = last;

        saveAppData();

        if (parsed.kospi.length === 0 && parsed.kosdaq.length === 0) {
            console.warn("⚠️ [ADR] No data parsed!");
            if (isAdrActive) alert('데이터를 파싱할 수 없습니다. ADR 정보 사이트의 구조가 이전과 다를 수 있습니다.');
        }
    } catch (e) {
        console.error('❌ [ADR] 업데이트 실패:', e);
        if (adrStatusTextElem) adrStatusTextElem.textContent = "업데이트 실패";
        if (isAdrActive) alert('ADR 업데이트 실패: ' + e.message);
    } finally {
    }
}

function parseAdrHtml(html) {
    const out = { kospi: [], kosdaq: [] };
    try {
        const rawKospi = extractArrayFromHtml(html, "kospi_adr");
        const rawKosdaq = extractArrayFromHtml(html, "kosdaq_adr");

        out.kospi = rawKospi.filter(i => i && i[1] !== null).map(i => ({ date: i[0], value: i[1] }));
        out.kosdaq = rawKosdaq.filter(i => i && i[1] !== null).map(i => ({ date: i[0], value: i[1] }));

        if (out.kospi.length > 0) out.kospi.sort((a, b) => a.date - b.date);
        if (out.kosdaq.length > 0) out.kosdaq.sort((a, b) => a.date - b.date);

        console.log(`📊 [Parser] Extracted: KOSPI=${out.kospi.length}, KOSDAQ=${out.kosdaq.length}`);
    } catch (e) {
        console.error('❌ [Parser] Failed:', e);
    }
    return out;
}

function extractArrayFromHtml(html, name) {
    let startIdx = html.indexOf(`${name}=`);
    if (startIdx === -1) startIdx = html.indexOf(`${name} =`);
    if (startIdx === -1) return [];

    const contentStart = html.indexOf('[', startIdx);
    if (contentStart === -1) return [];

    let balance = 0;
    let endIdx = -1;
    for (let i = contentStart; i < html.length; i++) {
        if (html[i] === '[') balance++;
        else if (html[i] === ']') balance--;
        if (balance === 0) {
            endIdx = i;
            break;
        }
    }
    if (endIdx === -1) return [];

    const contentStr = html.substring(contentStart, endIdx + 1).trim();
    try {
        return JSON.parse(contentStr.replace(/,\s*\]$/, ']'));
    } catch (e) {
        console.warn(`[Parser] JSON.parse failed for ${name}, trying simple regex...`);
        // Fallback for extremely messy strings
        const items = [];
        const itemRegex = /\[\s*(\d+)\s*,\s*([-]?\d*\.?\d+)\s*\]/g;
        let m;
        while ((m = itemRegex.exec(contentStr)) !== null) {
            items.push([parseInt(m[1]), parseFloat(m[2])]);
        }
        return items;
    }
}

function renderAdr(kospi, kosdaq) {
    const c1 = document.getElementById('adr_kospi');
    const c2 = document.getElementById('adr_kosdaq');
    if (!c1 || !c2) return;

    // Common Range Calculator
    const getCombinedRange = (offset, count) => {
        const getVals = (arr) => {
            if (!arr || arr.length === 0) return [];
            const start = Math.max(0, Math.min(offset, arr.length - count));
            const end = Math.min(start + count, arr.length);
            return arr.slice(start, end).map(d => d.value);
        };
        const v1 = getVals(kospi);
        const v2 = getVals(kosdaq);
        const all = v1.concat(v2);
        if (all.length === 0) return null;
        return { min: Math.min(...all), max: Math.max(...all) };
    };

    const syncToKosdaq = (state) => {
        if (!c2.chartState) return;
        c2.chartState.visibleCount = state.visibleCount;
        c2.chartState.scrollOffset = state.scrollOffset;
        c2.chartState.hoveredIndex = state.hoveredIndex;
        requestAnimationFrame(() => drawLineChart(c2, kosdaq, 'Q ADR', state.visibleCount));
    };

    const syncToKospi = (state) => {
        if (!c1.chartState) return;
        c1.chartState.visibleCount = state.visibleCount;
        c1.chartState.scrollOffset = state.scrollOffset;
        c1.chartState.hoveredIndex = state.hoveredIndex;
        requestAnimationFrame(() => drawLineChart(c1, kospi, 'K ADR', state.visibleCount));
    };

    c1.rangeCalculator = getCombinedRange;
    c1.syncCallback = syncToKosdaq;
    c2.rangeCalculator = getCombinedRange;
    c2.syncCallback = syncToKospi;

    // Use current visibleCount if already set, else default to 2y (~500 days)
    const currentCount = c1.chartState ? c1.chartState.visibleCount : 500;
    drawLineChart(c1, kospi, 'K ADR', currentCount);
    drawLineChart(c2, kosdaq, 'Q ADR', currentCount);
}
// function drawLineChart(canvas, data, label, visibleCount = 60) {
function drawLineChart(canvas, data, label, visibleCount = 60, syncCallback = null) {
    if (!canvas) return;
    // Store sync callback for future use (e.g. by period buttons)
    if (syncCallback) canvas.syncCallback = syncCallback;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 400;
    const h = canvas.clientHeight || 300;

    const targetW = Math.floor(w * dpr);
    const targetH = Math.floor(h * dpr);

    // Optimize: Only resize if dimensions changed to avoid layout thrashing loop
    if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
        // Just clear if size hasn't changed (re-use buffer)
        // Ensure transform is correct just in case context was reset elsewhere (unlikely but safe)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Context settings
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (!data || data.length === 0) {
        ctx.fillStyle = "#6c757d";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("데이터 없음", w / 2, h / 2);
        return;
    }

    // Initialize interacting state if not present
    if (!canvas.chartState) {
        canvas.chartState = {
            scrollOffset: Math.max(0, data.length - visibleCount),
            isDragging: false,
            isScrollDragging: false,
            lastX: 0,
            hoveredIndex: null,
            visibleCount: visibleCount,
            pendingFrame: false // Thread locking for performance
        };
    } else {
        // Update visible count in state in case it changed via buttons
        canvas.chartState.visibleCount = visibleCount;
    }
    const state = canvas.chartState;
    // prevMaxOffset: The end position of the PREVIOUS data set
    const prevMaxOffset = Math.max(0, (canvas.lastDataLength || data.length) - visibleCount);
    // isAtEnd: Were we at the end of the previous data set?
    // Added !canvas.lastDataLength check to ensure we start at the end for fresh loads
    const isAtEnd = !canvas.lastDataLength || state.scrollOffset >= prevMaxOffset - 1.0;

    console.log(`📊 [Chart:${label}] Len: ${data.length}, Prev: ${canvas.lastDataLength}, Offset: ${state.scrollOffset.toFixed(2)}, isAtEnd: ${isAtEnd}`);

    // Adjust offset if visibleCount changes (e.g. period change)
    if (canvas.lastVisibleCount !== visibleCount) {
        state.scrollOffset = Math.max(0, data.length - visibleCount);
        canvas.lastVisibleCount = visibleCount;
    } else if (isAtEnd) {
        // Always follow to the end if we were at the end, 
        // especially if data length increased or if it's the first real data load
        const newMaxOffset = Math.max(0, data.length - visibleCount);
        if (state.scrollOffset !== newMaxOffset) {
            state.scrollOffset = newMaxOffset;
            console.log(`🚀 [Chart:${label}] Followed to end: ${state.scrollOffset}`);
        }
    }

    canvas.lastDataLength = data.length;

    // Ensure offset is valid
    state.scrollOffset = Math.max(0, Math.min(state.scrollOffset, data.length - visibleCount));

    const startIdx = Math.floor(state.scrollOffset);
    const endIdx = data.length; // Always slice to end, let visibleCount control the actual start if needed
    // But original logic used startIdx + visibleCount. Let's keep it consistent:
    const actualEndIdx = Math.min(startIdx + visibleCount, data.length);
    const visibleSeries = data.slice(startIdx, actualEndIdx);

    // Padding
    const padding = { top: 60, right: 100, bottom: 80, left: 60 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    // Y-Axis Range
    const values = visibleSeries.map(d => d.value);
    let minVal, maxVal;

    // Use shared calculator if available
    if (canvas.rangeCalculator) {
        const range = canvas.rangeCalculator(state.scrollOffset, visibleCount);
        if (range) {
            minVal = range.min;
            maxVal = range.max;
        }
    }

    // Fallback or default
    if (minVal === undefined) {
        if (values.length > 0) {
            minVal = Math.min(...values);
            maxVal = Math.max(...values);
        } else {
            minVal = 0; maxVal = 100;
        }
    }

    // Add small buffer if flat
    if (minVal === maxVal) { minVal -= 1; maxVal += 1; }

    const range = maxVal - minVal || 1;

    // --- Draw Areas (80-120) ---
    if (minVal < 120 && maxVal > 80) {
        const y80 = padding.top + plotH - ((Math.max(80, minVal) - minVal) / range) * plotH;
        const y120 = padding.top + plotH - ((Math.min(120, maxVal) - minVal) / range) * plotH;
        // Clamp Y coords to plot area
        const topY = Math.max(padding.top, y120);
        const bottomY = Math.min(padding.top + plotH, y80);

        if (bottomY > topY) {
            ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
            ctx.fillRect(padding.left, topY, plotW, bottomY - topY);
        }
    }

    // --- Reference Lines ---
    const drawRef = (val, color, dashed) => {
        if (val >= minVal && val <= maxVal) {
            const y = padding.top + plotH - ((val - minVal) / range) * plotH;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.setLineDash(dashed ? [5, 5] : []);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + plotW, y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = color;
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(val, padding.left - 5, y + 3);
        }
    };
    drawRef(80, '#ffa94d', true);
    drawRef(100, '#ff6b6b', true);
    drawRef(120, '#51cf66', true);

    // --- Data Line ---
    ctx.strokeStyle = '#339af0';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    // Store point coordinates for interaction
    const points = [];

    visibleSeries.forEach((d, i) => {
        const x = padding.left + (i / (visibleCount - 1)) * plotW;
        const y = padding.top + plotH - ((d.value - minVal) / range) * plotH;

        points.push({ x, y, data: d, globalIdx: startIdx + i });
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Last Point Dot
    if (points.length > 0) {
        const lastP = points[points.length - 1];
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(lastP.x, lastP.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // --- X-Axis Labels ---
    const tickCount = 6;
    for (let i = 0; i <= tickCount; i++) {
        const idx = Math.round((i / tickCount) * (visibleCount - 1));
        if (visibleSeries[idx]) {
            const dateObj = new Date(visibleSeries[idx].date);
            // Format: YY.MM (e.g. 24.12)
            const yy = String(dateObj.getFullYear()).slice(-2);
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const labelStr = `${yy}.${mm}`;

            const x = padding.left + (idx / (visibleCount - 1)) * plotW;
            ctx.fillStyle = '#666';
            ctx.textAlign = 'center';
            ctx.fillText(labelStr, x, h - padding.bottom + 20);

            // Grid line
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, h - padding.bottom);
            ctx.strokeStyle = '#e9ecef';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // Draw Hover Tooltip and Crosshair
    if (state.hoveredIndex !== null && state.hoveredIndex >= 0 && state.hoveredIndex < values.length) {
        const hoverVal = values[state.hoveredIndex];
        const hoverDate = visibleSeries[state.hoveredIndex].date;
        const hX = padding.left + (state.hoveredIndex / (visibleCount - 1)) * plotW;
        const hY = padding.top + plotH - (hoverVal - minVal) / range * plotH;

        // Crosshair
        ctx.beginPath();
        ctx.moveTo(hX, padding.top);
        ctx.lineTo(hX, h - padding.bottom);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // Dot
        ctx.beginPath();
        ctx.arc(hX, hY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff0000';
        ctx.fill();

        // Tooltip
        const dateStr = new Date(hoverDate).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' });
        const tooltipText = `${dateStr}  ${hoverVal.toFixed(2)}%`;

        ctx.font = '12px Arial'; // Use Arial for better consistency
        const textWidth = ctx.measureText(tooltipText).width + 24; // More padding

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; // Slightly more transparent
        let tX = hX + 10;
        if (tX + textWidth > w) tX = hX - textWidth - 10;

        const tH = 26; // Slightly taller
        const tY = hY - tH - 10; // Position above the dot

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(tX, tY, textWidth, tH, 4);
            ctx.fill();
        } else {
            ctx.fillRect(tX, tY, textWidth, tH);
        }

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tooltipText, tX + 12, tY + tH / 2);

        // Reset for other drawings
        ctx.textBaseline = 'alphabetic';
    }

    // --- SCROLLBAR ---
    // Draw horizontal scrollbar at bottom
    const totalDataCount = data.length;
    if (totalDataCount > 0) {
        const barHeight = 6;
        const barY = h - barHeight - 2;
        const barAreaX = 0;
        const barAreaW = w;

        // Background
        ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
        ctx.fillRect(barAreaX, barY, barAreaW, barHeight);

        // Thumb
        const viewRatio = Math.min(visibleCount / totalDataCount, 1);
        const scrollRatio = state.scrollOffset / totalDataCount;

        let thumbW = Math.max(20, viewRatio * barAreaW);
        let thumbX = scrollRatio * barAreaW;

        // Clamp
        thumbX = Math.max(0, Math.min(thumbX, barAreaW - thumbW));

        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.beginPath();
        ctx.roundRect(thumbX, barY, thumbW, barHeight, 3);
        ctx.fill();

        // Check if mouse is hovering scrollbar to highlight? (Optional implementation)
        // Store scrollbar rect for hit testing
        state.scrollbar = {
            x: thumbX,
            y: barY,
            width: thumbW,
            height: barHeight,
            areaWidth: barAreaW
        };
    } else {
        state.scrollbar = null;
    }

    // --- Current Value / Header ---
    // Determine the item to display in header
    // If we are essentially at the end, we want the absolute LATEST.
    const currentMaxOffset = Math.max(0, data.length - visibleCount);
    const isCurrentlyAtEnd = state.scrollOffset >= currentMaxOffset - 1.0;

    let latestItem;
    // If hovered, show hovered item in header too
    if (state.hoveredIndex !== null && visibleSeries[state.hoveredIndex]) {
        latestItem = visibleSeries[state.hoveredIndex];
    } else if (isCurrentlyAtEnd || visibleSeries.length === 0) {
        latestItem = data[data.length - 1];
    } else {
        latestItem = visibleSeries[visibleSeries.length - 1];
    }

    if (latestItem) {
        const lastDateStr = new Date(latestItem.date).toLocaleDateString();
        const absLatestDateStr = new Date(data[data.length - 1].date).toLocaleDateString();
        // Use a hidden log or low-priority log to avoid spamming too much during drag
        // Only log if it's a "snap" change or every few updates?
        if (state.scrollOffset % 10 === 0) {
            console.log(`🏷️ [Header:${label}] Showing: ${lastDateStr}, AbsLatest: ${absLatestDateStr}, isAtEnd: ${isCurrentlyAtEnd}`);
        }
    }

    // Or just show Latest always in the corner, and Tooltip shows hovered?
    // User requested "mouse overlap data". Tooltip covers this.

    // Header
    ctx.textAlign = 'left';
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`${label}`, padding.left, 30);

    // Latest Value
    let valColor = '#868e96';
    if (latestItem.value >= 120) valColor = '#51cf66';
    else if (latestItem.value >= 100) valColor = '#74c0fc';
    else if (latestItem.value >= 80) valColor = '#ffa94d';
    else valColor = '#ff6b6b';

    ctx.textAlign = 'right';
    ctx.fillStyle = valColor;
    ctx.font = 'bold 24px Arial';
    ctx.fillText(latestItem.value.toFixed(2), w - padding.right, 30);

    ctx.font = '12px Arial';
    ctx.fillStyle = '#666';
    const lastDate = new Date(latestItem.date);
    ctx.fillText(`${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`, w - padding.right, 45);

    // --- Event Handlers (One-time) ---
    if (!canvas.hasInteraction) {
        canvas.hasInteraction = true;

        // Mouse Move (Hover + Drag)
        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            // Store raw event data for the RAF loop
            canvas.chartState.lastEvent = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                rect: rect
            };

            if (canvas.chartState.pendingFrame) return;

            canvas.chartState.pendingFrame = true;
            requestAnimationFrame(() => {
                // Read LATEST state from shared variable
                const lastEv = canvas.chartState.lastEvent;
                if (!lastEv) {
                    canvas.chartState.pendingFrame = false;
                    return;
                }

                const x = lastEv.x;
                const rect = lastEv.rect;
                const currentVisibleCount = canvas.chartState.visibleCount;

                if (canvas.chartState.isScrollDragging) {
                    // --- Scrollbar Dragging ---
                    const dx = x - canvas.chartState.lastX;
                    canvas.chartState.lastX = x; // update for next delta

                    const totalDataCount = data.length;
                    const barAreaW = canvas.chartState.scrollbar ? canvas.chartState.scrollbar.areaWidth : w;

                    const scrollRatioChange = dx / barAreaW;
                    const offsetChange = scrollRatioChange * totalDataCount;

                    canvas.chartState.scrollOffset += offsetChange;
                    drawLineChart(canvas, data, label, currentVisibleCount);
                    if (canvas.syncCallback) canvas.syncCallback(canvas.chartState);

                } else if (canvas.chartState.isDragging) {
                    // --- Chart Panning ---
                    const dx = x - canvas.chartState.lastX;
                    canvas.chartState.lastX = x;

                    const moveCount = -dx / (plotW / currentVisibleCount);
                    canvas.chartState.scrollOffset += moveCount;
                    drawLineChart(canvas, data, label, currentVisibleCount);
                    if (canvas.syncCallback) canvas.syncCallback(canvas.chartState);

                } else {
                    // Hover calculation
                    if (canvas.chartState.scrollbar &&
                        x >= canvas.chartState.scrollbar.x && x <= canvas.chartState.scrollbar.x + canvas.chartState.scrollbar.width &&
                        (lastEv.y) >= canvas.chartState.scrollbar.y - 5) {
                        canvas.style.cursor = 'pointer';
                    } else {
                        canvas.style.cursor = 'default';
                    }

                    if (x >= padding.left && x <= w - padding.right) {
                        const ratio = (x - padding.left) / plotW;
                        const idx = Math.round(ratio * (currentVisibleCount - 1));
                        if (idx >= 0 && idx < currentVisibleCount) {
                            canvas.chartState.hoveredIndex = idx;
                            drawLineChart(canvas, data, label, currentVisibleCount);
                            if (canvas.syncCallback) canvas.syncCallback(canvas.chartState);
                        }
                    } else {
                        if (canvas.chartState.hoveredIndex !== null) {
                            canvas.chartState.hoveredIndex = null;
                            drawLineChart(canvas, data, label, currentVisibleCount);
                            if (canvas.syncCallback) canvas.syncCallback(canvas.chartState);
                        }
                    }
                }
                canvas.chartState.pendingFrame = false;
            });
        });

        // Mouse Down (Start Drag)
        canvas.addEventListener('mousedown', e => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // 1. Check Scrollbar Hit
            if (canvas.chartState.scrollbar) {
                const sb = canvas.chartState.scrollbar;
                // Add some padding to hit area (e.g. +/- 5px)
                if (x >= sb.x && x <= sb.x + sb.width && y >= sb.y - 5 && y <= sb.y + sb.height + 5) {
                    canvas.chartState.isScrollDragging = true;
                    canvas.chartState.lastX = x;
                    return; // Don't trigger chart drag
                }
            }

            // 2. Check Chart Area Hit (Panning)
            if (x >= padding.left && x <= w - padding.right) {
                canvas.chartState.isDragging = true;
                canvas.chartState.lastX = x;
                canvas.style.cursor = 'grabbing';
            }
        });

        // Mouse Up / Leave
        const stopDrag = () => {
            canvas.chartState.isDragging = false;
            canvas.chartState.isScrollDragging = false;
            canvas.style.cursor = 'default';
        };
        canvas.addEventListener('mouseup', stopDrag);
        canvas.addEventListener('mouseleave', stopDrag);

        // Wheel (Scroll)
        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const currentVisibleCount = canvas.chartState.visibleCount;
            const delta = Math.sign(e.deltaY);
            canvas.chartState.scrollOffset += delta * (currentVisibleCount / 10); // Speed
            requestAnimationFrame(() => drawLineChart(canvas, data, label, currentVisibleCount));
        }, { passive: false });
    }


}



// ==========================================================
// Event Listeners for Tabs & Charts
// ==========================================================

document.body.addEventListener('click', function (e) {
    // --- Tab Switching ---
    const tabBtn = e.target.closest('.tab-btn');
    if (tabBtn && !tabBtn.classList.contains('add-tab-btn') && !e.target.closest('.capture-btn')) {
        if (!tabBtn.querySelector("input")) activateTab(tabBtn.dataset.tab);
        return;
    }

    // --- ADR Period Buttons ---
    const periodBtn = e.target.closest('.period-btn');
    if (periodBtn) {
        const period = periodBtn.dataset.period;
        const fullData = tabData[ADR_TAB_ID].adr;

        document.querySelectorAll('.adr-chart-wrapper').forEach(wrapper => {
            wrapper.querySelectorAll('.period-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.period === period);
            });
        });

        const days = { '6m': 120, '1y': 240, '2y': 480, '5y': 1200, '10y': 2400 }[period] || 240;
        const c1 = document.getElementById('adr_kospi');
        const c2 = document.getElementById('adr_kosdaq');

        if (c1 && fullData && fullData.kospi) {
            c1.chartState.scrollOffset = Math.max(0, fullData.kospi.length - days);
            drawLineChart(c1, fullData.kospi, 'K ADR', days);
        }
        if (c2 && fullData && fullData.kosdaq) {
            c2.chartState.scrollOffset = Math.max(0, fullData.kosdaq.length - days);
            drawLineChart(c2, fullData.kosdaq, 'Q ADR', days);
        }
        return;
    }

    // --- Manual Refresh Buttons ---
    const rankRefreshBtn = e.target.closest('#manualRefresh');
    if (rankRefreshBtn) {
        console.log('[Click] Rank 조회 버튼 클릭');
        loadData();
        loadTransactionRank();
        return;
    }

    const adrRefreshBtn = e.target.closest('.adr-update-btn') || e.target.closest('#adrManualRefresh');
    if (adrRefreshBtn) {
        console.log('[Click] ADR 조회 버튼 클릭 감지');
        updateAdrFromSource();
        return;
    }

    // --- Chart Input Go Button ---
    const goBtn = e.target.closest('.chart-go-btn');
    if (goBtn) {
        console.log('[Click] 차트 이동 버튼 클릭');
        loadChartFromInput(goBtn.previousElementSibling);
        return;
    }

    // --- Dynamic Finviz Config Trigger ---
    const configTrigger = e.target.closest('.config-trigger');
    if (configTrigger) {
        currentConfigTabId = configTrigger.dataset.tab;
        openCustomChartModal();
        return;
    }
    if (e.target.classList.contains('chart-t-btn')) {
        const chartBox = e.target.closest('.chart-box');
        const iframeMain = chartBox.querySelector('.iframe-main');
        const iframeSub = chartBox.querySelector('.iframe-sub');
        const lastSymbol = chartBox.dataset.lastSymbol;
        iframeMain.style.display = 'block'; iframeSub.style.display = 'none';
        if (lastSymbol) {
            chartBox.querySelector('.chart-input').value = lastSymbol;
            iframeMain.src = getDirectTradingViewUrl(lastSymbol);
            setTimeout(() => { if (document.body.contains(iframeMain) && iframeMain.src.includes('s.tradingview.com/widgetembed')) iframeMain.src = getTradingViewDataUrl(lastSymbol); }, 5000);
        }
        saveAppData();
    }
    if (e.target.classList.contains('chart-a-btn')) {
        const chartBox = e.target.closest('.chart-box');
        const iframeMain = chartBox.querySelector('.iframe-main');
        const iframeSub = chartBox.querySelector('.iframe-sub');
        let symbol = chartBox.dataset.lastSymbol;
        if (symbol && symbol.includes(':')) symbol = symbol.split(':')[1];
        iframeMain.style.display = 'block'; iframeSub.style.display = 'none';
        if (symbol) {
            iframeMain.src = `https://alphasquare.co.kr/home/stock-chart?code=${symbol}&_t=${Date.now()}`;
        }
        saveAppData();
    }
    if (e.target.classList.contains('chart-i-btn')) {
        const chartBox = e.target.closest('.chart-box');
        chartBox.querySelector('.iframe-main').style.display = 'none';
        const iframeSub = chartBox.querySelector('.iframe-sub');
        iframeSub.style.display = 'block';
        if (!iframeSub.getAttribute('src')) iframeSub.src = getInvestingUrl();
        saveAppData();
    }
    if (!contextMenu.contains(e.target) && contextMenu.style.display === 'block') contextMenu.style.display = 'none';
});

document.body.addEventListener('change', function (e) {
    if (e.target.id === 'adrRefreshInterval') {
        console.log('[ADR] 새로고침 간격 변경');
        lastSavedSettings.adrInterval = e.target.value;
        updateAdrFromSource();
        startAdrAutoRefresh();
        saveAppData();
    }
});

document.body.addEventListener('keypress', function (e) {
    if (e.target.classList.contains('chart-input') && e.key === 'Enter') loadChartFromInput(e.target);
    if (e.target.classList.contains('chart-title-input') && e.key === 'Enter') { e.target.blur(); saveAppData(); }
});

document.body.addEventListener('dblclick', function (e) {
    if (e.target.classList.contains('chart-title-input')) { e.target.readOnly = false; e.target.select(); }
});

document.body.addEventListener('focusout', function (e) {
    if (e.target.classList.contains('chart-title-input')) { e.target.readOnly = true; saveAppData(); }
});

tabContainer.addEventListener("contextmenu", e => {
    e.preventDefault();
    const btn = e.target.closest(".tab-btn");
    if (btn && !btn.classList.contains("add-tab-btn") && !btn.querySelector("input") && !btn.dataset.perm) {
        targetTabBtn = btn;
        contextMenu.style.display = "block";
        contextMenu.style.left = e.pageX + "px";
        contextMenu.style.top = e.pageY + "px";
    }
});

contextMenu.addEventListener("click", (e) => {
    if (!targetTabBtn || targetTabBtn.dataset.perm) { contextMenu.style.display = "none"; targetTabBtn = null; return; }

    // Check if the clicked item is 'deleteTab'
    if (e.target.id === 'deleteTab') {
        const confirmed = confirm("정말로 이 탭을 삭제하시겠습니까?");
        if (!confirmed) {
            contextMenu.style.display = "none";
            targetTabBtn = null;
            return;
        }

        const tabId = targetTabBtn.dataset.tab;
        const content = document.getElementById(tabId);
        targetTabBtn.remove();
        if (content) content.remove();
        delete tabData[tabId];
        saveAppData();
        const remainingTabs = document.querySelectorAll(".tab-btn:not(.add-tab-btn)");
        if (remainingTabs.length > 0) {
            if (!document.querySelector(".tab-btn.active")) activateTab(remainingTabs[0].dataset.tab);
        }
    }
    targetTabBtn = null;
    contextMenu.style.display = "none";
});

tabContainer.addEventListener("dblclick", function (e) {
    const btn = e.target.closest(".tab-btn");
    if (!btn || btn.classList.contains("add-tab-btn") || btn.querySelector("input") || btn.closest('.right-controls')) return;
    const originalName = btn.textContent;
    const input = document.createElement("input");
    input.type = "text"; input.value = originalName; input.className = "tab-rename-input";
    btn.textContent = ""; btn.appendChild(input); input.focus(); input.select();
    const finishEditing = () => { btn.textContent = input.value.trim() || originalName; saveAppData(); };
    input.addEventListener("blur", finishEditing);
    input.addEventListener("keypress", (ev) => { if (ev.key === "Enter") input.blur(); });
});

let draggedItem = null;
tabContainer.addEventListener('dragstart', function (e) {
    if (e.target.classList.contains('tab-btn') && !e.target.classList.contains('add-tab-btn') && !e.target.dataset.perm) {
        draggedItem = e.target; e.target.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
    } else { e.preventDefault(); }
});
tabContainer.addEventListener('dragend', function (e) {
    if (e.target.classList.contains('tab-btn')) { e.target.classList.remove('dragging'); draggedItem = null; saveAppData(); }
});
tabContainer.addEventListener('dragover', function (e) {
    e.preventDefault(); if (!draggedItem) return;
    const draggableElements = [...tabContainer.querySelectorAll('.tab-btn:not(.dragging):not(.add-tab-btn):not([data-perm])')];
    const afterElement = draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = e.clientX - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) { return { offset: offset, element: child }; } else { return closest; }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
    if (afterElement == null) { tabContainer.insertBefore(draggedItem, addTabBtn); } else { tabContainer.insertBefore(draggedItem, afterElement); }
});

addTabBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    addTabMenu.style.display = "block";
    addTabMenu.style.left = e.pageX + "px";
    addTabMenu.style.top = e.pageY + "px";
});

// Close menus when clicking elsewhere
window.addEventListener('click', () => {
    if (contextMenu) contextMenu.style.display = 'none';
    if (addTabMenu) addTabMenu.style.display = 'none';
});

// Add Overseas Stocks Tab
document.getElementById('addOverseasTab').addEventListener('click', () => {
    const uniqueId = Date.now();
    const newTabId = "tab_custom_" + uniqueId;
    const currentTabs = Array.from(document.querySelectorAll(".tab-btn"));
    const overseasCount = currentTabs.filter(btn => btn.textContent.startsWith("해외종목")).length + 1;

    // Initialize tabData for this tab as a custom overseas type
    tabData[newTabId] = { type: 'overseas_custom', config: '' };

    createTabButtonElement(newTabId, "해외종목 " + overseasCount);
    createTabContentElement(newTabId);
    activateTab(newTabId);
    addTabMenu.style.display = "none";
    saveAppData();
});

// Add Chart Tab
document.getElementById('addChartTab').addEventListener('click', () => {
    const uniqueId = Date.now();
    const newTabId = "tab_grid_" + uniqueId;
    const currentTabs = Array.from(document.querySelectorAll(".tab-btn"));
    const chartCount = currentTabs.filter(btn => btn.textContent.startsWith("차트")).length + 1;

    // Default 6-grid behavior
    const defaults = ["FX_IDC:USDKRW", "KRX:KOSPI", "KRX:KOSDAQ", "BINANCE:BTCUSDT", "SP:SPX", "KRX:005930"];
    tabData[newTabId] = defaults.map(sym => ({ symbol: sym, lastSymbol: sym, mode: 'main', mainSrc: '', subSrc: '' }));

    createTabButtonElement(newTabId, "차트 " + chartCount);
    createTabContentElement(newTabId);
    activateTab(newTabId);
    addTabMenu.style.display = "none";
    saveAppData();
});


captureBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false, preferCurrentTab: true });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width; canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
        canvas.toBlob(blob => {
            const item = new ClipboardItem({ "image/png": blob });
            navigator.clipboard.write([item]).then(() => {
                const originalHTML = captureBtn.innerHTML; captureBtn.innerHTML = "✅"; setTimeout(() => captureBtn.innerHTML = originalHTML, 1000);
            }).catch(err => console.error(err));
        });
        track.stop();
    } catch (err) { console.error(err); }
});

// ==========================================================
// Overseas Tab Refresh Function
// ==========================================================



/**
 * 해외동향 차트 커서 동기화 설정
 */
function setupOverseasCursorSync() {
    const activeContent = document.querySelector('.tab-content.active');
    if (!activeContent) return;

    const isOverseas = (tabData[activeContent.id] && tabData[activeContent.id].type === 'overseas_custom');

    if (!isOverseas) return;

    // Use delegation - only attach once per DOM life of the tab content
    if (activeContent.dataset.cursorSyncAttached === 'true') return;

    const handleMouseMove = (e) => {
        const wrapper = e.target.closest('.finviz-img-wrapper');
        const lines = activeContent.querySelectorAll('.finviz-cursor-line');

        if (!wrapper) {
            lines.forEach(l => l.style.visibility = 'hidden');
            return;
        }

        const rect = wrapper.getBoundingClientRect();
        const offsetRight = rect.right - e.clientX;

        lines.forEach((line) => {
            line.style.right = `${offsetRight}px`;
            line.style.visibility = 'visible';
        });
    };

    const handleMouseLeave = () => {
        const lines = activeContent.querySelectorAll('.finviz-cursor-line');
        lines.forEach(line => line.style.visibility = 'hidden');
    };

    activeContent.addEventListener('mousemove', handleMouseMove);
    activeContent.addEventListener('mouseleave', handleMouseLeave);
    activeContent.dataset.cursorSyncAttached = 'true';
    console.log(`[CursorSync] Delegation attached to ${activeContent.id}`);
}

/**
 * 해외 차트 렌더링 도우미
 */
const SECTOR_COLORS = [
    '#1864ab', '#2b8a3e', '#e67700', '#5f3dc4', '#c2255c',
    '#0b7285', '#5c940d', '#d9480f', '#862e9c', '#a61e4d'
];

function renderFinvizChartItem(chart, color = '') {
    const proxyUrl = `/api/finviz-image?url=${encodeURIComponent(chart.url)}`;
    const isFuture = chart.url.includes('fut_chart.ashx');

    // Safety check: ensure title is clean of accidental leading/trailing quotes
    const cleanTitle = (chart.title || '').replace(/^[ "'“‘”’]+|[ "'“‘”’]+$/g, '').trim();

    // Convert hex to semi-transparent version for background
    let style = '';
    if (color) {
        style = `--section-color: ${color}; --section-color-alpha: ${color}22;`;
    }

    return `
        <div class="finviz-chart-box" style="${style}">
            <div class="finviz-chart-title ${color ? 'colorful' : ''}">${cleanTitle}</div>
            <div class="finviz-img-wrapper ${isFuture ? 'is-future' : ''}">
                <img src="${proxyUrl}" class="finviz-chart-img ${isFuture ? 'future' : 'stock'}" alt="${cleanTitle}" data-chart-url="${chart.url}">
                <div class="finviz-cursor-line"></div>
            </div>
        </div>
    `;
}

/**
 * 커스텀 차트 아이템 렌더링 (이미지 vs 캔버스)
 */
function renderCustomChartItem(item, color = '', tabId, idx) {
    const isMulti = item.urls && item.urls.length > 1;
    const isFred = item.urls && item.urls.some(url => url.toLowerCase().includes('fred('));
    // Also treat single TradingEconomics URL as canvas chart, not image
    const isTE = item.urls && item.urls.some(url => url.toLowerCase().includes('tradingeconomics.com'));

    if (isMulti || isFred || isTE) {
        const cleanTitle = (item.title || '').replace(/^[ "'“‘”’]+|[ "'“‘”’]+$/g, '').trim();
        let style = '';
        if (color) {
            style = `--section-color: ${color}; --section-color-alpha: ${color}22;`;
        }
        const canvasId = `multi_chart_${tabId}_${idx}`;
        // Use encodeURIComponent to be 100% safe against all quotes
        const safeUrls = encodeURIComponent(JSON.stringify(item.urls));
        return `
            <div class="finviz-chart-box multi-chart-box" style="${style}" data-series="${encodeURIComponent(JSON.stringify(item.series || []))}" data-urls="${safeUrls}" data-idx="${idx}">
                <div class="finviz-chart-title ${color ? 'colorful' : ''}">${cleanTitle}</div>
                <div class="te-chart-wrapper" style="background: white;">
                    <canvas id="${canvasId}" class="multi-chart-canvas" width="400" height="200" style="width:100%; height:100%;"></canvas>
                    <div class="te-chart-loading">데이터 로딩 중...</div>
                </div>
            </div>
        `;
    } else {
        // 단일 URL인 경우 기존 방식 유지 (이미지 위주)
        return renderFinvizChartItem({ url: item.urls[0], title: item.title }, color);
    }
}

/**
 * TradingEconomics 차트 아이템 렌더링
 */
function renderTradingEconomicsChartItem(chart, color = '', tabId, idx) {
    // Safety check: ensure title is clean of accidental leading/trailing quotes
    const cleanTitle = (chart.title || '').replace(/^[ "'“‘”’]+|[ "'“‘”’]+$/g, '').trim();

    // Convert hex to semi-transparent version for background
    let style = '';
    if (color) {
        style = `--section-color: ${color}; --section-color-alpha: ${color}22;`;
    }

    const canvasId = `te_chart_${tabId}_${idx}`;

    return `
        <div class="finviz-chart-box te-chart-box" style="${style}" data-te-url="${chart.url}" data-te-idx="${idx}">
            <div class="finviz-chart-title ${color ? 'colorful' : ''}">${cleanTitle}</div>
            <div class="te-chart-wrapper">
                <canvas id="${canvasId}" class="te-chart-canvas" width="400" height="200"></canvas>
                <div class="te-chart-loading">데이터 로딩 중...</div>
            </div>
        </div>
    `;
}

/**
 * TradingEconomics 차트 데이터 로드 및 렌더링
 */
async function loadTradingEconomicsChart(canvas, url, title) {
    const wrapper = canvas.closest('.te-chart-wrapper');
    const loadingEl = wrapper?.querySelector('.te-chart-loading');

    if (loadingEl) loadingEl.style.display = 'block';

    try {
        const proxyUrl = `/api/trading-economics?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const result = await response.json();

        if (!result.success || !result.data || !Array.isArray(result.data)) {
            let errorMsg = result.error || 'Invalid data format';
            if (result.data === null) {
                errorMsg = '데이터 없음 (Guest 계정 제한 또는 URL 오류)';
            } else if (!Array.isArray(result.data)) {
                errorMsg = `Invalid data format: Expected array but got ${typeof result.data}`;
                if (result.data && result.data.Message) errorMsg += ` (${result.data.Message})`;
            }
            throw new Error(errorMsg);
        }

        const rawData = result.data;
        if (rawData.length > 0) {
            console.log('[TradingEconomics] Data sample:', rawData[0]);
        }

        // Parse data: find date and value fields dynamically
        const chartData = rawData.map(item => {
            const dateStr = item.DateTime || item.Date || item.date || item.last_update;
            const val = item.Value !== undefined ? item.Value :
                (item.Close !== undefined ? item.Close :
                    (item.Actual !== undefined ? item.Actual :
                        (item.actual !== undefined ? item.actual :
                            (item.LatestValue !== undefined ? item.LatestValue :
                                (item.latest_value !== undefined ? item.latest_value :
                                    (item.PreviousValue !== undefined ? item.PreviousValue : item.previous_value))))));

            return {
                date: new Date(dateStr),
                value: parseFloat(val)
            };
        }).filter(d => d.date instanceof Date && !isNaN(d.date.getTime()) && !isNaN(d.value))
            .sort((a, b) => a.date - b.date);

        if (chartData.length === 0) {
            const keys = rawData.length > 0 ? Object.keys(rawData[0]).join(', ') : 'none';
            throw new Error(`데이터 파싱 실패 (구성 항목: ${keys})`);
        }

        if (loadingEl) loadingEl.style.display = 'none';

        // Draw the chart
        drawTradingEconomicsLineChart(canvas, chartData, title);

    } catch (error) {
        console.error('[TradingEconomics] Chart load error:', error);
        if (loadingEl) {
            loadingEl.textContent = '로드 실패: ' + error.message;
            loadingEl.style.color = '#e74c3c';
        }
    }
}

/**
 * TradingEconomics 라인 차트 그리기
 */
function drawTradingEconomicsLineChart(canvas, data, title) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Set canvas size with DPR
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, w, h);

    const padding = { top: 20, right: 50, bottom: 30, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Calculate min/max values
    // Filter out NaN/null values and future dummy data
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const validData = data.filter(d => d.value !== null && !isNaN(d.value) && d.date <= todayEnd);
    if (validData.length === 0) return;

    // Update local data reference to filtered version
    data = validData;

    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const buffer = range * 0.1;

    const yMin = minVal - buffer;
    const yMax = maxVal + buffer;

    // Font settings
    const axisFont = '11px sans-serif';
    const headerFont = 'bold 12px sans-serif';
    const dateFont = '10px sans-serif';

    // Cache data for redraw
    canvas.chartData = { data, title };
    canvas.setAttribute('data-chart-type', 'te-single');

    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartH / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();

        // Y-axis labels
        const val = yMax - ((yMax - yMin) / gridLines) * i;
        ctx.fillStyle = '#666';
        ctx.font = axisFont;
        ctx.textAlign = 'left';
        ctx.fillText(val.toFixed(2), w - padding.right + 5, y + 3);
    }

    // Draw line
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    data.forEach((point, i) => {
        const x = padding.left + (i / (data.length - 1)) * chartW;
        const y = padding.top + (1 - (point.value - yMin) / (yMax - yMin)) * chartH;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#3498db';
    if (data.length <= 60) {
        data.forEach((point, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartW;
            const y = padding.top + (1 - (point.value - yMin) / (yMax - yMin)) * chartH;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    ctx.fillText(firstDate, padding.left, h - 5);
    ctx.fillText(lastDate, w - padding.right, h - 5);

    // Draw latest information in top-right
    const latestItem = data[data.length - 1];
    const latestValue = latestItem.value;
    const latestDateStr = latestItem.date.toISOString().slice(0, 10).replace(/-/g, '/');

    ctx.textAlign = 'right';

    // Latest Date
    ctx.fillStyle = '#666';
    ctx.font = dateFont;
    ctx.fillText(latestDateStr, w - padding.right, padding.top - 18);

    // Latest Value
    ctx.fillStyle = '#2c3e50';
    ctx.font = headerFont;
    ctx.fillText(latestValue.toFixed(2), w - padding.right, padding.top - 5);
}

/**
 * 다중 시리즈 차트 데이터 로드 및 렌더링
 */
async function loadMultiSeriesChart(canvas, urls, title) {
    const loadingEl = canvas.nextElementSibling;
    if (loadingEl) {
        loadingEl.style.display = 'flex';
        loadingEl.style.color = 'var(--text-muted)';
        loadingEl.textContent = '데이터 로딩 중...';
    }

    try {
        // Check for flat array format: ["url1", "lbl1", "dur1", "url2", "lbl2", "dur2"]
        let seriesConfig = [];
        if (Array.isArray(urls)) {
            // If all elements are strings and length is divisible by 3, treat as flat array
            const allStrings = urls.every(u => typeof u === 'string');
            if (urls.length > 0 && urls.length % 3 === 0 && allStrings &&
                (urls[0].includes('http') || urls[0].includes('tradingeconomics'))) {

                for (let i = 0; i < urls.length; i += 3) {
                    seriesConfig.push({
                        url: urls[i],
                        label: urls[i + 1],
                        duration: urls[i + 2]
                    });
                }
                console.log('[MultiSeries] Detected flat array input, grouped into:', seriesConfig);
            } else {
                // Regular processing (array of strings or objects)
                seriesConfig = urls.map(u => {
                    if (typeof u === 'string') return { url: u, label: '' };
                    if (Array.isArray(u)) return { url: u[0], label: u[1], duration: u[2] };
                    return u;
                });
            }
        }

        const seriesPromises = seriesConfig.map(async (item) => {
            let url = item.url;
            let data = [];
            let label = item.label || "";

            let dataSource = '';
            const lowerUrl = url.toLowerCase().trim();
            if (lowerUrl.indexOf('fred') !== -1) dataSource = 'fred';
            else if (lowerUrl.indexOf('ecos') !== -1) dataSource = 'ecos';
            else if (lowerUrl.indexOf('tradingeconomics.com') !== -1 || lowerUrl.indexOf('tradingeconomics') !== -1) dataSource = 'te';

            console.log(`[MultiSeries] Final check - URL: "${url}", Source: "${dataSource}"`);

            if (dataSource === 'fred') {
                // ... (existing FRED logic) ...
                const fredMatch = url.match(/fred\s*\(\s*([^,)]+)(?:,\s*([^)]+))?\s*\)/i);
                if (fredMatch) {
                    const cleanArg = (s) => s ? s.replace(/['"“”‘’]/g, '').trim() : '';
                    const sid = cleanArg(fredMatch[1]);
                    const per = cleanArg(fredMatch[2]) || '1년';
                    if (!sid) throw new Error("FRED Series ID가 비어있습니다.");
                    if (!label) label = sid;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 20000); // Increased to 20s for reliability
                    try {
                        const resp = await fetch(`/api/fred?series_id=${encodeURIComponent(sid)}&period=${encodeURIComponent(per)}`, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);
                        const resJson = await resp.json();
                        if (resJson.success) {
                            if (!resJson.data || resJson.data.length === 0) throw new Error('데이터가 비어있습니다.');
                            data = resJson.data.map(d => ({ date: new Date(d.date), value: d.value }));
                        } else throw new Error(resJson.error || 'Unknown FRED Error');
                    } catch (fetchErr) {
                        clearTimeout(timeoutId);
                        throw fetchErr;
                    }
                } else throw new Error(`Invalid FRED format: ${url}`);
            } else if (dataSource === 'ecos') {
                // ... (existing ECOS logic) ...
                const innerResult = url.match(/ecos\s*\(([^)]+)\)/i);
                if (innerResult) {
                    const args = innerResult[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
                    let table = '817Y002';
                    let itemCode = '';
                    let period = '';
                    if (args.length === 3) { table = args[0]; itemCode = args[1]; period = args[2]; }
                    else if (args.length === 2) { itemCode = args[0]; period = args[1]; }
                    else throw new Error(`Invalid ECOS format: ${url}`);
                    if (!label) label = itemCode;
                    const now = new Date();
                    const formatYMD = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
                    const endDate = formatYMD(now);
                    let startDateObj = new Date(now);
                    if (period.includes('년')) startDateObj.setFullYear(now.getFullYear() - (parseInt(period) || 1));
                    else if (period.includes('개월')) startDateObj.setMonth(now.getMonth() - (parseInt(period) || 1));
                    else startDateObj.setFullYear(now.getFullYear() - 1);
                    const startDate = formatYMD(startDateObj);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);
                    try {
                        const resp = await fetch(`/api/ecos?table=${encodeURIComponent(table)}&item=${encodeURIComponent(itemCode)}&start=${startDate}&end=${endDate}`, { signal: controller.signal });
                        clearTimeout(timeoutId);
                        if (!resp.ok) throw new Error(`HTTP Error ${resp.status}`);
                        const resJson = await resp.json();
                        if (resJson.success && resJson.data) {
                            data = resJson.data.map(r => {
                                const dStr = r.TIME;
                                if (dStr.length === 8) return { date: new Date(`${dStr.substring(0, 4)}-${dStr.substring(4, 6)}-${dStr.substring(6, 8)}`), value: parseFloat(r.DATA_VALUE) };
                                return null;
                            }).filter(x => x !== null).sort((a, b) => a.date - b.date);
                        } else throw new Error(resJson.error || 'ECOS API returned no data');
                    } catch (fetchErr) {
                        clearTimeout(timeoutId);
                        throw fetchErr;
                    }
                } else throw new Error(`Invalid ECOS format: ${url}`);
            } else if (dataSource === 'te') {
                // TradingEconomics logic - supports both URL and function formats
                // Function format: tradingeconomics('path', 'duration')
                // URL format: https://tradingeconomics.com/path

                let actualUrl = url;
                let period = item.duration || ''; // Duration from item object (e.g., '5년', '10년')

                // No function parsing - duration comes from item.duration
                console.log(`[MultiSeries] TE detected - URL: ${actualUrl}, Label: ${label || 'auto'}, Period: ${period || 'default'}`);

                const controller = new AbortController();
                // Scraping takes time (Puppeteer launch + navigation + click + data load)
                // Increased to 60s to prevent premature timeout
                const timeoutId = setTimeout(() => controller.abort(), 60000);
                try {
                    // Pass duration to backend so it can click the appropriate button
                    let proxyUrl = `/api/trading-economics?url=${encodeURIComponent(actualUrl)}`;
                    if (period) {
                        proxyUrl += `&duration=${encodeURIComponent(period)}`;
                    }
                    const resp = await fetch(proxyUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (!resp.ok) {
                        const errorData = await resp.json().catch(() => ({}));
                        throw new Error(`서버 오류 (${resp.status}): ${errorData.details || errorData.error || 'TradingEconomics 접근 금지 (403)'}`);
                    }
                    const resJson = await resp.json();
                    let rawData = resJson.data;

                    // 이중 방어: 문자열인 경우 JSON 파싱 시도
                    if (typeof rawData === 'string' && rawData.trim().startsWith('[')) {
                        try {
                            const parsed = JSON.parse(rawData.trim());
                            if (Array.isArray(parsed)) rawData = parsed;
                        } catch (e) {
                            console.warn("[MultiSeries] TE String parse failed:", e);
                        }
                    }

                    if (resJson.success && Array.isArray(rawData) && rawData.length > 0) {
                        data = rawData.map(item => {
                            const dateStr = item.DateTime || item.Date || item.date || item.last_update;
                            const val = item.Value !== undefined ? item.Value :
                                (item.Close !== undefined ? item.Close :
                                    (item.Actual !== undefined ? item.Actual :
                                        (item.actual !== undefined ? item.actual :
                                            (item.LatestValue !== undefined ? item.LatestValue :
                                                (item.latest_value !== undefined ? item.latest_value :
                                                    (item.PreviousValue !== undefined ? item.PreviousValue : item.previous_value))))));
                            return { date: new Date(dateStr), value: parseFloat(val) };
                        }).filter(d => d.date instanceof Date && !isNaN(d.date.getTime()) && !isNaN(d.value))
                            .sort((a, b) => a.date - b.date);

                        // Note: Duration filtering is handled by backend via button clicks (1Y/5Y/10Y/MAX)
                        // No need for client-side filtering

                        if (!label) label = actualUrl.split('/').pop().split('?')[0];
                    }

                    if (!Array.isArray(data) || data.length === 0) {
                        let errorMsg = resJson.error || 'Invalid TE data format';
                        const diagVal = (typeof rawData === 'string') ? rawData.toLowerCase() : (typeof resJson.data === 'string' ? resJson.data.toLowerCase() : '');
                        if (diagVal.includes('<!doctype html>') || diagVal.includes('<html')) {
                            errorMsg = 'TradingEconomics 브라우저 주소를 API가 거부했습니다. API 주소를 사용하거나 잠시 후 다시 시도해 주세요.';
                        } else {
                            errorMsg = `데이터 형식이 올바르지 않거나 비어있습니다. (Type: ${Array.isArray(rawData) ? 'Array' : typeof rawData})`;
                        }
                        throw new Error(errorMsg);
                    }
                } catch (fetchErr) {
                    clearTimeout(timeoutId);
                    throw fetchErr;
                }
            } else {
                throw new Error(`지원하지 않는 데이터 소스입니다. (Detected: ${dataSource || 'None'}, URL: ${url})`);
            }
            return { label, data, color: '' };
        });

        const results = await Promise.all(seriesPromises);
        const validResults = results.filter(r => r && r.data.length > 0);

        if (validResults.length === 0) {
            throw new Error("유효한 데이터가 없습니다.");
        }

        drawMultiSeriesLineChart(canvas, validResults, title);
        if (loadingEl) loadingEl.style.display = 'none';

    } catch (e) {
        console.error("[MultiSeries] Error loading chart:", e);
        if (loadingEl) {
            loadingEl.textContent = `오류: ${e.message}`;
            loadingEl.style.color = '#e74c3c';
        }
    }
}

/**
 * 다중 선 차트 그리기
 */
function drawMultiSeriesLineChart(canvas, allSeries, title) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // Font settings - consistent across all redraws
    const axisFont = '11px sans-serif'; // for X/Y axis
    const legendFont = 'bold 12px sans-serif'; // for legend
    const dateFont = '10px sans-serif'; // for latest date

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padding = { top: 50, right: 60, bottom: 50, left: 10 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // 공통 X축(날짜) 범위 및 Y축 범위 계산
    let allValues = [];
    let minDate = new Date(8640000000000000);
    let maxDate = new Date(-8640000000000000);

    allSeries.forEach(s => {
        // Filter out NaN/null values and future data before processing
        const now = new Date();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        s.data = s.data.filter(d => d.value !== null && !isNaN(d.value) && d.date <= todayEnd);

        s.data.forEach(d => {
            allValues.push(d.value);
            if (d.date < minDate) minDate = d.date;
            if (d.date > maxDate) maxDate = d.date;
        });
    });

    if (allValues.length === 0) return;

    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    const buffer = range * 0.1;

    const yMin = minVal - buffer;
    const yMax = maxVal + buffer;

    // 차트 데이터를 canvas에 저장 (마우스 이벤트에서 사용)
    canvas.chartData = {
        allSeries: allSeries,
        minDate: minDate,
        maxDate: maxDate,
        yMin: yMin,
        yMax: yMax,
        padding: padding,
        chartW: chartW,
        chartH: chartH,
        w: w,
        h: h,
        title: title
    };
    canvas.setAttribute('data-chart-type', 'multi-series');

    // 그리드
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartH / 5) * i;
        ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
        const val = yMax - ((yMax - yMin) / 5) * i;
        ctx.fillStyle = '#999'; ctx.font = axisFont; ctx.textAlign = 'left';
        ctx.fillText(val.toFixed(2), w - padding.right + 5, y + 3);
    }

    // 데이터 그리기
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    allSeries.forEach((s, sIdx) => {
        const color = colors[sIdx % colors.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        s.data.forEach((d, i) => {
            const x = padding.left + ((d.date - minDate) / (maxDate - minDate)) * chartW;
            const y = padding.top + (1 - (d.value - yMin) / (yMax - yMin)) * chartH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 범례 표시 (우측 상단)
        ctx.fillStyle = color;
        ctx.font = legendFont;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        const lastItem = s.data[s.data.length - 1];
        const dateStr = lastItem.date.toISOString().slice(5, 10).replace(/-/g, '/'); // MM/DD
        ctx.fillText(`${s.label} (${dateStr}): ${lastItem.value.toFixed(2)}`, w - padding.right, 10 + (sIdx * 15)); // increased spacing
    });

    // X축 라벨 (여러 개의 중간 날짜 표시)
    ctx.fillStyle = '#999';
    ctx.font = axisFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // 날짜 범위에 따라 적절한 간격으로 레이블 표시
    const dateRange = maxDate - minDate;
    const daysDiff = dateRange / (1000 * 60 * 60 * 24);

    let numLabels = 5; // 기본 5개 레이블
    if (daysDiff > 3650) numLabels = 8; // 10년 이상이면 8개
    else if (daysDiff > 1825) numLabels = 6; // 5년 이상이면 6개

    for (let i = 0; i <= numLabels; i++) {
        const ratio = i / numLabels;
        const date = new Date(minDate.getTime() + dateRange * ratio);
        const x = padding.left + chartW * ratio;

        // 날짜 포맷 (년도만 또는 년-월)
        let dateLabel;
        if (daysDiff > 730) { // 2년 이상이면 년도만
            dateLabel = date.getFullYear().toString();
        } else if (daysDiff > 180) { // 6개월 이상이면 년-월
            dateLabel = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else { // 6개월 미만이면 월-일
            dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
        }

        ctx.fillText(dateLabel, x, h - 30);
    }

    // 마우스 이벤트 리스너 추가 (한 번만)
    if (!canvas.hasInteractiveEvents) {
        canvas.hasInteractiveEvents = true;

        canvas.addEventListener('mousemove', (e) => {
            if (!canvas.chartData) return;

            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const { padding, chartW, minDate, maxDate, allSeries } = canvas.chartData;

            // 차트 영역 내에 있는지 확인
            if (mouseX < padding.left || mouseX > padding.left + chartW) {
                return;
            }

            // 마우스 X 위치를 날짜로 변환
            const ratio = (mouseX - padding.left) / chartW;
            const hoveredDate = new Date(minDate.getTime() + (maxDate - minDate) * ratio);

            // 각 시리즈에서 가장 가까운 데이터 포인트 찾기
            const hoveredValues = allSeries.map(s => {
                if (!s.data || s.data.length === 0) return null;
                const closest = s.data.reduce((prev, curr) => {
                    return Math.abs(curr.date - hoveredDate) < Math.abs(prev.date - hoveredDate) ? curr : prev;
                });
                return { label: s.label, value: closest.value, date: closest.date };
            }).filter(v => v !== null);

            // 차트 다시 그리기 (수직선 + 툴팁 포함)
            drawMultiSeriesWithCursor(canvas, mouseX, hoveredValues);

            // 같은 탭의 다른 차트에 동기화
            syncCursorToOtherCharts(canvas, hoveredDate);
        });

        canvas.addEventListener('mouseleave', () => {
            // 커서 제거하고 원래 차트 다시 그리기
            if (canvas.chartData) {
                drawMultiSeriesLineChart(canvas, canvas.chartData.allSeries, canvas.chartData.title);
            }
            // 다른 차트의 커서도 제거
            clearCursorFromOtherCharts(canvas);
        });
    }
}

/**
 * 커서와 툴팁이 포함된 차트 그리기
 */
function drawMultiSeriesWithCursor(canvas, mouseX, hoveredValues) {
    if (!canvas.chartData) return;

    const { allSeries, minDate, maxDate, yMin, yMax, padding, chartW, chartH, w, h, title } = canvas.chartData;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // 캔버스 초기화
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    // Font settings
    const axisFont = '11px sans-serif';
    const legendFont = 'bold 12px sans-serif';

    // 그리드
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartH / 5) * i;
        ctx.beginPath(); ctx.moveTo(padding.left, y); ctx.lineTo(w - padding.right, y); ctx.stroke();
        const val = yMax - ((yMax - yMin) / 5) * i;
        ctx.fillStyle = '#999'; ctx.font = axisFont; ctx.textAlign = 'left';
        ctx.fillText(val.toFixed(2), w - padding.right + 5, y + 3);
    }

    // 데이터 그리기
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    allSeries.forEach((s, sIdx) => {
        const color = colors[sIdx % colors.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        s.data.forEach((d, i) => {
            const x = padding.left + ((d.date - minDate) / (maxDate - minDate)) * chartW;
            const y = padding.top + (1 - (d.value - yMin) / (yMax - yMin)) * chartH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 범례 표시
        ctx.fillStyle = color;
        ctx.font = legendFont;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        const lastItem = s.data[s.data.length - 1];
        const dateStr = lastItem.date.toISOString().slice(5, 10).replace(/-/g, '/');
        ctx.fillText(`${s.label} (${dateStr}): ${lastItem.value.toFixed(2)}`, w - padding.right, 10 + (sIdx * 15));
    });

    // X축 라벨
    ctx.fillStyle = '#999';
    ctx.font = axisFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const dateRange = maxDate - minDate;
    const daysDiff = dateRange / (1000 * 60 * 60 * 24);
    let numLabels = 5;
    if (daysDiff > 3650) numLabels = 8;
    else if (daysDiff > 1825) numLabels = 6;

    for (let i = 0; i <= numLabels; i++) {
        const ratio = i / numLabels;
        const date = new Date(minDate.getTime() + dateRange * ratio);
        const x = padding.left + chartW * ratio;

        let dateLabel;
        if (daysDiff > 730) {
            dateLabel = date.getFullYear().toString();
        } else if (daysDiff > 180) {
            dateLabel = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
            dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
        }

        ctx.fillText(dateLabel, x, h - 30);
    }

    // 수직 커서 라인
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(mouseX, padding.top);
    ctx.lineTo(mouseX, padding.top + chartH);
    ctx.stroke();
    ctx.setLineDash([]);

    // 툴팁
    if (hoveredValues && hoveredValues.length > 0) {
        const tooltipWidth = 150;
        const tooltipHeight = 20 + hoveredValues.length * 15;
        let tooltipX = mouseX + 10;
        const tooltipY = padding.top + 10;

        // 툴팁이 화면 밖으로 나가지 않도록 조정
        if (tooltipX + tooltipWidth > w - padding.right) {
            tooltipX = mouseX - tooltipWidth - 10;
        }

        // 툴팁 배경
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        // 날짜
        ctx.fillStyle = '#333';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const tDate = hoveredValues[0].date;
        const dTooltipStr = `${tDate.getFullYear()}/${String(tDate.getMonth() + 1).padStart(2, '0')}/${String(tDate.getDate()).padStart(2, '0')}`;
        ctx.fillText(dTooltipStr, tooltipX + 5, tooltipY + 5);

        // 각 시리즈 값
        hoveredValues.forEach((v, i) => {
            ctx.fillStyle = colors[i % colors.length];
            ctx.font = '10px sans-serif';
            ctx.fillText(`${v.label}: ${v.value.toFixed(2)}`, tooltipX + 5, tooltipY + 20 + i * 15);
        });

        // 호버된 데이터 포인트에 붉은색 원형 마커 표시
        hoveredValues.forEach((v) => {
            const x = padding.left + ((v.date - minDate) / (maxDate - minDate)) * chartW;
            const y = padding.top + (1 - (v.value - yMin) / (yMax - yMin)) * chartH;

            // 외곽선 (흰색)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();

            // 내부 원 (붉은색)
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }
}

/**
 * 같은 탭의 다른 차트에 커서 동기화
 */
function syncCursorToOtherCharts(sourceCanvas, hoveredDate) {
    const activeContent = document.querySelector('.tab-content.active');
    if (!activeContent) return;

    const allCanvases = activeContent.querySelectorAll('canvas[data-chart-type="multi-series"]');

    allCanvases.forEach(canvas => {
        if (canvas === sourceCanvas) return;
        if (!canvas.chartData) return;

        const { minDate, maxDate, padding, chartW, allSeries } = canvas.chartData;

        // 날짜 범위 내에 있는지 확인
        if (hoveredDate < minDate || hoveredDate > maxDate) return;

        // 해당 날짜에 가장 가까운 X 위치 계산
        const ratio = (hoveredDate - minDate) / (maxDate - minDate);
        const mouseX = padding.left + chartW * ratio;

        // 해당 위치의 값 찾기
        const hoveredValues = allSeries.map(s => {
            if (!s.data || s.data.length === 0) return null;
            const closest = s.data.reduce((prev, curr) => {
                return Math.abs(curr.date - hoveredDate) < Math.abs(prev.date - hoveredDate) ? curr : prev;
            });
            return { label: s.label, value: closest.value, date: closest.date };
        }).filter(v => v !== null);

        drawMultiSeriesWithCursor(canvas, mouseX, hoveredValues);
    });
}

/**
 * 다른 차트의 커서 제거
 */
function clearCursorFromOtherCharts(sourceCanvas) {
    const activeContent = document.querySelector('.tab-content.active');
    if (!activeContent) return;

    const allCanvases = activeContent.querySelectorAll('canvas[data-chart-type="multi-series"]');

    allCanvases.forEach(canvas => {
        if (canvas === sourceCanvas) return;
        if (!canvas.chartData) return;

        drawMultiSeriesLineChart(canvas, canvas.chartData.allSeries, canvas.chartData.title);
    });
}


/**
 * 환율/금리 탭 차트 새로고침
 */
async function refreshExchangeRateCharts(tabId) {
    const content = document.getElementById(tabId);
    if (!content) return;

    const prefix = `exchangeRate_${tabId}`;
    const statusText = document.getElementById(`${prefix}StatusText`);
    const lastUpdate = document.getElementById(`${prefix}LastUpdate`);

    if (statusText) statusText.textContent = '데이터 로딩 중...';

    const chartBoxes = content.querySelectorAll('.te-chart-box');
    const multiCanvases = content.querySelectorAll('.multi-chart-canvas');

    let loadedCount = 0;
    const totalCount = chartBoxes.length + multiCanvases.length;

    if (totalCount === 0) {
        if (statusText) statusText.textContent = '차트 없음';
        return;
    }

    const checkComplete = () => {
        if (++loadedCount >= totalCount) {
            if (statusText) statusText.textContent = '데이터 로딩 완료';
            if (lastUpdate) lastUpdate.textContent = formatTime(new Date());
        }
    };

    // 1. TradingEconomics Charts
    for (const box of chartBoxes) {
        const url = box.dataset.teUrl;
        const idx = box.dataset.teIdx;
        const canvas = box.querySelector('.te-chart-canvas');
        const title = box.querySelector('.finviz-chart-title')?.textContent || '';

        if (url && canvas) {
            try {
                await loadTradingEconomicsChart(canvas, url, title);
            } catch (e) {
                console.error('[ExchangeRate] Chart load failed:', e);
            }
        }
        checkComplete();
    }

    // 2. Multi-Series / FRED Charts
    for (const canvas of multiCanvases) {
        const box = canvas.closest('.multi-chart-box');
        if (box) {
            try {
                let seriesConfig = [];
                // Try reading data-series first
                if (box.dataset.series) {
                    try {
                        seriesConfig = JSON.parse(decodeURIComponent(box.dataset.series));
                    } catch (e) { /* ignore */ }
                }

                // Fallback to data-urls if series not found
                if (seriesConfig.length === 0 && box.dataset.urls) {
                    let rawUrls = box.dataset.urls;
                    try { rawUrls = decodeURIComponent(rawUrls); } catch (e) { }
                    const urls = JSON.parse(rawUrls);
                    seriesConfig = urls.map(u => ({ url: u, label: '' }));
                }

                if (seriesConfig.length > 0) {
                    const title = box.querySelector('.finviz-chart-title')?.textContent || '';
                    await loadMultiSeriesChart(canvas, seriesConfig, title);
                }
            } catch (e) {
                console.error('[ExchangeRate] Multi-chart load failed:', e);
            }
        }
        checkComplete();
    }
}

/**
 * 실적 탭 새로고침
 */
function refreshEarningsTab(tabId) {
    const iframe = document.getElementById(`iframeEarnings_${tabId}`);
    if (iframe) {
        const currentSrc = iframe.src;
        console.log(`[Refresh] Reloading Earnings iframe for ${tabId}`);
        iframe.src = 'about:blank';
        setTimeout(() => {
            iframe.src = currentSrc;
            const statusText = document.getElementById(`earningsStatusText_${tabId}`);
            const lastUpdate = document.getElementById(`earningsLastUpdate_${tabId}`);
            if (statusText) statusText.textContent = '새로고침 완료';
            if (lastUpdate) lastUpdate.textContent = formatTime(new Date());
        }, 100);
    }
}

/**
 * 일반 동적 차트 탭 (6개 iframe) 새로고침
 */
function refreshDynamicChartsTab(tabId) {
    const content = document.getElementById(tabId);
    if (!content) return;

    console.log(`🔄 [Refresh] Reloading dynamic iframes for tab: ${tabId}`);
    const iframes = content.querySelectorAll('iframe');
    iframes.forEach((iframe, index) => {
        const currentSrc = iframe.src;
        if (currentSrc && currentSrc !== 'about:blank') {
            // 부하 방지를 위해 순차적 재로드
            setTimeout(() => {
                iframe.src = 'about:blank';
                setTimeout(() => {
                    iframe.src = currentSrc;
                }, 100);
            }, index * 800);
        }
    });
}


/**
 * 모든 탭 전체 새로고침 (백그라운드 포함)
 */
async function refreshAllTabs() {
    console.log("🔄 전체조회 시작...");
    if (globalRefreshBtn) {
        const originalText = globalRefreshBtn.textContent;
        globalRefreshBtn.textContent = "갱신 중...";
        globalRefreshBtn.disabled = true;
        setTimeout(() => {
            globalRefreshBtn.textContent = originalText;
            globalRefreshBtn.disabled = false;
        }, 2000);
    }

    // 1. 순위 탭
    loadData();
    loadTransactionRank();

    // 2. ADR 탭
    updateAdrFromSource();

    // 4. 기타 동적 탭들
    Object.keys(tabData).forEach(tabId => {
        const wasEmpty = initializeTab(tabId);
        const type = tabData[tabId]?.type;

        // Custom/Exchange/ADR are already refreshed inside initializeTab(tabId) if wasEmpty.
        // For others (Earnings, Dynamic iframes), we proceed to refresh.
        if (wasEmpty && (tabId === ADR_TAB_ID || type === 'overseas_custom' || type === 'exchange_rate')) return;

        if (tabId === EARNINGS_TAB_ID) {
            refreshEarningsTab(tabId);
        } else if (type === 'exchange_rate') {
            refreshExchangeRateCharts(tabId);
        } else if (type === 'overseas_custom') {
            refreshOverseasCustomCharts(tabId);
        } else if (!type && Array.isArray(tabData[tabId])) {
            refreshDynamicChartsTab(tabId);
        }
    });

    if (statusText) statusText.textContent = "전체 탭 갱신 명령 전송됨";
    if (lastUpdate) lastUpdate.textContent = formatTime(new Date());
}

/**
 * 콤마로 분리하되 따옴표 안의 콤마는 무시
 */
function splitByCommaIgnoringQuotes(str) {
    const parts = [];
    let current = '';
    let inQuote = false;
    let quoteChar = '';
    let parenDepth = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (inQuote) {
            current += char;
            if (char === quoteChar) inQuote = false;
        } else {
            if (char === '"' || char === "'" || char === '“' || char === '”') {
                inQuote = true;
                quoteChar = char;
                current += char;
            } else if (char === '(') {
                parenDepth++;
                current += char;
            } else if (char === ')') {
                if (parenDepth > 0) parenDepth--;
                current += char;
            } else if (char === ',' && parenDepth === 0) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
    }
    if (current) parts.push(current.trim());
    return parts;
}

/**
 * 사용자 정의 해외 차트 데이터 파싱
 */
function parseCustomCharts(input) {
    const items = [];
    const lines = input.split('\n');
    let inBlockComment = false; // Block comment state tracker

    lines.forEach(line => {
        let trimmed = line.trim();

        // Block comment handling
        if (inBlockComment) {
            // Check if block comment ends on this line
            const endIdx = trimmed.indexOf('*/');
            if (endIdx !== -1) {
                inBlockComment = false;
                // Process any content after */ on the same line
                const afterComment = trimmed.substring(endIdx + 2).trim();
                if (!afterComment) {
                    items.push({ type: 'comment', content: line }); // Keep the original line for display
                    return;
                }
                // Re-parse the remaining content (recursive single-line check)
                line = afterComment;
                trimmed = line.trim(); // Update trimmed for the rest of the parsing
            } else {
                // Still inside block comment, skip this line
                items.push({
                    type: 'comment',
                    content: line
                });
                return;
            }
        }

        // Check for block comment start
        const startIdx = trimmed.indexOf('/*');
        if (startIdx !== -1) {
            // Check if it also ends on the same line
            const endIdx = trimmed.indexOf('*/', startIdx + 2);
            if (endIdx !== -1) {
                // Single line block comment - remove it and continue parsing
                const beforeComment = trimmed.substring(0, startIdx);
                const afterComment = trimmed.substring(endIdx + 2);
                const remaining = (beforeComment + afterComment).trim();
                if (!remaining) {
                    items.push({ type: 'comment', content: line }); // Keep the original line for display
                    return;
                }
                // Continue with remaining content
                line = remaining;
                trimmed = line.trim(); // Update trimmed for the rest of the parsing
            } else {
                // Block comment starts but doesn't end on this line
                inBlockComment = true;
                items.push({
                    type: 'comment',
                    content: line
                });
                return;
            }
        }

        // Skip empty lines after processing
        const processedTrimmed = trimmed; // Use the potentially modified 'trimmed'
        if (!processedTrimmed) {
            return;
        }

        // Comment Check: //
        if (processedTrimmed.startsWith('//')) {
            items.push({
                type: 'comment',
                content: line // keep original line with indentation
            });
            return;
        }

        // Divider Check: <Title, Color>
        if (processedTrimmed.startsWith('<') && processedTrimmed.endsWith('>')) {
            const content = processedTrimmed.substring(1, processedTrimmed.length - 1);
            const parts = content.split(',').map(s => s.trim());
            items.push({
                type: 'divider',
                title: parts[0],
                color: parts[1] || '' // Fallback to auto-assigning later
            });
            return;
        }

        // Chart Check: (url1, title1) pairs OR (url1, url2, ..., title) legacy
        // 괄호 안의 내용을 콤마로 분리
        const contentMatch = processedTrimmed.match(/\((.*)\)/);
        if (contentMatch) {
            // Use smart splitter to handle commas inside quotes
            const rawParts = splitByCommaIgnoringQuotes(contentMatch[1]);
            const parts = rawParts.map(s => {
                return s.trim().replace(/^[ "'“‘”’]+|[ "'“‘”’]+$/g, '');
            });

            if (parts.length >= 2) {
                let series = [];
                let boxTitle = '';
                let urls = [];

                // New Format Check: ("url1", "title1", "url2", "title2")
                // Heuristic: Length is even, and length >= 2.
                // To be safe, we can assume if it's even, it's pairs.
                // Legacy was (u1, u2, title) -> odd (3)
                // Legacy (u1, title) -> even (2). This matches pair (u, t). OK.
                // Legacy (u1, u2, u3, title) -> even (4). Wait.
                // If user does (u1, u2, u3, title), that is 4 parts.
                // Pair logic would see (u1, u2) and (u3, title).
                // This is ambiguous.
                // However, user explicitly requested ("url1","title1","url2","title2") format.
                // Let's check if the odd positions look like titles (not URLs).
                // Hard to distinguish.
                // But standard "title" is usually not a URL.
                // Let's prioritize the new requested format for even lengths > 2.
                // For length 2 (u1, title), it works for both.

                if (parts.length >= 3 && parts.length % 3 === 0 &&
                    (parts[0].includes('http') || parts[0].includes('tradingeconomics'))) {
                    // Assume TRIPLETS: (url, label, duration)
                    for (let i = 0; i < parts.length; i += 3) {
                        series.push({
                            url: parts[i],
                            label: parts[i + 1],
                            duration: parts[i + 2]
                        });
                        // For backward compat urls array, we can just push the url.
                        // However, loadMultiSeriesChart now expects objects if complex.
                        // But let's keep urls as just urls for now, app logic handles seriesConfig.
                        urls.push(parts[i]);
                    }
                    boxTitle = series.map(s => s.label).join(' / ');
                    console.log('[Parse] Detected Triplets:', series);
                } else if (parts.length >= 2 && parts.length % 2 === 0) {
                    // Assume PAIRS
                    for (let i = 0; i < parts.length; i += 2) {
                        series.push({ url: parts[i], label: parts[i + 1] });
                        urls.push(parts[i]);
                    }
                    boxTitle = series.map(s => s.label).join(' / ');
                } else {
                    // Assume Odd -> Legacy (u1, ..., title)
                    boxTitle = parts.pop(); // Last is title
                    urls = parts;
                    series = urls.map(u => ({ url: u, label: '' })); // No explicit labels per series
                }

                items.push({
                    type: 'chart',
                    urls: urls, // Keep for backward compat
                    series: series, // New detailed structure
                    title: boxTitle
                });
            }
        }
    });

    return items;
}

/**
 * 섹터 그룹 편집 리스너 설정
 */
function setupSectorGroupListeners(tabId) {
    const content = document.getElementById(tabId);
    if (!content) return;

    const dividers = content.querySelectorAll('.finviz-divider');
    dividers.forEach(divider => {
        const btn = divider.querySelector('.btn-section-edit');
        const popup = divider.querySelector('.section-edit-popup');
        const titleInput = divider.querySelector('.edit-section-title');
        const swatches = divider.querySelectorAll('.color-swatch');
        const index = parseInt(divider.dataset.index);

        // Toggle popup
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other popups first
            document.querySelectorAll('.section-edit-popup.active').forEach(p => {
                if (p !== popup) p.classList.remove('active');
            });
            popup.classList.toggle('active');
        });

        // Prevent closing when clicking inside the popup (including text selection)
        popup.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Update Title
        titleInput.addEventListener('input', () => {
            const newTitle = titleInput.value.trim() || 'No Title';
            divider.querySelector('.title-text').textContent = newTitle;
            updateConfigString(tabId, index, { title: newTitle });
        });

        // Update Color
        swatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                const newColor = swatch.dataset.color;
                divider.style.setProperty('--section-color', newColor);

                // Update following charts' background
                let next = divider.nextElementSibling;
                while (next && !next.classList.contains('finviz-divider')) {
                    if (next.classList.contains('finviz-chart-box')) {
                        next.style.setProperty('--section-color', newColor);
                        next.style.setProperty('--section-color-alpha', newColor + '22');
                        next.querySelector('.finviz-chart-title').classList.add('colorful');
                    }
                    next = next.nextElementSibling;
                }

                updateConfigString(tabId, index, { color: newColor });
                popup.classList.remove('active');
            });
        });
    });
}

/**
 * 섹션 데이터 변경 시 config 문자열 동기화
 */
function updateConfigString(tabId, index, updates) {
    if (!tabData[tabId] || !tabData[tabId].config) return;

    const items = parseCustomCharts(tabData[tabId].config);
    if (items[index] && items[index].type === 'divider') {
        if (updates.title !== undefined) {
            // If title changed, migrate the color to the new title key if it exists
            const oldTitle = items[index].title;
            const currentColors = tabData[tabId].sectorColors || {};
            if (currentColors[oldTitle]) {
                currentColors[updates.title] = currentColors[oldTitle];
                // Optional: delete currentColors[oldTitle];
            }
            items[index].title = updates.title;
        }
        if (updates.color !== undefined) {
            tabData[tabId].sectorColors = tabData[tabId].sectorColors || {};
            tabData[tabId].sectorColors[items[index].title] = updates.color;
        }
    }

    // JSON-like array objects back to config string (WITHOUT colors, preserving comments)
    const newConfig = items.map(item => {
        if (item.type === 'comment') {
            return item.content;
        } else if (item.type === 'divider') {
            return `<${item.title}>`;
        } else {
            // Reconstruct chart config
            if (item.series && item.series.length > 0 && item.series.some(s => s.label)) {
                // New format: ("url1", "title1", "url2", "title2")
                const inside = item.series.map(s => `"${s.url}", "${s.label}"`).join(', ');
                return `(${inside})`;
            } else {
                // Legacy format
                const urls = item.urls.join(', ');
                return `(${urls}, "${item.title}")`;
            }
        }
    }).join('\n');

    tabData[tabId].config = newConfig;

    // Sync to Modal if open
    const textarea = document.getElementById('customChartInput');
    if (textarea && currentConfigTabId === tabId) {
        textarea.value = newConfig;
    }

    saveAppData(); // Auto-save & Sync

    // Refresh highlight if editor is open
    updateSyntaxHighlighting();
}

/**
 * 탭 내의 모든 캔버스 차트를 캐시된 데이터로 다시 그리기 (서버 요청 없음)
 */
function redrawTabCharts(tabId) {
    const content = document.getElementById(tabId);
    if (!content) return;

    console.log(`🎨 [Redraw] Restoring charts for tab: ${tabId}`);

    // multi-series 차트 복구
    const multiCanvases = content.querySelectorAll('canvas[data-chart-type="multi-series"]');
    multiCanvases.forEach(canvas => {
        if (canvas.chartData && canvas.chartData.allSeries) {
            drawMultiSeriesLineChart(canvas, canvas.chartData.allSeries, canvas.chartData.title);
        }
    });

    // TradingEconomics 단일 차트 복구
    const teCanvases = content.querySelectorAll('canvas[data-chart-type="te-single"]');
    teCanvases.forEach(canvas => {
        if (canvas.chartData && canvas.chartData.data) {
            drawTradingEconomicsLineChart(canvas, canvas.chartData.data, canvas.chartData.title);
        }
    });
}

/**
 * 주석 구문 강조 (녹색 처리) - 라인 주석(//) 및 블록 주석 지원
 */
function updateSyntaxHighlighting() {
    const textarea = document.getElementById('customChartInput');
    const backdrop = document.getElementById('highlightBackdrop');
    if (!textarea || !backdrop) return;

    const text = textarea.value;
    const lines = text.split('\n');
    let inBlockComment = false;

    const highlighted = lines.map(line => {
        const trimmed = line.trim();
        // HTML escape
        const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // If we're inside a block comment
        if (inBlockComment) {
            if (trimmed.includes('*/')) {
                inBlockComment = false;
            }
            return `<span class="syntax-comment">${escaped}</span>`;
        }

        // Check for block comment start
        if (trimmed.includes('/*')) {
            if (!trimmed.includes('*/')) {
                inBlockComment = true;
            }
            return `<span class="syntax-comment">${escaped}</span>`;
        }

        // Line comment check: //
        if (trimmed.startsWith('//')) {
            return `<span class="syntax-comment">${escaped}</span>`;
        }
        return escaped;
    }).join('\n');

    // Add a trailing newline to avoid height mismatch at end of content
    backdrop.innerHTML = highlighted + (text.endsWith('\n') ? '\n ' : '');
}

/**
 * 커스텀 차트 설정 모달 열기
 */
function openCustomChartModal() {
    const modal = document.getElementById('customChartModal');
    if (!modal) return;
    const textarea = document.getElementById('customChartInput');
    if (textarea) {
        if (currentConfigTabId && tabData[currentConfigTabId]) {
            textarea.value = tabData[currentConfigTabId].config || '';
        } else {
            textarea.value = '';
        }
    }
    modal.style.display = 'flex';

    // Auto-focus and highlight
    setTimeout(() => {
        if (textarea) textarea.focus();
        updateSyntaxHighlighting();
    }, 10);
}

/**
 * 해외 커스텀 차트 새로고침
 */
function refreshOverseasCustomCharts(tabId) {
    // alert(`[DEBUG] Refreshing tab: ${tabId}`);
    const content = document.getElementById(tabId);
    if (!content) return;
    const prefix = `overseasCustom_${tabId}`;
    const statusText = document.getElementById(`${prefix}StatusText`);
    const lastUpdate = document.getElementById(`${prefix}LastUpdate`);

    if (statusText) statusText.textContent = '데이터 로딩 중...';

    const images = content.querySelectorAll('.finviz-chart-img');
    const canvases = content.querySelectorAll('.multi-chart-canvas');

    // [DEBUG] Diagnosing counts
    // alert(`[DEBUG] Found ${images.length} images, ${canvases.length} canvases`);

    let loadedCount = 0;
    const totalCount = images.length + canvases.length; // Count both

    if (totalCount === 0) {
        if (statusText) statusText.textContent = '데이터 없음';
        return;
    }

    const checkComplete = () => {
        if (++loadedCount >= totalCount) { // Use >= for safety
            if (statusText) statusText.textContent = '데이터 로딩 완료';
            if (lastUpdate) lastUpdate.textContent = formatTime(new Date());
            setupOverseasCursorSync();
        }
    };

    // 1. Process Images
    if (images.length > 0) {
        images.forEach(img => {
            const proxyUrl = `/api/finviz-image?url=${encodeURIComponent(img.dataset.chartUrl)}&_t=${Date.now()}`;
            img.onload = checkComplete;
            img.onerror = () => {
                console.warn('[RefreshCustom] Image load failed:', img.dataset.chartUrl);
                checkComplete();
            };
            img.src = proxyUrl;
        });
    }

    // 2. Process Canvases (FRED/Multi)
    if (canvases.length > 0) {
        canvases.forEach(canvas => {
            const box = canvas.closest('.multi-chart-box');
            if (box) {
                try {
                    let seriesConfig = [];
                    // Try data-series
                    if (box.dataset.series) {
                        try {
                            seriesConfig = JSON.parse(decodeURIComponent(box.dataset.series));
                        } catch (e) { }
                    }
                    // Fallback data-urls
                    if (seriesConfig.length === 0 && box.dataset.urls) {
                        let rawUrls = box.dataset.urls;
                        try { rawUrls = decodeURIComponent(rawUrls); } catch (e) { }
                        const urls = JSON.parse(rawUrls);
                        // Pass raw array to allow loadMultiSeriesChart to detect flat format
                        seriesConfig = urls;
                    }

                    if (seriesConfig.length > 0) {
                        const title = box.querySelector('.finviz-chart-title')?.textContent || '';
                        loadMultiSeriesChart(canvas, seriesConfig, title).then(checkComplete);
                    } else {
                        checkComplete();
                    }
                } catch (e) {
                    console.error('[RefreshCustom] Canvas data error:', e);
                    checkComplete();
                }
            } else {
                checkComplete();
            }
        });
    }
}

// ==========================================================
// Bulk Settings (Export/Import All Tabs)
// ==========================================================

function setupBulkSettingsHandlers() {
    const bulkUploadBtn = document.getElementById('bulkUpload');
    const bulkDownloadBtn = document.getElementById('bulkDownload');
    const bulkFileInput = document.getElementById('bulkFileInput');

    if (bulkDownloadBtn) {
        bulkDownloadBtn.addEventListener('click', bulkExportSettings);
    }

    if (bulkUploadBtn && bulkFileInput) {
        bulkUploadBtn.addEventListener('click', () => {
            bulkFileInput.value = '';
            bulkFileInput.click();
        });

        bulkFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                bulkImportSettings(file);
            }
        });
    }
}

/**
 * 전용 탭들의 설정을 [탭이름] 섹션으로 구분하여 통합 파일로 내보내기
 */
function bulkExportSettings() {
    let content = "";

    // Find all custom overseas tabs
    const tabButtons = Array.from(document.querySelectorAll('.tab-btn:not(.add-tab-btn)'));
    let hasData = false;

    tabButtons.forEach(btn => {
        const tabId = btn.dataset.tab;
        const type = tabData[tabId]?.type;
        if (tabData[tabId] && (type === 'overseas_custom' || type === 'exchange_rate')) {
            const title = btn.textContent.trim();
            const config = tabData[tabId].config || "";
            const sectorColors = tabData[tabId].sectorColors || {};

            // Add Header
            content += `[${title}]\n`;

            const lines = config.split('\n');
            const exportLines = lines.map(line => {
                const trimmed = line.trim();
                // Check if it's a divider <Title>
                if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
                    const titleMatch = trimmed.match(/^<([^,>]+)(?:,\s*([^>]+))?>$/);
                    if (titleMatch) {
                        const divTitle = titleMatch[1].trim();
                        if (sectorColors[divTitle]) {
                            // Re-append color
                            return `<${divTitle}, ${sectorColors[divTitle]}>`;
                        }
                    }
                }
                return line;
            });

            content += exportLines.join('\n');
            content += "\n\n";
            hasData = true;
        }
    });

    if (!hasData) {
        alert("내보낼 커스텀 탭 설정이 없습니다.");
        return;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_settings_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 통합 파일에서 설정 불러오기
 */
/**
 * 통합 파일에서 설정 불러오기
 */
function bulkImportSettings(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        // Remove BOM if present (Common in Windows Notepad files)
        const text = e.target.result.replace(/^\uFEFF/, '');
        console.log("📂 Bulk Import Started. File content length:", text.length);

        if (!confirm("현재의 모든 커스텀 탭 설정이 덮어씌워지거나 추가됩니다. 계속하시겠습니까?")) {
            return;
        }

        const lines = text.split(/\r?\n/);
        let currentTitle = null;
        let currentConfigLines = [];
        let importCount = 0;

        // Local accumulator for robust saving
        const localImportedData = {};

        // Helper to process a finished section
        const processSection = (title, configLines) => {
            // Handle duplicate names by appending (1), (2), etc.
            let uniqueTitle = title;
            let counter = 1;
            while (true) {
                // Check if this title is already used in this CURRENT import session?
                // Or check global existence?
                // Logic:
                // If it's the FIRST time we see "MyTab" in this session, we can reuse existing "MyTab".
                // If we see "MyTab" AGAIN in this session, we must rename it.

                // However, distinguishing between "reusing existing non-session tab" and "duplicate in file" is hard without a session cache.
                // Let's rely on DOM.

                const existingBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.trim() === uniqueTitle);

                // If no button exists with this name, it's unique!
                if (!existingBtn) break;

                // If button exists:
                // Is it one we JUST created in this session? (Check localImportedData)
                const existingId = existingBtn.dataset.tab;
                if (localImportedData[existingId]) {
                    // YES, we just created/modified this tab in this session.
                    // This means the CURRENT title is a duplicate within the file!
                    // We must rename the CURRENT title.
                    uniqueTitle = `${title} (${counter++})`;
                } else {
                    // NO, this is a pre-existing tab from before import.
                    // We can overwrite/Reuse it.
                    break;
                }
            }

            console.log(`Processing Section: [${uniqueTitle}], Lines: ${configLines.length}`);

            // Detect type from title
            const isExchangeRate = uniqueTitle.includes('환율') || uniqueTitle.includes('금리');
            const targetType = isExchangeRate ? 'exchange_rate' : 'overseas_custom';

            // Check if tab already exists by name (using the unique name)
            let targetTabId = null;
            const existingBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.trim() === uniqueTitle);

            if (existingBtn) {
                targetTabId = existingBtn.dataset.tab;
                // If exists but not a custom tab, skip
                if (!tabData[targetTabId] || (tabData[targetTabId].type !== 'overseas_custom' && tabData[targetTabId].type !== 'exchange_rate')) {
                    console.warn(`Skipping existing non-custom tab: ${uniqueTitle}`);
                    return;
                }
                // Update type if needed
                tabData[targetTabId].type = targetType;
            } else {
                // Create new tab
                const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
                targetTabId = (isExchangeRate ? "tab_exchange_" : "tab_custom_") + uniqueId;

                // Init data
                tabData[targetTabId] = { type: targetType, config: '', sectorColors: {} };
                createTabButtonElement(targetTabId, uniqueTitle);
                createTabContentElement(targetTabId);
                console.log(`Created new tab: ${uniqueTitle} (${targetTabId}) [Type: ${targetType}]`);
            }

            // Parse config & Colors
            const finalLines = [];
            const newColors = tabData[targetTabId].sectorColors || {};

            configLines.forEach(line => {
                const trimmed = line.trim();
                const divMatch = trimmed.match(/^<([^,>]+),\s*([^>]+)>$/);
                if (divMatch) {
                    const divTitle = divMatch[1].trim();
                    const divColor = divMatch[2].trim();
                    newColors[divTitle] = divColor;
                    finalLines.push(`<${divTitle}>`);
                } else {
                    finalLines.push(line);
                }
            });

            tabData[targetTabId].config = finalLines.join('\n');
            tabData[targetTabId].sectorColors = newColors;

            // Also update local accumulator
            localImportedData[targetTabId] = tabData[targetTabId];

            importCount++;
            console.log(`[bulkImport] Processed tab ${targetTabId}. Data keys:`, Object.keys(tabData));
        };

        try {
            // Line-by-line parser
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const trimmed = line.trim();

                // Regex: Allow optional trailing whitespace
                const titleMatch = trimmed.match(/^\[(.*?)\]\s*$/);
                if (titleMatch) {
                    if (currentTitle) {
                        processSection(currentTitle, currentConfigLines);
                    }
                    currentTitle = titleMatch[1].trim();
                    currentConfigLines = [];
                } else {
                    if (currentTitle) {
                        currentConfigLines.push(line);
                    }
                }
            }

            if (currentTitle) {
                processSection(currentTitle, currentConfigLines);
            }

            // DEBUG: Debug Parsed sections
            const foundTitles = Object.keys(localImportedData).map(k => {
                // Find name from button logic?
                // We don't store Name in localImportedData structure?
                // We only stored the data object { type, config ... }
                // We can find the button
                const btn = document.querySelector(`.tab-btn[data-tab="${k}"]`);
                return btn ? btn.textContent : "Unknown";
            });

            console.log("Parsed Titles:", foundTitles);

            if (importCount > 0) {
                // Give DOM a moment to update completely
                await new Promise(r => setTimeout(r, 500));

                console.log("[bulkImport] Pre-save check. Global tabData keys:", Object.keys(tabData));

                // Merge global and local to be 100% sure we have everything
                const mergedData = Object.assign({}, tabData, localImportedData);

                console.log("[bulkImport] Force saving with merged data. Keys:", Object.keys(mergedData));

                if (Object.keys(mergedData).length === 0) {
                    console.error("CRITICAL: mergedData is empty despite importCount > 0!");
                    alert("오류: 데이터 변수가 비어있습니다. 저장이 실패할 수 있습니다.");
                }

                // Force save with explicitly merged data
                await saveAppData(mergedData);

                alert(`${importCount}개의 탭 설정이 성공적으로 로드되었습니다.`);

                // Activate the newly created tab (use the last processed title as best guess)
                if (currentTitle) {
                    const btn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.trim() === currentTitle);
                    if (btn) {
                        activateTab(btn.dataset.tab);
                    }
                }
            } else {
                alert("가져올 설정 데이터가 없거나 형식이 올바르지 않습니다.\n파일 내용을 확인해주세요.");
            }
        } catch (err) {
            console.error(err);
            alert(`[치명적 오류 발생]\n불러오기 중 오류가 발생했습니다.\n${err.message}`);
        }
    };
    reader.readAsText(file);
}


// ==========================================================
// Initialization
// ==========================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('앱 초기화...');

    // Try server sync and localStorage, then compare timestamps
    const serverData = await loadAppDataFromServer();
    const localData = loadFromLocalStorage();

    let finalData = null;
    if (serverData && localData) {
        const serverTime = serverData.updatedAt || 0;
        const localTime = localData.updatedAt || 0;
        console.log(`⏱️ 데이터 시점 비교 - Server: ${new Date(serverTime).toLocaleString()}, Local: ${new Date(localTime).toLocaleString()}`);
        finalData = serverTime >= localTime ? serverData : localData;
    } else {
        finalData = serverData || localData;
    }

    if (finalData) {
        applyData(finalData);
        // If local was newer than server, or server was missing, force sync this local content to server
        if (finalData === localData) {
            console.log("📡 로컬 데이터가 최신입니다. 서버에 백업합니다.");
            setTimeout(() => saveAppData(), 5000); // 5s delay to ensure full load
        }
    } else {
        ensurePermanentTabs();
        activateTab(PERM_TAB_ID);
    }

    loadData();
    loadTransactionRank();
    startAutoRefresh();
    setupBulkSettingsHandlers();

    // Global listener for closing sector popups (Improved to handle text selection)
    let isSectorPopupClick = false;
    document.addEventListener('mousedown', (e) => {
        isSectorPopupClick = !!e.target.closest('.divider-controls');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.divider-controls') && !isSectorPopupClick) {
            document.querySelectorAll('.section-edit-popup.active').forEach(p => {
                p.classList.remove('active');
            });
        }
    });

    if (mrktTpSelect) mrktTpSelect.addEventListener('change', loadTransactionRank);
    if (stexTpSelect) stexTpSelect.addEventListener('change', loadTransactionRank);

    // --- Custom Chart Modal Handlers ---
    const modal = document.getElementById('customChartModal');
    if (modal) {
        const saveBtn = document.getElementById('saveCustomCharts');
        const cancelBtn = document.getElementById('cancelCustomCharts');
        const closeX = modal.querySelector('.close-modal');

        const closeModal = () => { modal.style.display = 'none'; };

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const textarea = document.getElementById('customChartInput');
                const input = textarea ? textarea.value : '';

                if (currentConfigTabId && tabData[currentConfigTabId]) {
                    tabData[currentConfigTabId].config = input;
                    saveAppData();
                }
                console.log('[Modal] Saved custom charts for:', currentConfigTabId);

                const content = document.getElementById(currentConfigTabId);
                if (content && content.classList.contains('active')) {
                    content.innerHTML = createChartGrid(currentConfigTabId);

                    const type = tabData[currentConfigTabId]?.type;
                    if (type === 'exchange_rate') {
                        refreshExchangeRateCharts(currentConfigTabId);
                    } else {
                        refreshOverseasCustomCharts(currentConfigTabId);
                    }

                    // Re-setup listeners for dividers
                    if (type === 'overseas_custom' || type === 'exchange_rate') {
                        setupSectorGroupListeners(currentConfigTabId);
                    }
                }
                closeModal();
            });
        }
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        if (closeX) closeX.addEventListener('click', closeModal);

        // Improved click-outside logic: only close if both mousedown and click targets are the modal backdrop
        let isBackdropClick = false;
        modal.addEventListener('mousedown', (e) => {
            isBackdropClick = (e.target === modal);
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal && isBackdropClick) closeModal();
        });

        // Add input & scroll listener for syntax highlighting
        const textarea = document.getElementById('customChartInput');
        const backdrop = document.getElementById('highlightBackdrop');
        if (textarea && backdrop) {
            textarea.addEventListener('input', updateSyntaxHighlighting);
            textarea.addEventListener('scroll', () => {
                backdrop.scrollTop = textarea.scrollTop;
                backdrop.scrollLeft = textarea.scrollLeft;
            });
        }

        // --- Config Download Handler ---
        const downloadBtn = document.getElementById('downloadConfig');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                const text = textarea ? textarea.value : '';
                if (!text.trim()) {
                    alert('다운로드할 내용이 없습니다.');
                    return;
                }

                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');

                // Use current tab name or generic filename
                const tabBtn = document.querySelector(`.tab-btn[data-tab="${currentConfigTabId}"]`);
                const filename = (tabBtn ? tabBtn.textContent.trim() : 'overseas_config') + '.txt';

                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        }

        // --- Config Upload Handler ---
        const uploadBtn = document.getElementById('uploadConfig');
        const fileInput = document.getElementById('configFileInput');
        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.value = ''; // Reset to allow re-upload of same file
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    const content = event.target.result;
                    if (textarea) {
                        textarea.value = content;
                        updateSyntaxHighlighting();
                    }
                };
                reader.readAsText(file);
            });
        }
    }
});

/**
 * ===== QUILL MEMO EDITOR INITIALIZATION =====
 */
let quillEditor = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Quill Editor
    setTimeout(() => {
        if (document.getElementById('quillEditor')) {
            quillEditor = new Quill('#quillEditor', {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        ['blockquote', 'code-block'],
                        [{ 'header': 1 }, { 'header': 2 }],
                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                        ['link', 'image'],
                        ['clean']
                    ]
                },
                placeholder: '메모를 작성하세요. 이미지도 붙여넣기로 추가 가능합니다.'
            });

            // Load saved memo
            loadMemo();

            // Save memo on input (debounced)
            let saveTimeout;
            quillEditor.on('text-change', () => {
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(saveMemoAuto, 1000);
            });

            // Memo Save Button
            const memoSaveBtn = document.getElementById('memoSaveBtn');
            if (memoSaveBtn) {
                memoSaveBtn.addEventListener('click', () => {
                    saveMemo();
                });
            }


            // Memo Tab Button delegation (since button is dynamic)
            document.addEventListener('click', (e) => {
                const btn = e.target.closest(`.tab-btn[data-tab="${MEMO_TAB_ID}"]`);
                if (btn) {
                    activateTab(MEMO_TAB_ID);
                }
            });

            // Logout Button
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    if (confirm('로그아웃 하시겠습니까?')) {
                        localStorage.removeItem('user_session');
                        location.reload();
                    }
                });
            }

            // Sync Calendar Button
            const syncCalBtn = document.getElementById('syncCalBtn');
            if (syncCalBtn) {
                syncCalBtn.addEventListener('click', () => {
                    requestCalendarAccess(() => {
                        if (calendar) calendar.refetchEvents();
                    });
                });
            }

            // Event Modal Buttons
            const saveEventBtn = document.getElementById('saveEvent');
            if (saveEventBtn) saveEventBtn.addEventListener('click', saveGoogleEvent);

            const cancelEventBtn = document.getElementById('cancelEvent');
            if (cancelEventBtn) cancelEventBtn.addEventListener('click', closeEventModal);

            const closeEventModalX = document.getElementById('closeEventModal');
            if (closeEventModalX) closeEventModalX.addEventListener('click', closeEventModal);

            const allDayCheck = document.getElementById('eventAllDay');
            if (allDayCheck) {
                allDayCheck.addEventListener('change', (e) => {
                    document.getElementById('eventStartTime').disabled = e.target.checked;
                });
            }
        }
    }, 500);
});

function saveMemo() {
    if (!quillEditor) return;
    const content = quillEditor.getContents();
    const html = quillEditor.root.innerHTML;

    localStorage.setItem('memoContent_html', html);
    localStorage.setItem('memoContent_delta', JSON.stringify(content));

    const status = document.getElementById('memoStatus');
    if (status) {
        status.textContent = '✅ 저장됨 (서버 동기화 중...)';
        setTimeout(() => {
            status.textContent = '';
        }, 2000);
    }

    console.log('💾 메모 로컬 저장 완료 -> 서버 동기화 시작');
    saveAppData(); // Trigger server sync
}

function saveMemoAuto() {
    saveMemo();
}

function loadMemo() {
    if (!quillEditor) return;

    const savedDelta = localStorage.getItem('memoContent_delta');
    const savedHtml = localStorage.getItem('memoContent_html');

    if (savedDelta) {
        try {
            const delta = JSON.parse(savedDelta);
            quillEditor.setContents(delta);
        } catch (e) {
            if (savedHtml) {
                quillEditor.root.innerHTML = savedHtml;
            }
        }
    }

    console.log('📖 메모 로드됨');
}

