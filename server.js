require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { exec } = require('child_process');
const puppeteer = require('puppeteer');

// 전역 시장구분 캐시 (종목코드: 'K'/'Q') - 429 에러 방지용
const marketCache = {};

// 디버그 로그 파일 설정
const LOG_FILE = path.join(__dirname, 'server_debug.log');

function fileLog(message) {
    const logMessage = `[${new Date().toLocaleString()}] ${message}\n`;
    console.log(message);
    try {
        fs.appendFileSync(path.join(__dirname, 'server_debug.log'), logMessage);
    } catch (e) {
        // ignore
    }
}

const app = express();
const PORT = process.env.PORT || 3001;
const SERVER_START_TIME = new Date().toLocaleString();

// 미들웨어 설정
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
    const efriendAppKey = (process.env.EFRIEND_APPKEY || "").trim();
    const efriendSecretKey = (process.env.EFRIEND_SECRETKEY || "").trim();
    const efriendDomain = (process.env.EFRIEND_DOMAIN || "").trim();

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
        let efriendToken = null;
        try {
            const tokenPromises = [];
            tokenPromises.push(
                getAccessToken(appKey, secretKey).then(t => accessToken = t)
            );
            if (efriendAppKey && efriendSecretKey && efriendDomain) {
                fileLog(`[eFriend] Attempting token issuance for domain: ${efriendDomain}`);
                tokenPromises.push(
                    getEfriendAccessToken(efriendDomain, efriendAppKey, efriendSecretKey)
                        .then(t => {
                            efriendToken = t;
                            fileLog("[eFriend] Token issuance successful");
                        })
                        .catch(err => {
                            fileLog(`[eFriend] Token issuance failed: ${err.message}`);
                            if (err.response) fileLog(`[eFriend] Token Error response: ${JSON.stringify(err.response.data)}`);
                        })
                );
            } else {
                fileLog("[eFriend] Missing environment variables. Skipping eFriend API.");
            }
            await Promise.all(tokenPromises);
            console.log("✅ 토큰 발급 성공");
        } catch (tokenError) {
            console.error("❌ 키움 토큰 발급 실패:", tokenError.message);
            return res.status(500).json({
                success: false,
                error: tokenError.message,
                phase: "token_issuance"
            });
        }

        // 1.1 토큰 유효성 체크 추가 (디버그용)
        if (!accessToken) {
            console.error("❌ 에러: 발급된 핵심 토큰이 null입니다.");
            return res.status(500).json({ success: false, error: "Token issuance returned null" });
        }

        // 2. 실시간종목조회순위 API 호출 (전체 순위를 먼저 가져옴) 및 eFriend 호출 병렬
        console.log("Step 2: 전체 종목 순위(Global Rank) 및 eFriend 조회 중...");

        const qryTp = req.query.qry_tp || "1";

        let totalResp = null;
        let efriendStocks = [];
        const dataPromises = [];

        dataPromises.push(
            axios.post(
                "https://api.kiwoom.com/api/dostk/stkinfo",
                {
                    "qry_tp": qryTp,
                    "mrkt_tp": "000",
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
            ).then(r => totalResp = r)
        );

        if (efriendToken) {
            fileLog("[eFriend] CTSC2702R 대주가능 종목 페이징 조회 시작...");
            const fetchAllLendable = async () => {
                const MAX_PAGES = 50;
                let allItems = [];
                let fk200 = "";
                let nk100 = "";
                let pageCount = 0;

                while (pageCount < MAX_PAGES) {
                    try {
                        const response = await axios.get(
                            `${efriendDomain}/uapi/domestic-stock/v1/quotations/lendable-by-company`,
                            {
                                headers: {
                                    "content-type": "application/json; charset=utf-8",
                                    "authorization": `Bearer ${efriendToken}`,
                                    "appkey": efriendAppKey,
                                    "appsecret": efriendSecretKey,
                                    "tr_id": "CTSC2702R",
                                    "custtype": "P",
                                    // KIS 표준: 첫 조회 공백, 이후 Y(또는 N) — "N"을 첫 요청에 쓰면 0건 응답 발생
                                    "tr_cont": pageCount === 0 ? "" : "Y"
                                },
                                params: {
                                    "EXCG_DVSN_CD": "00",
                                    "PDNO": "",
                                    "THCO_STLN_PSBL_YN": "Y",
                                    "INQR_DVSN_1": "0",
                                    "CTX_AREA_FK200": fk200,
                                    "CTX_AREA_NK100": nk100
                                },
                                timeout: 10000
                            }
                        );

                        const data = response.data;
                        if (pageCount === 0) {
                            fileLog(`[eFriend] API response: rt_cd=${data.rt_cd}, msg_cd=${data.msg_cd}, msg1=${(data.msg1 || '').trim()}`);
                        }

                        if (data.rt_cd && data.rt_cd !== "0") {
                            fileLog(`[eFriend] API error: rt_cd=${data.rt_cd}, msg1=${(data.msg1 || '').trim()}`);
                            break;
                        }

                        const pageItems = Array.isArray(data.output1)
                            ? data.output1
                            : (Array.isArray(data.output) ? data.output : []);
                        allItems = allItems.concat(pageItems);
                        pageCount++;

                        const h_tr_cont = (response.headers['tr_cont'] || response.headers['TR_CONT'] || '').toUpperCase();
                        const fk200Preview = (data.ctx_area_fk200 || "").substring(0, 30);
                        fileLog(`[eFriend] Page ${pageCount}: ${pageItems.length} items (total: ${allItems.length}), tr_cont=${h_tr_cont || 'N'}, fk200=${fk200Preview}...`);

                        fk200 = data.ctx_area_fk200 || "";
                        nk100 = data.ctx_area_nk100 || "";

                        // Y(사용자 명세) 또는 M(KIS 표준)이면 다음 페이지 존재
                        const hasMore = (h_tr_cont === 'Y' || h_tr_cont === 'M');
                        if (!hasMore || pageItems.length === 0) {
                            break;
                        }

                        await new Promise(r => setTimeout(r, 200));
                    } catch (e) {
                        const errBody = e.response?.data ? JSON.stringify(e.response.data).substring(0, 300) : '';
                        fileLog(`[eFriend] Pagination error at page ${pageCount + 1}: ${e.message} (collected: ${allItems.length} items) ${errBody}`);
                        break;
                    }
                }

                if (pageCount >= MAX_PAGES) {
                    fileLog(`[eFriend] Warning: reached max page limit (${MAX_PAGES}), collected ${allItems.length} items`);
                }

                return allItems;
            };

            dataPromises.push(
                fetchAllLendable().then(items => {
                    efriendStocks = items;
                    fileLog(`[eFriend] Final: ${efriendStocks.length} lendable stocks collected`);
                })
            );
        }

        await Promise.all(dataPromises);

        // --- 2.5 eFriend 현재가(등락률) 일괄 조회 ---
        if (efriendToken && efriendStocks.length > 0) {
            console.log(`Step 2.5: eFriend ${efriendStocks.length}개 종목 현재가(등락률) 조회 시작...`);
            const efriendChunkSize = 10; // 10개씩 병렬 처리하여 429 에러 방지

            for (let i = 0; i < efriendStocks.length; i += efriendChunkSize) {
                const chunk = efriendStocks.slice(i, i + efriendChunkSize);
                const pricePromises = chunk.map(async (stock) => {
                    if (!stock.pdno) return;

                    // J:KRX, NX:NXT 등 시장구분이 필요한데 기본값 J(KRX)로 처리
                    let iscd = stock.pdno.trim();
                    if (iscd.length === 6 && (iscd.startsWith('5') || iscd.startsWith('7'))) {
                        iscd = "Q" + iscd; // ETN 예외처리 (CSV 명세서 권장사항)
                    }

                    try {
                        const priceRes = await axios.get(
                            `${efriendDomain}/uapi/domestic-stock/v1/quotations/inquire-price`,
                            {
                                headers: {
                                    "content-type": "application/json; charset=utf-8",
                                    "authorization": `Bearer ${efriendToken}`,
                                    "appkey": efriendAppKey,
                                    "appsecret": efriendSecretKey,
                                    "tr_id": "FHKST01010100", // 현재가 시세 TR ID
                                    "custtype": "P"
                                },
                                params: {
                                    "FID_COND_MRKT_DIV_CODE": "J",
                                    "FID_INPUT_ISCD": iscd
                                },
                                timeout: 3000
                            }
                        );

                        if (priceRes.data && priceRes.data.output) {
                            stock.prdy_ctrt = priceRes.data.output.prdy_ctrt; // 전일 대비율 (등락률)
                            stock.stck_prpr = priceRes.data.output.stck_prpr; // 현재가
                            stock.rprs_mrkt_kor_name = priceRes.data.output.rprs_mrkt_kor_name; // 시장 정보 (KOSPI/KOSDAQ)
                            // log original response field to understand what is coming from API
                            console.log(`[Server] INQ PRICE for ${stock.pdno}: rprs_mrkt_kor_name = "${priceRes.data.output.rprs_mrkt_kor_name}", tr_mkt_name = "${priceRes.data.output.tr_mkt_name}", mrkt_div_code = "${priceRes.data.output.mrkt_div_code}", mkt_nm = "${priceRes.data.output.mkt_nm}"`);
                        } else {
                            stock.prdy_ctrt = "0.00";
                            stock.stck_prpr = stock.bfdy_clpr;
                            stock.rprs_mrkt_kor_name = "";
                        }
                    } catch (err) {
                        // 에러 로그는 생략 (과부하 방지)
                        stock.prdy_ctrt = "0.00";
                        stock.stck_prpr = stock.bfdy_clpr;
                    }
                });

                await Promise.all(pricePromises);
                // API 부하 조절을 위한 대기 시간 (50ms)
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            console.log("Step 2.5: eFriend 현재가 조회 완료. 등락률, 현재가 병합됨.");
        }

        // 상세 로그 추가: 응답 본문 전체 확인
        console.log("DEBUG: ka00198 Full Response Data:", JSON.stringify(totalResp.data, null, 2));

        const stocks = totalResp.data.item_inq_rank || [];

        // 토큰 에러 발생 시 캐시 초기화
        if (totalResp.data.return_code === 3 || (totalResp.data.return_msg && totalResp.data.return_msg.includes("Token이 유효하지 않습니다"))) {
            console.warn("⚠️ 토큰 만료/유효하지 않음 감지. 캐시를 초기화합니다.");
            cachedToken = null;
            tokenExpiryTime = 0;
        }

        // 3. (삭제됨) 코스닥 상위 리스트 확보 로직 제거
        // 사용자가 marketName 기반 판별을 원함. 아래 loop 내부에서 ka10100 결과를 사용.

        console.log(`📊 수신된 전체 종목: ${stocks.length}개`);
        if (stocks.length > 0) {
            console.log("Ranking Item Sample (Global #1):", JSON.stringify(stocks[0], null, 2));
        }

        // ka10007 (시세표성정보요청) API를 사용하여 정확한 당일 누적 거래대금(trde_prica)을 가져옴
        console.log("Step 4: 종목별 상세 거래대금(ka10007) 조회 및 시장별 보정 시작...");
        const enrichedStocks = [];

        const chunkSize = 1; // 429 에러 방지를 위해 1로 하향 (사용자 확인 완료)
        for (let i = 0; i < stocks.length; i += chunkSize) {
            const chunk = stocks.slice(i, i + chunkSize);
            // console.log(`Processing chunk ${i / chunkSize + 1} / ${Math.ceil(stocks.length / chunkSize)}...`);

            const chunkPromises = chunk.map(async (stock) => {
                const cleanCd = (stock.stk_cd || "").replace(/[^0-9a-zA-Z]/g, '');
                let marketType = 'Q'; // 기본값 코스닥(Q) - ka10100 실패 시 안전망
                let trdeAmtMillion = 0;

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
                            const marketName = basicInfo.marketName || "";

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
            enrichedStocks.push(...processed.filter(p => p !== null));

            // API 부하 조절을 위한 대기 시간 (100ms 지연)
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log("Step 5: 데이터 보정 및 병합 완료");
        res.json({
            success: true,
            data: {
                kiwoom: enrichedStocks,
                efriend: efriendStocks
            },
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

        // 상세 로그 추가: 응답 본문 전체 확인
        console.log("DEBUG: ka10032 Full Response Data:", JSON.stringify(response.data, null, 2));

        // ka10032 returns data in 'trde_prica_upper'
        const rawItems = response.data.trde_prica_upper || response.data.output || [];

        // 토큰 에러 발생 시 캐시 초기화
        if (response.data.return_code === 3 || (response.data.return_msg && response.data.return_msg.includes("Token이 유효하지 않습니다"))) {
            console.warn("⚠️ 토큰 만료/유효하지 않음 감지. 캐시를 초기화합니다.");
            cachedToken = null;
            tokenExpiryTime = 0;
        }

        // Market Enrichment
        console.log(`Step 3: 거래대금상위 시장구분(ka10100) 보정 시작 (${rawItems.length}개)...`);
        const enrichedItems = [];
        const chunkSize = 1; // 429 에러 방지를 위해 1로 하향

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
                        mkt_type: marketType,
                        fluc_rt: item.flu_rt,
                        trde_amt: item.trde_prica,
                    };
                } catch (err) {
                    return null;
                }
            });

            const processed = await Promise.all(chunkPromises);
            enrichedItems.push(...processed.filter(p => p !== null));

            // 모든 요청 사이에 미세 지연 추가
            await new Promise(resolve => setTimeout(resolve, 100));
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

/**
 * 관심종목 그룹 리스트(ka01300) API 엔드포인트
 */
app.get('/api/watchlist_groups', async (req, res) => {
    console.log("🚀 [API START] /api/watchlist_groups 요청 처리 시작");

    const appKey = (process.env.KIWOOM_APPKEY || "").trim();
    const secretKey = (process.env.KIWOOM_SECRETKEY || "").trim();

    try {
        if (!appKey || !secretKey) {
            return res.status(500).json({ error: "API 키 설정 필요" });
        }

        let accessToken = await getAccessToken(appKey, secretKey);

        const response = await axios.post(
            "https://api.kiwoom.com/api/dostk/watchlist",
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                    "api-id": "ka01300",
                    "cont-yn": "n",
                    "next-key": "n"
                },
                timeout: 5000
            }
        );

        console.log("DEBUG: ka01300 Full Response Data:", JSON.stringify(response.data, null, 2));

        if (response.data.return_code === 3 || (response.data.return_msg && response.data.return_msg.includes("Token이 유효하지 않습니다"))) {
            console.warn("⚠️ 토큰 만료/유효하지 않음 감지. 캐시를 초기화합니다.");
            cachedToken = null;
            tokenExpiryTime = 0;
        }

        if (response.data.return_code !== 0 && response.data.return_code !== undefined) {
            console.error(`❌ ka01300 에러 [${response.data.return_code}]: ${response.data.return_msg}`);
            return res.status(400).json({
                success: false,
                error: response.data.return_msg || `키움 그룹조회 실패 (${response.data.return_code})`,
                return_code: response.data.return_code
            });
        }

        let rawGroups = [];
        if (Array.isArray(response.data)) {
            rawGroups = response.data;
        } else if (Array.isArray(response.data.grp_list)) {
            rawGroups = response.data.grp_list;
        } else if (Array.isArray(response.data.item)) {
            rawGroups = response.data.item;
        } else if (Array.isArray(response.data.items)) {
            rawGroups = response.data.items;
        } else if (Array.isArray(response.data.data)) {
            rawGroups = response.data.data;
        } else if (Array.isArray(response.data.output)) {
            rawGroups = response.data.output;
        } else if (Array.isArray(response.data.output1)) {
            rawGroups = response.data.output1;
        } else {
            for (const key of Object.keys(response.data)) {
                if (Array.isArray(response.data[key])) {
                    rawGroups = response.data[key];
                    break;
                }
            }
        }

        const groups = rawGroups.map(g => ({
            grp_id: g.arn_grp_id || g.grp_id || g.group_id || g.id || '',
            grp_nm: g.arn_grp_nm || g.grp_nm || g.group_name || g.name || (g.arn_grp_id || g.grp_id || '')
        })).filter(g => g.grp_id);

        res.json({
            success: true,
            data: groups,
            server_time: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ ka01300 에러:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data || null
        });
    }
});

/**
 * 관심종목 그룹 상세조회(ka01301) 및 하락률 순위 엔드포인트
 */
app.get('/api/watchlist_rank', async (req, res) => {
    console.log("🚀 [API START] /api/watchlist_rank 요청 처리 시작");

    const appKey = (process.env.KIWOOM_APPKEY || "").trim();
    const secretKey = (process.env.KIWOOM_SECRETKEY || "").trim();
    const grpId = req.query.grp_id || "074";

    try {
        if (!appKey || !secretKey) {
            return res.status(500).json({ error: "API 키 설정 필요" });
        }

        let accessToken = await getAccessToken(appKey, secretKey);

        console.log(`Step 2: 관심종목 그룹 상세조회 (arn_grp_id=${grpId})...`);
        const response = await axios.post(
            "https://api.kiwoom.com/api/dostk/watchlist",
            {
                "arn_grp_id": grpId
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                    "api-id": "ka01301",
                    "cont-yn": "n",
                    "next-key": "n"
                },
                timeout: 5000
            }
        );

        console.log("DEBUG: ka01301 Full Response Data:", JSON.stringify(response.data, null, 2));

        if (response.data.return_code === 3 || (response.data.return_msg && response.data.return_msg.includes("Token이 유효하지 않습니다"))) {
            console.warn("⚠️ 토큰 만료/유효하지 않음 감지. 캐시를 초기화합니다.");
            cachedToken = null;
            tokenExpiryTime = 0;
        }

        if (response.data.return_code !== 0 && response.data.return_code !== undefined) {
            console.error(`❌ ka01301 에러 [${response.data.return_code}]: ${response.data.return_msg}`);
            return res.status(400).json({
                success: false,
                error: response.data.return_msg || `키움 관심종목조회 실패 (${response.data.return_code})`,
                return_code: response.data.return_code
            });
        }

        let rawItems = [];
        if (Array.isArray(response.data)) {
            rawItems = response.data;
        } else if (Array.isArray(response.data.item_list)) {
            rawItems = response.data.item_list;
        } else if (Array.isArray(response.data.item)) {
            rawItems = response.data.item;
        } else if (Array.isArray(response.data.items)) {
            rawItems = response.data.items;
        } else if (Array.isArray(response.data.data)) {
            rawItems = response.data.data;
        } else if (Array.isArray(response.data.output)) {
            rawItems = response.data.output;
        } else if (Array.isArray(response.data.output1)) {
            rawItems = response.data.output1;
        } else if (Array.isArray(response.data.output2)) {
            rawItems = response.data.output2;
        } else if (Array.isArray(response.data.watchlist)) {
            rawItems = response.data.watchlist;
        } else if (Array.isArray(response.data.grp_list)) {
            rawItems = response.data.grp_list;
        } else {
            for (const key of Object.keys(response.data)) {
                if (Array.isArray(response.data[key])) {
                    rawItems = response.data[key];
                    break;
                }
            }
        }

        console.log(`Step 3: 관심종목 종목별 시장구분(ka10100) 및 거래대금(ka10007) 보정 시작 (${rawItems.length}개)...`);
        const enrichedItems = [];
        const chunkSize = 1;

        for (let i = 0; i < rawItems.length; i += chunkSize) {
            const chunk = rawItems.slice(i, i + chunkSize);
            const chunkPromises = chunk.map(async (item) => {
                const stockCode = (item.stk_cd || item.isu_cd || item.item_cd || item.code || item.pdno || item.iscd || item.shcode || item.jong_cd || item.stck_shrn_iscd || item.arn_stk_cd || "").replace(/[^0-9a-zA-Z]/g, '').replace(/_AL$/, "");
                if (!stockCode) return null;

                const stockName = item.stk_nm || item.isu_nm || item.prdt_name || item.name || '';
                let marketType = 'Q';
                let trdeAmtMillion = parseInt(item.trde_amt || item.trde_prica || item.acml_tr_pbmn || 0) || 0;
                let flucRt = item.fluc_rt || item.flu_rt || item.prdy_ctrt || item.base_comp_chgr || item.chg_rt || '0';

                try {
                    // 0. 이름 기반 필터링 (최우선)
                    const isEtfName = (stockName || "").startsWith("KODEX") || (stockName || "").startsWith("TIGER");
                    if (isEtfName) return null;

                    // 1. 시장구분 (Realtime Query Rank와 동일한 ka10100 로직)
                    if (marketCache[stockCode]) {
                        const cached = marketCache[stockCode];
                        if (!['0', '10'].includes(String(cached.code))) {
                            return null;
                        }
                        marketType = cached.type;
                    } else {
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
                            const marketName = basicInfo.marketName || "";

                            if (!['0', '10'].includes(mktCode)) {
                                marketCache[stockCode] = { type: '?', code: mktCode };
                                return null;
                            }

                            if (marketName && (marketName.includes("거래소") || marketName === "KOSPI")) {
                                marketType = 'K';
                            }
                            marketCache[stockCode] = { type: marketType, code: mktCode };
                        } catch (e) {
                            fileLog(`[Warning] ka10100 failed for ${stockName} (${stockCode}): ${e.message}`);
                        }
                    }

                    // 2. 종목별상세거래대금 (ka10007) - Realtime Query Rank와 동일
                    try {
                        const detailResponse = await axios.post(
                            "https://api.kiwoom.com/api/dostk/mrkcond",
                            { "stk_cd": `${stockCode}_AL` },
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
                        if (detail.trde_prica) {
                            trdeAmtMillion = parseInt(detail.trde_prica) || 0;
                        }
                        if (detail.flu_rt || detail.fluc_rt || detail.base_comp_chgr || detail.prdy_ctrt) {
                            flucRt = detail.flu_rt || detail.fluc_rt || detail.base_comp_chgr || detail.prdy_ctrt;
                        }
                    } catch (e) {
                        // ignore
                    }

                    return {
                        ...item,
                        stk_cd: stockCode,
                        stk_nm: stockName,
                        mkt_type: marketType,
                        fluc_rt: flucRt,
                        trde_amt: trdeAmtMillion
                    };
                } catch (err) {
                    fileLog(`[Warning] Enrichment catch for ${stockCode}: ${err.message}`);
                    return {
                        ...item,
                        stk_cd: stockCode,
                        stk_nm: stockName || stockCode,
                        mkt_type: marketType,
                        fluc_rt: flucRt,
                        trde_amt: trdeAmtMillion
                    };
                }
            });

            const processed = await Promise.all(chunkPromises);
            enrichedItems.push(...processed.filter(p => p !== null));

            await new Promise(resolve => setTimeout(resolve, 100));
        }

        fileLog(`Step 4: 관심종목 최종 보정 완료 (총 ${enrichedItems.length}개 반환)`);

        res.json({
            success: true,
            grp_id: grpId,
            data: enrichedItems,
            server_time: new Date().toISOString()
        });

    } catch (error) {
        fileLog(`❌ ka01301 에러: ${error.message}`);
        console.error("❌ ka01301 에러:", error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data || null
        });
    }
});

