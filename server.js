require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// 전역 시장구분 캐시 (종목코드: 'K'/'Q') - 429 에러 방지용
const marketCache = {};

// 디버그 로그 파일 설정
const LOG_FILE = path.join(__dirname, 'server_debug.log');

function fileLog(message) {
    // 이제 모든 콘솔 출력은 런처(메인 프로세스)에서 가로채서 'launcher_debug.log'에 통합 저장합니다.
    // 서버 자체에서의 중복 파일 쓰기는 제거합니다.
    console.log(message);
}

const app = express();
const PORT = process.env.PORT || 3000;
const SERVER_START_TIME = new Date().toLocaleString();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 모든 요청 로그 출력 (매우 잘 보이게)
app.use((req, res, next) => {
    console.log("=========================================");
    console.log(`[${new Date().toLocaleTimeString()}] 요청 발생: ${req.method} ${req.url}`);
    next();
});

// 1. API 경로를 static 보다 먼저 정의 (우선순위 확보)
app.get('/ping', (req, res) => {
    res.send(`pong (Server Start: ${SERVER_START_TIME})`);
});

/**
 * 실시간 종목 순위 API 엔드포인트
 */
app.get('/api/stock', async (req, res) => {
    console.log("🚀 [API START] /api/stock 요청 처리 시작");

    // 환경변수에서 다시 가져오기 (매 요청마다 최신값 확인용)
    const appKey = (process.env.KIWOOM_APPKEY || "").trim();
    const secretKey = (process.env.KIWOOM_SECRETKEY || "").trim();

    try {
        if (!appKey || !secretKey) {
            console.error("❌ 에러: API 키가 없습니다.");
            return res.status(500).json({
                error: "API 키가 설정되지 않았습니다. .env 파일을 확인해주세요.",
            });
        }

        // 1. Access Token 발급
        fileLog("Step 1: 토큰 발급 시도...");
        let accessToken = null;
        try {
            accessToken = await getAccessToken(appKey, secretKey);
            console.log("✅ 토큰 발급 성공");
        } catch (tokenError) {
            console.error("❌ 토큰 발급 실패:", tokenError.message);
            return res.status(500).json({
                success: false,
                error: tokenError.message,
                phase: "token_issuance"
            });
        }

        // 2. 실시간종목조회순위 API 호출 (전체 순위를 먼저 가져옴)
        console.log("Step 2: 전체 종목 순위(Global Rank) 조회 중...");

        // 클라이언트에서 요청한 qry_tp 사용 (기본값: '1' - 1분 간격)
        // 1:1분, 2:10분, 3:1시간, 4:당일누적, 5:30초
        const qryTp = req.query.qry_tp || "1";

        const totalResp = await axios.post(
            "https://api.kiwoom.com/api/dostk/stkinfo",
            {
                "qry_tp": qryTp,
                "mrkt_tp": "000", // 전체
                "sort_tp": "1",
                "trde_qty_tp": "0000",
                "stk_cnd": "0",
                "crd_cnd": "0",
                "stex_tp": "1"
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                    "api-id": "ka00198",
                },
                timeout: 5000
            }
        );
        const stocks = totalResp.data.item_inq_rank || [];

        // 3. (삭제됨) 코스닥 상위 리스트 확보 로직 제거
        // 사용자가 marketName 기반 판별을 원함. 아래 loop 내부에서 ka10100 결과를 사용.

        console.log(`📊 수신된 전체 종목: ${stocks.length}개`);
        if (stocks.length > 0) {
            console.log("Ranking Item Sample (Global #1):", JSON.stringify(stocks[0], null, 2));
        }

        // ka10007 (시세표성정보요청) API를 사용하여 정확한 당일 누적 거래대금(trde_prica)을 가져옴
        console.log("Step 4: 종목별 상세 거래대금(ka10007) 조회 및 시장별 보정 시작...");
        const enrichedStocks = [];

        const chunkSize = 3; // 속도 향상을 위해 2 -> 5로 상향
        for (let i = 0; i < stocks.length; i += chunkSize) {
            const chunk = stocks.slice(i, i + chunkSize);
            console.log(`Processing chunk ${i / chunkSize + 1} / ${Math.ceil(stocks.length / chunkSize)}...`);

            const chunkPromises = chunk.map(async (stock) => {
                const cleanCd = (stock.stk_cd || "").replace(/[^0-9a-zA-Z]/g, '');
                let marketType = 'Q'; // 기본값 코스닥(Q) - ka10100 실패 시 안전망
                let trdeAmtMillion = 0;
                let marketName = "Unknown";

                try {
                    // 0. 이름 기반 필터링 (최우선 및 비용 없음)
                    const isEtfName = (stock.stk_nm || "").startsWith("KODEX") || (stock.stk_nm || "").startsWith("TIGER");
                    if (isEtfName) {
                        return null;
                    }

                    // 1. 주식기본정보요청 (ka10100) - 시장구분 (marketName)
                    if (marketCache[stock.stk_cd]) {
                        const cached = marketCache[stock.stk_cd];
                        // 시장코드 필터링 (0, 10만 허용)
                        if (!['0', '10'].includes(String(cached.code))) {
                            return null;
                        }
                        marketType = cached.type;
                    } else {
                        try {
                            const basicInfoResponse = await axios.post(
                                "https://api.kiwoom.com/api/dostk/stkinfo",
                                { "stk_cd": stock.stk_cd },
                                {
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${accessToken}`,
                                        "api-id": "ka10100",
                                    },
                                    timeout: 3000
                                }
                            );
                            const basicInfo = basicInfoResponse.data;
                            const mktCode = String(basicInfo.marketCode || "");
                            marketName = basicInfo.marketName || "";

                            // marketCode 필터링 (0:KOSPI, 10:KOSDAQ)
                            if (!['0', '10'].includes(mktCode)) {
                                fileLog(`[Filter] Excluding ${stock.stk_nm} (${stock.stk_cd}) - marketCode: ${mktCode}`);
                                marketCache[stock.stk_cd] = { type: '?', code: mktCode };
                                return null;
                            }

                            if (marketName && (marketName.includes("거래소") || marketName === "KOSPI")) {
                                marketType = 'K';
                            }
                            marketCache[stock.stk_cd] = { type: marketType, code: mktCode };
                        } catch (e) {
                            fileLog(`[Warning] ka10100 failed for ${stock.stk_nm}: ${e.message}`);
                        }
                    }

                    // 2. 종목별상세거래대금 (ka10007)
                    try {
                        const detailResponse = await axios.post(
                            "https://api.kiwoom.com/api/dostk/mrkcond",
                            { "stk_cd": `${stock.stk_cd}_AL` },
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${accessToken}`,
                                    "api-id": "ka10007",
                                },
                                timeout: 3000
                            }
                        );
                        const detail = detailResponse.data;
                        trdeAmtMillion = parseInt(detail.trde_prica) || 0;
                    } catch (e) {
                        // ignore
                    }

                    return {
                        ...stock,
                        mkt_type: marketType, // Explicit market type from ka10100
                        trde_amt: trdeAmtMillion // 기존 로직 호환 (클라이언트가 /100 할수도, 확인 필요. 일단 ka10007은 백만단위 trde_prica 리턴함. 클라이언트에서 그대로 쓰도록 수정했으니 여기선 *100 안하고 그대로 줘야함? 아님 클라이언트가 백만단위 기대?)
                        // [Fix] 클라이언트 renderTable: const trdeAmtMillion = trdeAmtNum; (백만단위 그대로 사용)
                        // ka10007 trde_prica: "누적거래대금(백만)"
                        // 따라서 여기서 백만 단위 그대로 리턴.
                        // 하지만 기존 코드: `trde_amt` field used. `stock` object has `trde_amt`.
                        // We are overriding it. Let's just return trdeAmtMillion.
                    };
                } catch (err) {
                    return stock;
                }
            });

            const processed = await Promise.all(chunkPromises);
            // null(필터링된 항목) 제외하고 추가
            processed.filter(p => p !== null).forEach(p => {
                enrichedStocks.push(p);
            });

            // ... delay ...


            // API 부하 조절을 위한 대기 시간 단축 (500ms -> 200ms)
            await new Promise(resolve => setTimeout(resolve, 400));
        }

        console.log("Step 5: 데이터 보정 및 병합 완료");
        res.json({
            success: true,
            data: enrichedStocks,
            server_time: new Date().toISOString(),
            start_time: SERVER_START_TIME
        });

    } catch (error) {
        const errorData = error.response?.data;
        console.error("❌ 최종 에러 발생:", errorData || error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            details: errorData || null,
            phase: "data_fetching"
        });
    }
});

