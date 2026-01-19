window.onerror = function (msg, url, line, col, error) {
    alert("⚠️ 자바스크립트 에러 발생:\n" + msg + "\n위치: " + line + ":" + col);
    return false;
};

const API_URL = '/api/stock';

// --- Tab & State Constants ---
const STORAGE_KEY = 'MultiChart_State_v1';
const PERM_TAB_ID = 'tab_rank';
const ADR_TAB_ID = 'tab_adr';
let tabData = {};
let targetTabBtn = null;

// DOM Elements
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const dataContainer = document.getElementById('dataContainer');
const tableBody = document.getElementById('tableBody');
const lastUpdate = document.getElementById('lastUpdate');
const statusText = document.getElementById('statusText');
const refreshIntervalSelect = document.getElementById('refreshInterval');
const manualRefreshBtn = document.getElementById('manualRefresh');

const transactionBody = document.getElementById('transactionBody');
const mrktTpSelect = document.getElementById('mrktTp');
const stexTpSelect = document.getElementById('stexTp');

// --- Tab DOM Elements ---
const tabContainer = document.getElementById("tabContainer");
const tabContents = document.getElementById("tabContents");
const addTabBtn = document.getElementById("addTabBtn");
const captureBtn = document.getElementById("captureBtn");
const contextMenu = document.getElementById("contextMenu");

let autoRefreshInterval = null;
let adrAutoRefreshInterval = null;
let lastSavedSettings = { rankInterval: '5', adrInterval: '5' };

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
    return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
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
    if (loadingIndicator && loadingIndicator.style.display === 'flex') return;

    try {
        if (loadingIndicator) loadingIndicator.style.display = 'flex';

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

        if (errorMessage) errorMessage.style.display = 'flex';
        if (errorText) errorText.textContent = error.message;
        updateStatus('error', '데이터 로딩 실패');
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
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
}

