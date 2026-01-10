// Firebase Functions URL - 배포 후 실제 URL로 변경 필요
// 로컬 테스트: http://localhost:5001/realtimerank/us-central1/getStockRanking
// 배포 후: https://us-central1-realtimerank.cloudfunctions.net/getStockRanking
const API_URL = '/api/stock';

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

// Transaction Rank Elements
const mrktTpSelect = document.getElementById('mrktTp');
const stexTpSelect = document.getElementById('stexTp');
const transactionBody = document.getElementById('transactionBody');

let autoRefreshInterval = null;

/**
 * 상태 업데이트
 */
function updateStatus(status, message, data = {}) {
    // 텍스트만 업데이트 (스타일은 footer 폰트 그대로 유지)
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
    // 서버에서 보낸 data 자체가 배열이거나, data.data 혹은 data.output 인지 확인
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
        // 거래대금 (api에서 백만원 단위로 오므로 그대로 사용)
        let trdeAmtRaw = stock.trde_amt ? String(stock.trde_amt).replace(/[+,-]/g, '') : '0';
        let trdeAmtNum = parseInt(trdeAmtRaw) || 0;
        // 기존 억단위 변환(/100) 제거 -> 백만 단위 그대로 사용
        const trdeAmtMillion = trdeAmtNum;

        // 시장 구분 표시 (K: 코스피, Q: 코스닥)
        const cleanCd = (stock.stk_cd || "").replace(/[^0-9a-zA-Z]/g, '');
        // 시장 구분 표시 (K: 코스피, Q: 코스닥)
        const marketLabel = stock.mkt_type || '-';

        return `
            <tr class="fade-in">
                <td class="align-right">${stock.bigd_rank || (index + 1)}</td>
                <td class="market-type">${marketLabel}</td>
                <td>
                    ${stock.stk_nm || '-'}
                </td>
                <td class="align-right ${getPriceClass(changeRate)}">
                    ${formatChangeRate(changeRate)}
                </td>
                <td class="align-right">${formatNumber(trdeAmtMillion)}</td>
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
    console.log("DEBUG: loadTransactionRank CALLED"); // Added debug log

    try {
        const response = await fetch(`/api/transaction_rank?mrkt_tp=${mrktTp}&stex_tp=${stexTp}`);
        const result = await response.json();

        console.log("Transaction Rank Raw Result:", result); // [Debug]

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
                // 가정: 원 단위일 경우 백만으로 나눔 (API 확인 필요)
                // 만약 값이 너무 크면(1억 이상) 원단위로 추정.
                const trdeAmtMillion = (trdeAmtNum > 100000000) ? Math.round(trdeAmtNum / 1000000) : trdeAmtNum;

                const marketLabel = stock.mkt_type || '-';

                return `
                    <tr class="fade-in">
                        <td class="align-right">${stock.rank || (index + 1)}</td>
                        <td class="market-type">${marketLabel}</td>
                        <td>${stock.stk_nm || stock.isu_nm || '-'}</td>
                        <td class="align-right ${getPriceClass(changeRate)}">
                            ${formatChangeRate(changeRate)}
                        </td>
                        <td class="align-right">${formatNumber(trdeAmtMillion)}</td>
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
 * 데이터 로딩
 */
async function loadData() {
    console.log(`Fetching data from: ${API_URL}`);
    try {
        // UI 상태 업데이트
        errorMessage.style.display = 'none';
        // dataContainer.style.display = 'none'; // Keep showing old data while loading
        updateStatus('loading', '데이터 로딩 중...');

        // 현재 선택된 qry_tp 값 가져오기
        const selectedOption = refreshIntervalSelect.options[refreshIntervalSelect.selectedIndex];
        const qryTp = selectedOption.value;

        // API 호출 (qry_tp 파라미터 추가)
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
                // JSON 파싱 실패하면 기본 에러 메시지 유지
            }
            throw new Error(errorMessageText);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || '알 수 없는 오류가 발생했습니다');
        }

        // 데이터 렌더링
        renderTable(result.data);

        // UI 상태 업데이트
        dataContainer.style.display = 'block';
        lastUpdate.textContent = formatTime(new Date());
        updateStatus('success', '데이터 로딩 완료');

    } catch (error) {
        console.error('데이터 로딩 실패:', error);

        // 에러 표시
        errorMessage.style.display = 'flex';
        errorText.textContent = error.message;
        updateStatus('error', '데이터 로딩 실패');
    }
}

/**
 * 자동 새로고침 시작
 */
function startAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }

    const selectedOption = refreshIntervalSelect.options[refreshIntervalSelect.selectedIndex];
    const intervalMs = parseInt(selectedOption.dataset.interval) || 30000;

    console.log(`자동 새로고침 시작 (간격: ${intervalMs}ms, qry_tp: ${selectedOption.value})`);

    autoRefreshInterval = setInterval(() => {
        console.log('자동 새로고침 실행...');
        loadData();
        loadTransactionRank();
    }, intervalMs);
}

/**
 * 자동 새로고침 중지
 */
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

/**
 * 이벤트 리스너
 */
refreshIntervalSelect.addEventListener('change', (e) => {
    console.log('새로고침 설정 변경');
    // 설정 변경 시 즉시 데이터 로드 및 타이머 재설정
    loadData();
    startAutoRefresh();
});

manualRefreshBtn.addEventListener('click', () => {
    console.log('수동 새로고침 실행');
    loadData();
    loadTransactionRank();
});

// New Filter Listeners
mrktTpSelect.addEventListener('change', loadTransactionRank);
stexTpSelect.addEventListener('change', loadTransactionRank);

/**
 * 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('앱 초기화...');
    // alert("App Initialized! Check Console for Logs."); // User can see this immediately

    // 초기 데이터 로드
    loadData();
    loadTransactionRank(); // Added missing call

    // 자동 새로고침 시작 (기본값으로 시작)
    startAutoRefresh();
});

// New Filter Listeners
mrktTpSelect.addEventListener('change', loadTransactionRank);
stexTpSelect.addEventListener('change', loadTransactionRank);

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
