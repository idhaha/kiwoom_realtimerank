require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

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
        console.log("Step 1: 토큰 발급 시도...");
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
        const totalResp = await axios.post(
            "https://api.kiwoom.com/api/dostk/stkinfo",
            {
                "qry_tp": "1",
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

        // 3. 코스닥 상위 리스트 확보 (가장 확실한 구분 방법)
        console.log("Step 3: 코스닥 상위 종목 리스트 확보 중...");
        let kosdaqCodes = new Set();
        try {
            const mrkinfoResp = await axios.post(
                "https://api.kiwoom.com/api/dostk/mrkinfo",
                { "mrkt_tp": "101" },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`,
                        "api-id": "ka00191",
                    },
                    timeout: 5000
                }
            );
            console.log(`📊 ka00191 응답 필드: ${Object.keys(mrkinfoResp.data).join(', ')}`);
            // 만약 item_mrkt_cd 가 없다면 데이터가 어떻게 들어오는지 확인
            const rawDataString = JSON.stringify(mrkinfoResp.data);
            console.log(`📊 ka00191 데이터(앞부분): ${rawDataString.substring(0, 200)}...`);

            const kosdaqList = mrkinfoResp.data.item_mrkt_cd || mrkinfoResp.data.items || [];
            kosdaqCodes = new Set(kosdaqList.map(s => (s.stk_cd || "").replace(/[^0-9a-zA-Z]/g, '')));
        } catch (e) {
            console.warn("ka00191 조회 실패:", e.message);
        }

        console.log(`📊 수신된 전체 종목: ${stocks.length}개`);
        if (stocks.length > 0) {
            console.log("Ranking Item Sample (Global #1):", JSON.stringify(stocks[0], null, 2));
        }

        // ka10007 (시세표성정보요청) API를 사용하여 정확한 당일 누적 거래대금(trde_prica)을 가져옴
        console.log("Step 4: 종목별 상세 거래대금(ka10007) 조회 및 시장별 보정 시작...");
        const enrichedStocks = [];
        console.log("Step 4: 종목별 상세 정보 조회 및 시장 판별 시작 (순차 실행)...");

        for (let i = 0; i < stocks.length; i++) {
            const stock = stocks[i];
            const cleanCd = (stock.stk_cd || "").replace(/[^0-9a-zA-Z]/g, '');
            let marketType = 'K';
            let trdeAmtMillion = 0;

            try {
                // 1. 주식호가 조회 (ka00310) - mrkt_tp 필드 확보
                const quoteResponse = await axios.post(
                    "https://api.kiwoom.com/api/dostk/rkinfo",
                    {
                        "stk_cd": stock.stk_cd,
                        "mrkt_tp": "000" // 전체 시장 조회 (응답에서 실제 시장이 mrkt_tp로 옴)
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${accessToken}`,
                            "api-id": "ka00310",
                        },
                        timeout: 3000
                    }
                );

                // [시장 판별] mrkt_tp 필드 사용 (001: 코스피, 101: 코스닥)
                const quoteData = quoteResponse.data;

                // [디버깅] 샘플 종목의 경우 전체 응답 확인
                if (['005930', '058610'].includes(cleanCd)) {
                    console.log(`\n[ka00310 응답 분석 - ${stock.stk_nm}]`);
                    console.log('가용 필드:', Object.keys(quoteData).join(', '));
                    console.log('전체 응답:', JSON.stringify(quoteData).substring(0, 300));
                }

                const mrktTp = quoteData.mrkt_tp || "";

                if (mrktTp === '101') {
                    marketType = 'Q';
                }

                // 2. 상세 거래대금 (ka10007) - 거래대금 정보
                const detailResponse = await axios.post(
                    "https://api.kiwoom.com/api/dostk/mrkcond",
                    { "stk_cd": stock.stk_cd },
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

                // [코스닥 보정] 코스닥인 경우 거래대금 2배
                if (marketType === 'Q') {
                    trdeAmtMillion *= 2;
                }

                console.log(`[분석] ${i + 1}/${stocks.length} ${stock.stk_nm}(${cleanCd}) -> mrkt_tp:${mrktTp}, 시장:${marketType}, 거래:${trdeAmtMillion}M`);

                enrichedStocks.push({
                    ...stock,
                    stk_cd: cleanCd,
                    trde_amt: String(trdeAmtMillion),
                    mkt_type: marketType
                });

                // 429 에러 방지를 위한 짧은 대기
                await new Promise(resolve => setTimeout(resolve, 150));

            } catch (e) {
                console.warn(`[!] ${stock.stk_nm}(${cleanCd}) 루프 중 에러: ${e.message}`);
                enrichedStocks.push({
                    ...stock,
                    stk_cd: cleanCd,
                    mkt_type: 'K'
                });
            }
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

// 2. 그 다음 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

// 3. 마지막으로 SPA 루트 서빙
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Access Token 발급 함수
 */
async function getAccessToken(appKey, secretKey) {
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
    return token;
}

app.listen(PORT, () => {
    console.log("\n" + "=".repeat(50));
    console.log(`🚀 서버 구동 완료!`);
    console.log(`링크: http://localhost:${PORT}`);
    console.log(`서버 시작 시간: ${SERVER_START_TIME}`);
    console.log("=".repeat(50) + "\n");
});
