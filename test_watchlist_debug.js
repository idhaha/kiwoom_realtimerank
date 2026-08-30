require('dotenv').config();
const axios = require('axios');

async function runWatchlistDebug() {
    console.log("==================================================");
    console.log("🔍 [키움 관심종목 API 정밀 디버깅 도구]");
    console.log(`⏱ 실행 시각: ${new Date().toLocaleString()}`);
    console.log("==================================================");

    const appKey = (process.env.KIWOOM_APPKEY || "").trim();
    const secretKey = (process.env.KIWOOM_SECRETKEY || "").trim();

    if (!appKey || !secretKey) {
        console.error("❌ .env 파일에 KIWOOM_APPKEY 또는 KIWOOM_SECRETKEY가 설정되지 않았습니다.");
        return;
    }

    console.log(`🔑 AppKey: ${appKey.substring(0, 8)}... (총 길이: ${appKey.length})`);
    console.log(`🔑 SecretKey: ${secretKey.substring(0, 8)}... (총 길이: ${secretKey.length})`);

    // ----------------------------------------------------
    // Step 1: 토큰 발급 테스트
    // ----------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("1️⃣ [Step 1] Access Token 발급 요청...");
    let accessToken = null;
    try {
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

        if (tokenRes.data.return_code !== undefined && tokenRes.data.return_code !== 0) {
            console.error(`❌ 토큰 발급 실패 [${tokenRes.data.return_code}]: ${tokenRes.data.return_msg}`);
            return;
        }

        accessToken = tokenRes.data.token || tokenRes.data.access_token;
        if (!accessToken) {
            console.error("❌ 응답에 token 필드가 없습니다.");
            return;
        }
        console.log(`✅ Token 발급 성공! (${accessToken.substring(0, 15)}...)`);
    } catch (e) {
        console.error("❌ Token 요청 중 네트워크/HTTP 에러:", e.response?.data || e.message);
        return;
    }

    // ----------------------------------------------------
    // Step 2: 관심종목 그룹 리스트 (ka01300) 테스트
    // ----------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("2️⃣ [Step 2] 관심종목 그룹 리스트(ka01300) 조회 테스트...");
    let foundGroupIds = [];

    try {
        const resA = await axios.post(
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
                timeout: 10000
            }
        );

        console.log("📥 Status:", resA.status);
        console.log("📥 Response Body:", JSON.stringify(resA.data, null, 2));

        const keys = Object.keys(resA.data || {});
        let groups = [];
        for (const k of keys) {
            if (Array.isArray(resA.data[k])) {
                console.log(`✨ 발견된 배열 키: "${k}" (항목 수: ${resA.data[k].length})`);
                groups = resA.data[k];
                break;
            }
        }

        if (groups.length > 0) {
            foundGroupIds = groups.map(g => g.arn_grp_id || g.grp_id || g.group_id || g.id).filter(Boolean);
            console.log("📋 확인된 그룹 ID 목록:", foundGroupIds);
        }
    } catch (e) {
        console.error("❌ ka01300 에러:", e.response?.status, e.response?.data || e.message);
    }

    // ----------------------------------------------------
    // Step 3: 관심종목 그룹 상세조회 (ka01301) 테스트
    // ----------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("3️⃣ [Step 3] 관심종목 그룹 상세조회(ka01301) 테스트...");

    const targetGrpIds = foundGroupIds.length > 0 ? foundGroupIds.slice(0, 5) : ["074", "074 "];

    for (const testGrp of targetGrpIds) {
        console.log(`\n👉 그룹 ID: "${testGrp}" 상세조회 시도...`);
        try {
            const resDetail = await axios.post(
                "https://api.kiwoom.com/api/dostk/watchlist",
                {
                    "arn_grp_id": String(testGrp)
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${accessToken}`,
                        "api-id": "ka01301",
                        "cont-yn": "n",
                        "next-key": "n"
                    },
                    timeout: 10000
                }
            );

            console.log(`📥 [그룹 ${testGrp}] Status:`, resDetail.status);
            console.log(`📥 [그룹 ${testGrp}] Response Body:`, JSON.stringify(resDetail.data, null, 2));

            const detailKeys = Object.keys(resDetail.data || {});
            let items = [];
            if (Array.isArray(resDetail.data.nofj)) {
                items = resDetail.data.nofj;
            } else {
                for (const k of detailKeys) {
                    if (Array.isArray(resDetail.data[k])) {
                        items = resDetail.data[k];
                        break;
                    }
                }
            }

            if (items.length > 0) {
                console.log(`\n📊 [그룹 ${testGrp}] 발견된 종목 수: ${items.length}개`);
                console.log(`📊 종목 보정 (시장구분 ka10100 & 거래대금/등락률 ka10007) 시작...`);

                const enrichedList = [];
                for (let i = 0; i < Math.min(items.length, 10); i++) {
                    const item = items[i];
                    const code = (item.cod2 || item.stk_cd || item.isu_cd || item.code || "").replace(/[^0-9a-zA-Z]/g, '');
                    if (!code) continue;

                    let name = code;
                    let mkt = 'Q';
                    let trdeAmt = 0;
                    let flucRt = '0';

                    // ka10100
                    try {
                        const infoRes = await axios.post(
                            "https://api.kiwoom.com/api/dostk/stkinfo",
                            { "stk_cd": code },
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${accessToken}`,
                                    "api-id": "ka10100"
                                },
                                timeout: 3000
                            }
                        );
                        const b = infoRes.data;
                        name = b.stk_nm || b.name || b.isu_nm || name;
                        const mktNm = b.marketName || b.mkt_nm || '';
                        if (mktNm.includes("거래소") || mktNm.includes("KOSPI")) mkt = 'K';
                    } catch (e) {}

                    // ka10007
                    try {
                        const mrkRes = await axios.post(
                            "https://api.kiwoom.com/api/dostk/mrkcond",
                            { "stk_cd": `${code}_AL` },
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${accessToken}`,
                                    "api-id": "ka10007"
                                },
                                timeout: 3000
                            }
                        );
                        const d = mrkRes.data;
                        trdeAmt = parseInt(d.trde_prica) || 0;
                        flucRt = d.flu_rt || d.fluc_rt || d.base_comp_chgr || d.prdy_ctrt || '0';
                        if (!name && d.stk_nm) name = d.stk_nm;
                    } catch (e) {}

                    enrichedList.push({
                        code,
                        name,
                        market: mkt,
                        drop_rate: parseFloat(flucRt) || 0,
                        trade_amount: trdeAmt
                    });

                    await new Promise(r => setTimeout(r, 100));
                }

                // 하락률 순 정렬 (오름차순: 마이너스가 큰 순서)
                enrichedList.sort((a, b) => a.drop_rate - b.drop_rate);

                console.log("\n==================================================");
                console.log(`🏆 [그룹 ${testGrp}] 관심종목 하락률 순위 결과 (상위 10개)`);
                console.log("==================================================");
                console.table(enrichedList.map((stk, idx) => ({
                    "순위": idx + 1,
                    "시장": stk.market,
                    "종목명": stk.name,
                    "등락률": `${stk.drop_rate > 0 ? '+' : ''}${stk.drop_rate.toFixed(2)}%`,
                    "거래대금(백만)": stk.trade_amount.toLocaleString()
                })));
            }
        } catch (e) {
            console.error(`❌ [그룹 ${testGrp}] ka01301 실패:`, e.response?.status, e.response?.data || e.message);
        }
    }

    console.log("\n==================================================");
    console.log("🏁 [디버깅 완료]");
    console.log("==================================================");
}

runWatchlistDebug();