/**
 * 관심종목 전체 디버깅용 엔드포인트
 * 브라우저나 curl로 http://localhost:3001/api/watchlist_debug?grp_id=074 호출 시
 * 키움 API와의 원본 요청/응답 전체를 JSON으로 확인 가능
 */
app.get('/api/watchlist_debug', async (req, res) => {
    const appKey = (process.env.KIWOOM_APPKEY || "").trim();
    const secretKey = (process.env.KIWOOM_SECRETKEY || "").trim();
    const grpId = req.query.grp_id || "074";

    const debugLogs = [];
    const log = (msg) => {
        debugLogs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        console.log(`[WatchlistDebug] ${msg}`);
    };

    try {
        log(`1. 토큰 발급 시작 (AppKey: ${appKey.substring(0, 8)}...)`);
        const tokenRes = await axios.post(
            "https://api.kiwoom.com/oauth2/token",
            {
                grant_type: "client_credentials",
                appkey: appKey,
                secretkey: secretKey
            },
            {
                headers: { "Content-Type": "application/json" },
                timeout: 10000
            }
        );

        log(`Token 응답 return_code: ${tokenRes.data.return_code}, return_msg: ${tokenRes.data.return_msg || 'OK'}`);
        const token = tokenRes.data.token || tokenRes.data.access_token;

        if (!token) {
            return res.json({
                success: false,
                step: "token",
                tokenResponse: tokenRes.data,
                logs: debugLogs
            });
        }

        log("2. ka01300 (그룹 리스트) 호출...");
        let groupResData = null;
        try {
            const grpRes = await axios.post(
                "https://api.kiwoom.com/api/dostk/watchlist",
                {},
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                        "api-id": "ka01300",
                        "cont-yn": "n",
                        "next-key": "n"
                    },
                    timeout: 10000
                }
            );
            groupResData = grpRes.data;
            log(`ka01300 응답 수신 완료 (Status: ${grpRes.status})`);
        } catch (e) {
            groupResData = { error: e.message, response: e.response?.data };
            log(`ka01300 실패: ${e.message}`);
        }

        log(`3. ka01301 (그룹 ${grpId} 상세조회) 호출...`);
        let detailResData = null;
        try {
            const dRes = await axios.post(
                "https://api.kiwoom.com/api/dostk/watchlist",
                { "arn_grp_id": String(grpId) },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                        "api-id": "ka01301",
                        "cont-yn": "n",
                        "next-key": "n"
                    },
                    timeout: 10000
                }
            );
            detailResData = dRes.data;
            log(`ka01301 응답 수신 완료 (Status: ${dRes.status})`);
        } catch (e) {
            detailResData = { error: e.message, response: e.response?.data };
            log(`ka01301 실패: ${e.message}`);
        }

        res.json({
            success: true,
            tested_grp_id: grpId,
            token_sample: token ? `${token.substring(0, 15)}...` : null,
            ka01300_groups_raw: groupResData,
            ka01301_detail_raw: detailResData,
            logs: debugLogs
        });
    } catch (e) {
        log(`전체 디버그 실패: ${e.message}`);
        res.status(500).json({
            success: false,
            error: e.message,
            response: e.response?.data,
            logs: debugLogs
        });
    }
});

