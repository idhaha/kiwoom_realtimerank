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
const statusBadge = document.getElementById('statusBadge');
const statusText = document.getElementById('statusText');
const autoRefreshCheckbox = document.getElementById('autoRefresh');
const manualRefreshBtn = document.getElementById('manualRefresh');

let autoRefreshInterval = null;

/**
 * 상태 업데이트
 */
function updateStatus(status, message) {
    statusBadge.className = `status-badge ${status}`;
    statusText.textContent = message;
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
    // API 응답 구조에 따라 데이터 경로 조정 필요
    // 현재는 가상의 데이터 구조를 가정
    const stocks = data.output || data.data || [];

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

    tableBody.innerHTML = stocks.map((stock, index) => `
        <tr class="fade-in">
            <td>${index + 1}</td>
            <td>${stock.code || stock.stock_code || '-'}</td>
            <td style="font-weight: 600; color: var(--text-primary);">
                ${stock.name || stock.stock_name || '-'}
            </td>
            <td>${stock.price ? formatNumber(stock.price) : '-'}</td>
            <td class="${getPriceClass(stock.change_rate || stock.rate)}">
                ${formatChangeRate(stock.change_rate || stock.rate || 0)}
            </td>
            <td>${stock.volume ? formatNumber(stock.volume) : '-'}</td>
        </tr>
    `).join('');
}

/**
 * 데이터 로딩
 */
async function loadData() {
    try {
        // UI 상태 업데이트
        loadingIndicator.style.display = 'block';
        errorMessage.style.display = 'none';
        dataContainer.style.display = 'none';
        updateStatus('loading', '데이터 로딩 중...');

        // API 호출
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || '알 수 없는 오류가 발생했습니다');
        }

        // 데이터 렌더링
        renderTable(result.data);

        // UI 상태 업데이트
        loadingIndicator.style.display = 'none';
        dataContainer.style.display = 'block';
        lastUpdate.textContent = formatTime(new Date());
        updateStatus('success', '데이터 로딩 완료');

    } catch (error) {
        console.error('데이터 로딩 실패:', error);

        // 에러 표시
        loadingIndicator.style.display = 'none';
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

    autoRefreshInterval = setInterval(() => {
        console.log('자동 새로고침 실행...');
        loadData();
    }, 30000); // 30초마다
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
autoRefreshCheckbox.addEventListener('change', (e) => {
    if (e.target.checked) {
        console.log('자동 새로고침 활성화');
        startAutoRefresh();
    } else {
        console.log('자동 새로고침 비활성화');
        stopAutoRefresh();
    }
});

manualRefreshBtn.addEventListener('click', () => {
    console.log('수동 새로고침 실행');
    loadData();
});

/**
 * 초기화
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('앱 초기화...');

    // 초기 데이터 로드
    loadData();

    // 자동 새로고침 시작
    if (autoRefreshCheckbox.checked) {
        startAutoRefresh();
    }
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