/**
 * 전일동시간대비 거래대금상위(ka10032) API 엔드포인트
 */
app.get('/api/transaction_rank', async (req, res) => {
    console.log("🚀 [API START] /api/transaction_rank 요청 처리 시작");

    const appKey = (process.env.KIWOOM_APPKEY || "").trim();
    const secretKey = (process.env.KIWOOM_SECRETKEY || "").trim();

    // 파라미터 추출 (기본값 설정)
    const mrkt_tp = req.query.mrkt_tp || "000"; // 000:전체, 001:코스피, 101:코스닥
    const stex_tp = req.query.stex_tp || "3";   // 1:KRX, 2:NXT, 3:통합

    try {
        if (!appKey || !secretKey) {
            return res.status(500).json({ error: "API 키 설정 필요" });
        }

        let accessToken = await getAccessToken(appKey, secretKey);

        console.log(`Step 2: 거래대금상위 조회 (mrkt_tp=${mrkt_tp}, stex_tp=${stex_tp})...`);
        const response = await axios.post(
            "https://api.kiwoom.com/api/dostk/rkinfo", // Correct URI for ka10032 based on user input
            {
                "mrkt_tp": mrkt_tp,
                "stex_tp": stex_tp,
                "mang_stk_incls": "0", // 고정값
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                    "api-id": "ka10032",
                },
                timeout: 5000
            }
        );

        // ka10032 returns data in 'trde_prica_upper'
        const rawItems = response.data.trde_prica_upper || response.data.output || [];

        // Market Enrichment
        console.log(`Step 3: 거래대금상위 시장구분(ka10100) 보정 시작 (${rawItems.length}개)...`);
        const enrichedItems = [];
        const chunkSize = 5; // 2 -> 5로 상향

        for (let i = 0; i < rawItems.length; i += chunkSize) {
            const chunk = rawItems.slice(i, i + chunkSize);
            const chunkPromises = chunk.map(async (item) => {
                let marketType = (mrkt_tp === "001") ? 'K' : (mrkt_tp === "101" ? 'Q' : 'Q'); // Default if 'All'
                const stockCode = (item.stk_cd || "").replace(/_AL$/, "");

                try {
                    // 0. 이름 기반 필터링 (최우선)
                    const isEtfName = (item.stk_nm || "").startsWith("KODEX") || (item.stk_nm || "").startsWith("TIGER");
                    if (isEtfName) return null;

                    // 1. 시장구분 및 marketCode 필터링 (캐시 확인)
                    if (marketCache[stockCode]) {
                        const cached = marketCache[stockCode];
                        if (!['0', '10'].includes(String(cached.code))) {
                            return null;
                        }
                        marketType = cached.type;
                    } else {
                        // 캐시에 없는 경우, 정확한 필터링을 위해 무조건 ka10100 호출
                        // (KODEX 등이 marketCode 0으로 들어오는 경우를 거르기 위함)
                        try {
                            const basicInfoResponse = await axios.post(
                                "https://api.kiwoom.com/api/dostk/stkinfo",
                                { "stk_cd": stockCode },
                                {
                                    headers: {
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${accessToken}`,
                                        "api-id": "ka10100",
                                    },
                                    timeout: 3000
                                }
                            );
                            const basicInfo = basicInfoResponse.data;
                            const mktCode = String(basicInfo.marketCode || "");
                            const mktName = basicInfo.marketName || "";

                            // marketCode 필터링 (0: KOSPI, 10: KOSDAQ)
                            if (!['0', '10'].includes(mktCode)) {
                                marketCache[stockCode] = { type: '?', code: mktCode };
                                return null;
                            }

                            if (mktName && (mktName.includes("거래소") || mktName === "KOSPI")) {
                                marketType = 'K';
                            }
                            marketCache[stockCode] = { type: marketType, code: mktCode };
                        } catch (e) {
                            // API 실패 시엔 이름 필터링만 적용된 채로 진행 (최소한의 안전장치)
                        }
                    }

                    return {
                        ...item,
                        fluc_rt: item.flu_rt,
                        trde_amt: item.trde_prica,
                    };
                } catch (err) {
                    return null;
                }
            });

            const processed = await Promise.all(chunkPromises);
            enrichedItems.push(...processed.filter(p => p !== null));
            if (mrkt_tp === "000" && i + chunkSize < rawItems.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        res.json({
            success: true,
            data: enrichedItems,
            server_time: new Date().toISOString()
        });

    } catch (error) {
        console.error("❌ ka10032 에러:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data || null
        });
    }
});

// 2. 그 다음 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 3. 마지막으로 SPA 루트 서빙
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 토큰 캐싱을 위한 전역 변수
let cachedToken = null;
let tokenExpiryTime = 0;

/**
 * Access Token 발급 함수 (캐싱 포함)
 */
async function getAccessToken(appKey, secretKey) {
    // 1. 캐시된 토큰이 있고, 만료시간이 5분 이상 남았으면 캐시 반환
    if (cachedToken && Date.now() < (tokenExpiryTime - 300000)) {
        return cachedToken;
    }

    fileLog("새로운 Access Token 발급 시도...");
    const response = await axios.post(
        "https://api.kiwoom.com/oauth2/token",
        {
            appkey: appKey,
            secretkey: secretKey,
            grant_type: "client_credentials",
        },
        {
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0"
            },
            timeout: 5000
        }
    );

    const token = response.data.token || response.data.access_token;
    if (!token) {
        throw new Error(`토큰 필드가 없습니다. 응답: ${JSON.stringify(response.data)}`);
    }

    // 2. 토큰 및 만료 시간 캐싱 (기본 만료시간이 없을 경우 24시간으로 설정)
    const expiresIn = response.data.expires_in || 86400; // 초 단위
    cachedToken = token;
    tokenExpiryTime = Date.now() + (expiresIn * 1000);

    fileLog(`토큰 발급 완료 (만료: ${new Date(tokenExpiryTime).toLocaleString()})`);
    return token;
}

app.listen(PORT, () => {
    console.log("\n" + "=".repeat(50));
    console.log(`🚀 서버 구동 완료!`);
    console.log(`링크: http://localhost:${PORT}`);
    console.log(`서버 시작 시간: ${SERVER_START_TIME}`);
    console.log("=".repeat(50) + "\n");

    // 로그 버퍼링 방지를 위한 주기적 점검 (옵션)
    setInterval(() => {
        // keep-alive logging
        // console.log(`[Heartbeat] Server is running... ${new Date().toLocaleTimeString()}`);
    }, 60000);
});