/**
 * ADR 데이터 프록시 API (CORS 방지용)
 */
app.get('/api/adr', async (req, res) => {
    console.log("🚀 [API START] /api/adr 요청 발생 (Cache-Busting 적용)");
    try {
        const timestamp = Date.now();
        const response = await axios.get(`http://adrinfo.kr/chart?t=${timestamp}`, {
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        console.log("✅ ADR 데이터 획득 성공 (길이:", response.data.length, ")");
        res.send(response.data);
    } catch (error) {
        console.error("❌ ADR 프록시 에러:", error.message);
        res.status(500).json({ error: "ADR 데이터를 가져오는데 실패했습니다.", details: error.message });
    }
});

/**
 * Finviz 이미지 프록시 API (CORS 방지용)
 */
app.get('/api/finviz-image', async (req, res) => {
    console.log("🚀 [API START] /api/finviz-image 요청 발생");
    try {
        const imageUrl = req.query.url;
        if (!imageUrl) {
            return res.status(400).json({ error: "URL 파라미터가 필요합니다." });
        }

        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://finviz.com/'
            }
        });

        // 이미지 타입 설정
        const contentType = response.headers['content-type'] || 'image/png';
        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=300'); // 5분 캐시
        res.send(response.data);

        console.log("✅ Finviz 이미지 획득 성공");
    } catch (error) {
        console.error("❌ Finviz 이미지 프록시 에러:", error.message);
        res.status(500).json({ error: "이미지를 가져오는데 실패했습니다.", details: error.message });
    }
});