function saveAppData() {
    const activeContent = document.querySelector('.tab-content.active');
    if (activeContent && activeContent.id !== PERM_TAB_ID && activeContent.id !== ADR_TAB_ID) {
        saveTabState(activeContent.id);
    }

    const tabs = [];
    document.querySelectorAll('.tab-btn:not(.add-tab-btn)').forEach(btn => {
        tabs.push({ id: btn.dataset.tab, name: btn.textContent });
    });

    const activeTabId = activeContent ? activeContent.id : (tabs.length > 0 ? tabs[0].id : PERM_TAB_ID);

    const storageData = {
        activeTabId: activeTabId,
        tabs: tabs,
        contents: tabData,
        rankInterval: refreshIntervalSelect.value,
        adrInterval: document.getElementById('adrRefreshInterval')?.value
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    console.log("💾 데이터 저장 완료:", storageData);
}

function saveTabState(tabId) {
    const content = document.getElementById(tabId);
    if (!content || tabId === PERM_TAB_ID || tabId === ADR_TAB_ID) return;

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
    if (!raw) return false;
    try {
        const data = JSON.parse(raw);
        if (!data.tabs || data.tabs.length === 0) return false;
        applyData(data);
        return true;
    } catch (e) {
        console.error("로컬 스토리지 로딩 실패:", e);
        return false;
    }
}

function applyData(data) {
    resetDynamicTabs();
    tabData = data.contents || {};
    ensurePermanentTabs();

    data.tabs.forEach(t => {
        if (t.id === PERM_TAB_ID || t.id === ADR_TAB_ID) {
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
    }
    if (data.adrInterval) {
        lastSavedSettings.adrInterval = data.adrInterval;
    }

    const targetId = (data.activeTabId && document.getElementById(data.activeTabId)) ? data.activeTabId : PERM_TAB_ID;
    activateTab(targetId);
}

function resetDynamicTabs() {
    document.querySelectorAll('.tab-btn:not(.add-tab-btn):not([data-perm])').forEach(b => b.remove());
    document.querySelectorAll('.tab-content:not(#tab_rank):not(#tab_adr)').forEach(c => c.remove());
}

function activateTab(tabId) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const content = document.getElementById(tabId);
    if (!btn || !content) return;

    document.querySelectorAll(".tab-content.active").forEach(tab => {
        if (tab.id !== tabId) {
            if (tab.id !== PERM_TAB_ID && tab.id !== ADR_TAB_ID) {
                saveTabState(tab.id);
                tab.innerHTML = '';
            }
            if (tab.id === ADR_TAB_ID) {
                stopAdrAutoRefresh();
            }
            tab.classList.remove("active");
        }
    });

    document.querySelectorAll(".tab-btn.active").forEach(b => {
        if (b.dataset.tab !== tabId) b.classList.remove("active");
    });

    btn.classList.add("active");
    content.classList.add("active");

    if (tabId === ADR_TAB_ID && !content.innerHTML.trim()) {
        content.innerHTML = createChartGrid(tabId);
        // Restore ADR interval setting
        const adrSelect = document.getElementById('adrRefreshInterval');
        if (adrSelect && lastSavedSettings.adrInterval) {
            adrSelect.value = lastSavedSettings.adrInterval;
        }
        setTimeout(() => {
            updateAdrFromSource();
            startAdrAutoRefresh(); // Start auto refresh
        }, 100);
    }
    else if (tabId === ADR_TAB_ID) {
        // If already rendered, ensure refresh starts
        const adrSelect = document.getElementById('adrRefreshInterval');
        if (adrSelect && lastSavedSettings.adrInterval) {
            adrSelect.value = lastSavedSettings.adrInterval;
        }
        startAdrAutoRefresh();
    }
    else if (tabId !== PERM_TAB_ID && tabId !== ADR_TAB_ID && !content.innerHTML.trim()) {
        content.innerHTML = createChartGrid(tabId);
        loadChartsSequentially(content);
    }

    saveAppData();
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
    // ADR 전용 그리드
    if (tabId === ADR_TAB_ID) {
        return `
            <div class="container" style="height: 100%; display: flex; flex-direction: column;">
                <header>
                    <div class="header-single-line">
                        <h1><strong>ADR Chart</strong></h1>
                        <div class="header-controls">
                            <!-- Period Selectors (Moved here or kept below? User said "Update button to top right", imply header controls) -->
                            <!-- Let's keep period selectors near charts for context, or move global? 
                                 The user said "Rank tab style update button", so main header has refresh. 
                                 Charts have their own period selectors. -->
                            
                            <div class="refresh-control">
                                <select id="adrRefreshInterval" class="interval-select">
                                    <option value="5" data-interval="30000" selected>30초 간격</option>
                                    <option value="1" data-interval="60000">1분 간격</option>
                                    <option value="2" data-interval="600000">10분 간격</option>
                                    <option value="3" data-interval="3600000">1시간 간격</option>
                                    <option value="4" data-interval="30000">당일누적</option>
                                </select>
                            </div>
                            <button id="adrManualRefresh" class="btn-refresh adr-update-btn" aria-label="조회">
                                조회
                            </button>
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
                        <div class="adr-chart-header">
                            <h3>K</h3>
                        </div>
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
                        <div class="adr-chart-header">
                            <h3>Q</h3>
                        </div>
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
    if (loadingIndicator) loadingIndicator.style.display = 'flex';

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
            alert('데이터를 파싱할 수 없습니다. ADR 정보 사이트의 구조가 이전과 다를 수 있습니다.');
        }
    } catch (e) {
        console.error('❌ [ADR] 업데이트 실패:', e);
        if (adrStatusTextElem) adrStatusTextElem.textContent = "업데이트 실패";
        alert('ADR 업데이트 실패: ' + e.message);
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
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
        ctx.fillStyle = '#339af0';
        ctx.beginPath();
        ctx.arc(lastP.x, lastP.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke(); // white border 2px
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

contextMenu.addEventListener("click", () => {
    if (!targetTabBtn || targetTabBtn.dataset.perm) { contextMenu.style.display = "none"; targetTabBtn = null; return; }
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

addTabBtn.addEventListener("click", () => {
    const uniqueId = Date.now();
    const newTabId = "tab_" + uniqueId;
    const tabCount = document.querySelectorAll(".tab-btn:not(.add-tab-btn)").length + 1;
    createTabButtonElement(newTabId, "탭 " + tabCount);
    createTabContentElement(newTabId);
    activateTab(newTabId);
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
// Initialization
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('앱 초기화...');

    const loaded = loadFromLocalStorage();
    ensurePermanentTabs();

    if (!loaded || !document.querySelector('.tab-content.active')) {
        activateTab(PERM_TAB_ID);
    }

    loadData();
    loadTransactionRank();
    startAutoRefresh();

    if (mrktTpSelect) mrktTpSelect.addEventListener('change', loadTransactionRank);
    if (stexTpSelect) stexTpSelect.addEventListener('change', loadTransactionRank);
});