/**
 * TradingEconomics API 프록시 (CORS 방지용)
 * 환율, 금리 등 경제 지표 데이터 제공
 */
let activeBrowsers = 0; // 동시에 실행 중인 브라우저 수
const MAX_BROWSERS = 2; // v30.9.15: Reduced from 3 to prevent RAM pressure on 1GB Oracle Cloud

// v30.9.11: Memory Cache for TradingEconomics
const teCache = {};
// 1시간 타이머 제거: 사용자가 수동 새로고침하기 전까지 영구 캐시 유지 (서버 재시작 전까지)

app.get('/api/trading-economics', async (req, res) => {
    let originalUrl = req.query.url;
    const duration = req.query.duration || ''; // e.g., '10년'
    const forceRefresh = req.query.force_refresh === 'true' || req.query.force_refresh === '1'; // 강제 새로고침 플래그
    if (!originalUrl) return res.status(400).json({ error: "URL 파라미터가 필요합니다." });

    originalUrl = originalUrl.replace(/([^:]\/)\/+/g, '$1');
    console.log(`📡 [TE Proxy] Request: ${originalUrl}, Duration: ${duration || 'default'}, Force: ${forceRefresh}`);

    const cacheKey = `${originalUrl}_${duration}`;
    const cached = teCache[cacheKey];

    // 강제 새로고침이 아닐 때만 캐시를 반환 (시간 제한 없음)
    if (!forceRefresh && cached) {
        console.log(`   🧊 [TE] Serving from Cache: ${originalUrl}`);
        return res.json({ success: true, data: cached.data });
    }

    try {
        const targetUrl = originalUrl;
        if (targetUrl.includes('tradingeconomics.com') && !targetUrl.includes('api.tradingeconomics.com')) {
            console.log(`   -> Scraping Mode (v28): ${originalUrl}`);

            let browser = null;
            try {
                // Semaphore for active browsers
                let waitCount = 0;
                while (activeBrowsers >= MAX_BROWSERS && waitCount < 90) {
                    await new Promise(r => setTimeout(r, 1000));
                    waitCount++;
                }
                activeBrowsers++;

                browser = await puppeteer.launch({
                    headless: "new",
                    timeout: 60000,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--disable-blink-features=AutomationControlled',
                        '--window-size=1920,1080'
                    ]
                });

                const page = await browser.newPage();
                page.setDefaultTimeout(60000); // v30.9.10: Set explicit 60s timeout for Puppeteer
                await page.setViewport({ width: 1920, height: 1080 });

                // Stealth
                await page.evaluateOnNewDocument(() => {
                    Object.defineProperty(navigator, 'webdriver', { get: () => false });
                });

                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

                // 0. Block Ads and Analytics for stability
                await page.setRequestInterception(true);
                page.on('request', (request) => {
                    const url = request.url();
                    if (url.includes('google-analytics') || url.includes('googletagmanager') || url.includes('doubleclick') || url.includes('ads') || url.includes('tracker')) {
                        request.abort();
                    } else {
                        request.continue();
                    }
                });

                // 1. Initial Load (Use 'commit' for speed and resilience to frame detachment)
                let retryCount = 0;
                while (retryCount < 2) {
                    try {
                        console.log(`   🌐 Navigating... (Attempt ${retryCount + 1})`);
                        await page.goto(originalUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }); // v30.9.12: Increased to 60s
                        break;
                    } catch (e) {
                        retryCount++;
                        if (retryCount >= 2) throw e;
                        await new Promise(r => setTimeout(r, 2000));
                    }
                }

                // 2. Wait for chart container
                await page.waitForSelector('.highcharts-container', { timeout: 30000 });
                await new Promise(r => setTimeout(r, 1000)); // v30.9.15: Reduced from 2s

                const extractPoints = () => {
                    const map = new Map();
                    if (!window.Highcharts || !window.Highcharts.charts || window.Highcharts.charts.length === 0) return null;
                    const tomorrow = Date.now() + 3600000;

                    // v30.22: Target only the primary chart to avoid collision with related/crosses charts
                    // Usually the main chart is in #chart, .chart, or .iChart-container
                    let primaryChart = null;
                    
                    // Try to guess the ticker from the URL or page meta/title for more accurate targeting
                    const url = window.location.href;
                    let ticker = "";
                    if (url.includes("2-year-note-yield")) ticker = "gjgb2y";
                    else if (url.includes("government-bond-yield")) ticker = "gjgb10";
                    
                    const mainContainers = document.querySelectorAll('#chart, .chart, .iChart-container, .table-unit');
                    
                    if (mainContainers.length > 0) {
                        for (const container of mainContainers) {
                            // Check if this container has a chart
                            const chart = window.Highcharts.charts.find(c => c && c.renderTo && container.contains(c.renderTo));
                            if (chart) {
                                // If we have a ticker, check if any series name contains it (TE often uses stickers in hidden fields or names)
                                if (ticker) {
                                    const hasTicker = chart.series.some(s => 
                                        (s.name && s.name.toLowerCase().includes(ticker)) || 
                                        (chart.renderTo && chart.renderTo.className && chart.renderTo.className.includes(ticker))
                                    );
                                    if (hasTicker) {
                                        primaryChart = chart;
                                        break;
                                    }
                                }
                                if (!primaryChart) primaryChart = chart; 
                                // Don't break yet if we are looking for a ticker match
                                if (!ticker) break;
                            }
                        }
                    }

                    // Fallback: pick the chart with most series/points if no container match
                    if (!primaryChart) {
                        primaryChart = window.Highcharts.charts.reduce((prev, curr) => {
                            const prevPoints = prev ? (prev.series ? prev.series.reduce((s, ser) => s + (ser.data ? ser.data.length : 0), 0) : 0) : 0;
                            const currPoints = curr ? (curr.series ? curr.series.reduce((s, ser) => s + (ser.data ? ser.data.length : 0), 0) : 0) : 0;
                            return (currPoints > prevPoints) ? curr : prev;
                        }, window.Highcharts.charts[0]);
                    }

                    if (!primaryChart || !primaryChart.series) return null;

                    primaryChart.series.forEach(series => {
                        const isProjection = (series.name && series.name.toLowerCase().includes('projection')) ||
                            (series.options.dashStyle && series.options.dashStyle !== 'Solid');

                        if (isProjection) return;
                        if (!series.data) return;

                        series.data.forEach(p => {
                            let x, y;
                            if (Array.isArray(p)) { x = p[0]; y = p[1]; }
                            else if (p && typeof p === 'object') { x = p.x; y = p.y; }

                            if (x !== undefined && y !== null && y !== undefined) {
                                if (x > tomorrow) return;
                                map.set(x, y);
                            }
                        });
                    });

                    return Array.from(map.entries()).map(([x, y]) => ({ x, y }));
                };

                // Add Step: Capture "Live" point from the page DOM (often more fresh than Highcharts)
                const extractLivePoint = () => {
                    try {
                        // v30.22: Target only the main price element, avoiding "Related" or "Crosses" tables
                        // Typically, the main price is in the header or has a specific ticker-based class
                        const url = window.location.href;
                        let ticker = "";
                        if (url.includes("2-year-note-yield")) ticker = "gjgb2y";
                        else if (url.includes("government-bond-yield")) ticker = "gjgb10";

                        if (ticker) {
                            // High priority: ticker-specific label in legend area
                            const tickerLabel = document.querySelector(`div.${ticker}\\:ind span.closeLabel, #Label-${ticker}`);
                            if (tickerLabel) {
                                const val = parseFloat(tickerLabel.textContent.replace(/,/g, ''));
                                if (!isNaN(val)) return { x: Date.now(), y: val };
                            }
                        }

                        // Medium priority: main header elements
                        const priceEl = document.querySelector('.table-unit .actual, .header-pricing #p, #last_value, .i-price-value');
                        if (priceEl) {
                            const val = parseFloat(priceEl.textContent.replace(/,/g, ''));
                            if (!isNaN(val)) return { x: Date.now(), y: val };
                        }
                    } catch (e) { }
                    return null;
                };

                let masterMap = new Map();

                // 2.5 Scroll to make sure the chart is initialized
                await page.evaluate(() => {
                    const chart = document.querySelector('#chart, .iChart-container');
                    if (chart) chart.scrollIntoView();
                });
                await new Promise(r => setTimeout(r, 2000));

                const robustClick = async (t) => {
                    return await page.evaluate((text) => {
                        const buttons = Array.from(document.querySelectorAll('button, a, span, div'))
                            .filter(el => {
                                const tr = el.textContent.trim();
                                return tr === text || tr === text.replace('Y', ' Y') || tr === text.replace('Y', ' Year');
                            });
                        if (buttons.length > 0) {
                            buttons[0].click();
                            return true;
                        }
                        return false;
                    }, t);
                };

                // 3. Stage 1: Historical Duration (e.g. 5Y, 10Y)
                if (duration && !duration.includes('1년')) {
                    let targetBtn = '5Y';
                    const yMatch = duration.match(/(\d+)\s*년/);
                    if (yMatch) {
                        const count = parseInt(yMatch[1]);
                        if (count >= 10) targetBtn = '10Y';
                        else if (count >= 5) targetBtn = '5Y';
                    } else if (duration.toLowerCase().includes('max') || duration.toLowerCase().includes('전체')) {
                        targetBtn = 'MAX';
                    }

                    console.log(`   🎯 Stage 1: History (${targetBtn})...`);
                    const clicked = await robustClick(targetBtn);
                    if (clicked) {
                        await new Promise(r => setTimeout(r, 7000)); // v30.9.15: Reduced from 8s
                        const history = await page.evaluate(extractPoints);
                        if (history && history.length > 0) {
                            console.log(`   📊 Captured ${history.length} points (History Stage)`);
                            history.forEach(p => masterMap.set(p.x, p.y));
                        }
                    }
                }

                // 4. Stage 2: Daily (1Y) Resolution
                console.log('   📡 Stage 2: Daily (1Y) Resolution...');
                const clicked1Y = await robustClick('1Y');
                if (clicked1Y) {
                    await page.evaluate(() => {
                        if (window.Highcharts && window.Highcharts.charts) {
                            window.Highcharts.charts.forEach(c => {
                                if (c.series) c.series.forEach(s => s.update({ dataGrouping: { enabled: false } }, false));
                                c.redraw();
                            });
                        }
                    });
                    await new Promise(r => setTimeout(r, 4000)); // v30.9.15: Reduced from 6s
                    const daily = await page.evaluate(extractPoints);
                    if (daily && daily.length > 0) {
                        console.log(`   📊 Captured ${daily.length} points (Daily Stage)`);
                        daily.forEach(p => masterMap.set(p.x, p.y));
                    }
                }

                // 5. Stage 3: Live Point (Freshest)
                const live = await page.evaluate(extractLivePoint);
                if (live) {
                    masterMap.set(live.x, live.y);
                }

                if (masterMap.size === 0) throw new Error('데이터 획득 실패');

                const finalData = Array.from(masterMap.entries())
                    .sort((a, b) => a[0] - b[0])
                    .map(([x, y]) => ({ DateTime: new Date(x).toISOString(), Value: y }));

                console.log(`   ✅ Success: Merged total ${masterMap.size} points.`);

                // v30.9.11: Store in cache
                teCache[cacheKey] = {
                    timestamp: Date.now(),
                    data: finalData
                };

                res.set('Cache-Control', 'public, max-age=300');
                return res.json({ success: true, data: finalData });

            } catch (e) {
                console.error(`   ❌ Scraping error: ${e.message}`);
                fs.appendFileSync('puppeteer_debug.log', `   ❌ ${e.message}\n`);
                throw e;
            } finally {
                activeBrowsers = Math.max(0, activeBrowsers - 1);
                if (browser) await browser.close().catch(() => { });
            }
        }

        // --- Fallback (API Mode) ---
        const response = await axios.get(originalUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Referer': 'https://tradingeconomics.com/'
            }
        });

        let data = response.data; // v30.9.11: RESTORED definition
        if (typeof data === 'string') {
            try { data = JSON.parse(data.trim()); } catch (e) { }
        }

        // v30.9.11: Save to Cache
        if (Array.isArray(data) && data.length > 0) {
            teCache[cacheKey] = {
                timestamp: Date.now(),
                data: data
            };
            console.log(`[TE] ✅ Cache Updated: ${originalUrl}`);
        }

        res.set('Cache-Control', 'public, max-age=300');
        res.json({ success: true, data: data });

    } catch (error) {
        console.error(`   ❌ TE Proxy Error: ${error.message}`);
        res.status(500).json({ success: false, error: "데이터 획득 실패", details: error.message });
    }
});

/**
 * FRED 데이터 제공 API (캐싱 적용)
 */
const fredCache = {}; // { "seriesId_period": { timestamp: 12345, data: ... } }
// 6시간 타이머 제거: 수동 조회(새로고침) 버튼으로만 캐시 무시 (영구 유지)

app.get('/api/fred', (req, res) => {
    const seriesId = req.query.series_id;
    const period = req.query.period || '1년';
    const forceRefresh = req.query.force_refresh === 'true' || req.query.force_refresh === '1';

    if (!seriesId) {
        return res.status(400).json({ success: false, error: 'series_id is required' });
    }

    const cacheKey = `${seriesId}_${period}`;
    const cached = fredCache[cacheKey];

    if (!forceRefresh && cached) {
        console.log(`[API] Serving FRED from Cache: ${cacheKey}`);
        return res.json(cached.data);
    }

    // Try 'python' first, then 'python3' as fallback
    const runFred = (cmd) => {
        const fullCmd = `${cmd} fred_api.py "${seriesId}" "${period}"`;
        console.log(`[FRED] 🔄 Executing: ${fullCmd}`);
        exec(fullCmd, { cwd: __dirname, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                if (cmd === 'python') {
                    console.warn(`[FRED] ⚠️ 'python' failed, retrying with 'python3'...`);
                    return runFred('python3');
                }
                fileLog(`[FRED] ❌ Exec error (${cmd}): ${error.message}`);
                fileLog(`[FRED] ❌ Stderr: ${stderr}`);
                return res.status(500).json({ success: false, error: error.message, cmd: fullCmd, stderr });
            }
            if (stderr && !stderr.includes('Warning')) {
                fileLog(`[FRED] ⚠️ Stderr: ${stderr}`);
            }

            try {
                const jsonStart = stdout.indexOf('{');
                const jsonEnd = stdout.lastIndexOf('}');
                if (jsonStart === -1 || jsonEnd === -1) {
                    fileLog(`[FRED] ❌ No JSON found in output: ${stdout}`);
                    throw new Error('No JSON object found in stdout');
                }
                const jsonString = stdout.substring(jsonStart, jsonEnd + 1);
                const result = JSON.parse(jsonString);

                if (result.success) {
                    console.log(`[FRED] ✅ Success: ${seriesId} (${result.data?.length || 0} items)`);
                    fredCache[cacheKey] = { timestamp: Date.now(), data: result };
                } else {
                    fileLog(`[FRED] ❌ Script failure: ${result.error}`);
                }
                res.json(result);
            } catch (e) {
                fileLog(`[FRED] ❌ JSON Parse Error: ${e.message}, Output: ${stdout}`);
                res.status(500).json({ success: false, error: 'Invalid output from script: ' + stdout });
            }
        });
    };

    runFred('python');
});

/**
 * 사용자 설정 저장 및 불러오기 API
 */
const SETTINGS_FILE = path.join(__dirname, 'user_settings.json');

app.get('/api/settings', (req, res) => {
    console.log("📥 GET /api/settings 요청됨");
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            res.json({ success: true, data: JSON.parse(data) });
            console.log("✅ 설정 불러오기 성공");
        } else {
            res.json({ success: true, data: null });
            console.log("ℹ️ 설정 파일 없음");
        }
    } catch (error) {
        console.error("❌ 설정 불러오기 에러:", error.message);
        res.status(500).json({ error: "설정을 불러오는데 실패했습니다." });
    }
});

app.post('/api/settings', (req, res) => {
    console.log(`📤 POST /api/settings 요청됨 (Body Size: ${JSON.stringify(req.body).length})`);
    try {
        const settings = req.body;
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
        res.json({ success: true });
        console.log("✅ 설정 저장 완료");
    } catch (error) {
        console.error("❌ 설정 저장 에러:", error.message);
        res.status(500).json({ error: "설정을 저장하는데 실패했습니다." });
    }
});

/**
 * ECOS (한국은행 경제통계시스템) API 프록시
 */
app.get('/api/ecos', async (req, res) => {
    const table = req.query.table || '817Y002'; // 기본값: 817Y002 (일일 금리)
    const item = req.query.item;
    const start = req.query.start;
    const end = req.query.end;

    if (!item || !start || !end) {
        return res.status(400).json({ success: false, error: 'item, start, end 파라미터가 필요합니다.' });
    }

    const apiKey = process.env.ECOS_APIKEY;
    if (!apiKey) {
        return res.status(500).json({ success: false, error: 'ECOS_APIKEY가 설정되지 않았습니다.' });
    }

    // URL Construction: https://ecos.bok.or.kr/api/StatisticSearch/KEY/json/kr/1/100000/TABLE/D/START/END/ITEM
    // numOfdata is set to 100000 to fetch all data in range as requested ("불러온 데이터를 모두 보여주도록 계산해")
    const url = `https://ecos.bok.or.kr/api/StatisticSearch/${apiKey}/json/kr/1/100000/${table}/D/${start}/${end}/${item}`;

    console.log(`[ECOS] 🔄 Requesting: ${table}/${item} (${start} ~ ${end})`);

    try {
        const response = await axios.get(url, { timeout: 30000 }); // Increased timeout to 30s
        const result = response.data;

        if (result.StatisticSearch && result.StatisticSearch.row) {
            const rowCount = result.StatisticSearch.row.length;
            console.log(`[ECOS] ✅ Success: ${item} (${rowCount} items)`);
            res.json({
                success: true,
                data: result.StatisticSearch.row
            });
        } else {
            const errorCode = result.RESULT ? result.RESULT.CODE : (result.StatisticSearch ? result.StatisticSearch.RESULT.CODE : 'Unknown');
            const errorMsg = result.RESULT ? result.RESULT.MESSAGE : (result.StatisticSearch ? result.StatisticSearch.RESULT.MESSAGE : '해당하는 데이터가 없습니다.');

            console.warn(`[ECOS] ⚠️ Response: ${errorCode} - ${errorMsg}`);

            res.json({
                success: false,
                error: errorMsg,
                code: errorCode,
                raw: result
            });
        }
    } catch (error) {
        console.error(`[ECOS] ❌ Fetch Error: ${error.message} (URL: ${url})`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 2. 그 다음 정적 파일 서빙
app.use(express.static(path.join(__dirname, 'public')));

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

    if (response.data.return_code !== undefined && response.data.return_code !== 0) {
        const errMsg = response.data.return_msg || `키움 인증 실패 (코드: ${response.data.return_code})`;
        fileLog(`❌ 키움 토큰 발급 실패: ${errMsg}`);
        throw new Error(errMsg);
    }

    const token = response.data.token || response.data.access_token;
    if (!token) {
        throw new Error(`토큰 필드가 없습니다. 응답: ${JSON.stringify(response.data)}`);
    }

    console.log(`DEBUG: New token issued. Length: ${token.length}, First 10 chars: ${token.substring(0, 10)}...`);

    // 2. 토큰 및 만료 시간 캐싱 (기본 만료시간이 없을 경우 24시간으로 설정)
    const expiresIn = response.data.expires_in || 86400; // 초 단위
    cachedToken = token;
    tokenExpiryTime = Date.now() + (expiresIn * 1000);

    fileLog(`토큰 발급 완료 (만료: ${new Date(tokenExpiryTime).toLocaleString()})`);
    return token;
}

// eFriend 토큰 캐싱을 위한 전역 변수
let efriendCachedToken = null;
let efriendTokenExpiryTime = 0;

/**
 * 한국투자증권(eFriend) Access Token 발급
 */
async function getEfriendAccessToken(domain, appKey, secretKey) {
    if (efriendCachedToken && Date.now() < (efriendTokenExpiryTime - 300000)) {
        return efriendCachedToken;
    }

    fileLog("eFriend 새로운 Access Token 발급 시도...");
    try {
        const response = await axios.post(
            `${domain}/oauth2/tokenP`,
            {
                grant_type: "client_credentials",
                appkey: appKey,
                appsecret: secretKey,
            },
            {
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                },
                timeout: 5000
            }
        );

        const token = response.data.access_token;
        if (token) {
            const expiresIn = response.data.expires_in || 86400; // 초 단위
            efriendCachedToken = token;
            efriendTokenExpiryTime = Date.now() + (expiresIn * 1000);
            fileLog(`eFriend 토큰 발급 완료`);
            return token;
        } else {
            const bodyStr = JSON.stringify(response.data);
            throw new Error(`한국투자증권 토큰 발급 실패: 응답에 access_token 필드가 없습니다. Body: ${bodyStr}`);
        }
    } catch (error) {
        const errorData = error.response?.data;
        console.error("한국투자증권 토큰 발급 에러:", errorData || error.message);
        throw error;
    }
}

app.listen(PORT, () => {
    console.log("\n" + "=".repeat(50));
    console.log(`🚀 서버 구동 완료! (VERSION: SET EXTREMES)`);
    console.log(`링크: http://localhost:${PORT}`);
    console.log(`서버 시작 시간: ${SERVER_START_TIME}`);
    console.log("=".repeat(50) + "\n");

    // 로그 버퍼링 방지를 위한 주기적 점검 (옵션)
    setInterval(() => {
        // keep-alive logging
        // console.log(`[Heartbeat] Server is running... ${new Date().toLocaleTimeString()}`);
    }, 60000);
});
