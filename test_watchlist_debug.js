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

        console.log("📥 Token 응답 Raw Data:", JSON.stringify(tokenRes.data, null, 2));

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

    // Case 2-A: 표준 헤더 cont-yn: "n", next-key: "n", body: {}
    try {
        console.log("👉 [Case 2-A] POST https://api.kiwoom.com/api/dostk/watchlist (api-id: ka01300, body: {})");
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
        console.log("📋 Response Keys:", keys);

        // 파싱 시도
        let groups = [];
        for (const k of keys) {
            if (Array.isArray(resA.data[k])) {
                console.log(`✨ 발견된 배열 키: "${k}" (항목 수: ${resA.data[k].length})`);
                groups = resA.data[k];
                break;
            }
        }

        if (groups.length > 0) {
            console.log("📋 첫 번째 그룹 샘플:", groups[0]);
            foundGroupIds = groups.map(g => g.arn_grp_id || g.grp_id || g.group_id || g.id).filter(Boolean);
            console.log("📋 확인된 그룹 ID 목록:", foundGroupIds);
        }
    } catch (e) {
        console.error("❌ Case 2-A 에러:", e.response?.status, e.response?.data || e.message);
    }

    // Case 2-B: 대문자 N 헤더 및 빈 next-key 테스트
    try {
        console.log("\n👉 [Case 2-B] POST ka01300 (cont-yn: 'N', next-key: '')");
        const resB = await axios.post(
            "https://api.kiwoom.com/api/dostk/watchlist",
            {},
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                    "api-id": "ka01300",
                    "cont-yn": "N",
                    "next-key": ""
                },
                timeout: 10000
            }
        );
        console.log("📥 Status:", resB.status);
        console.log("📥 Response Body:", JSON.stringify(resB.data, null, 2));
    } catch (e) {
        console.error("❌ Case 2-B 에러:", e.response?.status, e.response?.data || e.message);
    }

    // ----------------------------------------------------
    // Step 3: 관심종목 그룹 상세조회 (ka01301) 테스트
    // ----------------------------------------------------
    console.log("\n--------------------------------------------------");
    console.log("3️⃣ [Step 3] 관심종목 그룹 상세조회(ka01301) 테스트...");

    const targetGrpIds = foundGroupIds.length > 0 ? foundGroupIds.slice(0, 5) : ["074", "001", "0", "1", "074 "];

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
            console.log(`📋 [그룹 ${testGrp}] Keys:`, detailKeys);

            let items = [];
            for (const k of detailKeys) {
                if (Array.isArray(resDetail.data[k])) {
                    console.log(`✨ [그룹 ${testGrp}] 발견된 종목 배열 키: "${k}" (종목 수: ${resDetail.data[k].length})`);
                    items = resDetail.data[k];
                    break;
                }
            }

            if (items.length > 0) {
                console.log(`📊 [그룹 ${testGrp}] 첫 3개 종목 샘플:`, JSON.stringify(items.slice(0, 3), null, 2));

                // 첫 번째 종목으로 ka10100 (시장구분) 및 ka10007 (거래대금) 테스트
                const firstItem = items[0];
                const sampleCode = (firstItem.stk_cd || firstItem.isu_cd || firstItem.item_cd || firstItem.code || firstItem.pdno || "").replace(/[^0-9a-zA-Z]/g, '');
                console.log(`\n🔍 샘플 종목 보정 테스트 (종목코드: ${sampleCode})...`);

                if (sampleCode) {
                    try {
                        const infoRes = await axios.post(
                            "https://api.kiwoom.com/api/dostk/stkinfo",
                            { "stk_cd": sampleCode },
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${accessToken}`,
                                    "api-id": "ka10100"
                                },
                                timeout: 5000
                            }
                        );
                        console.log("📥 ka10100 (시장구분) 응답:", infoRes.data);
                    } catch (e) {
                        console.error("❌ ka10100 실패:", e.response?.data || e.message);
                    }

                    try {
                        const mrkRes = await axios.post(
                            "https://api.kiwoom.com/api/dostk/mrkcond",
                            { "stk_cd": `${sampleCode}_AL` },
                            {
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${accessToken}`,
                                    "api-id": "ka10007"
                                },
                                timeout: 5000
                            }
                        );
                        console.log("📥 ka10007 (거래대금) 응답:", mrkRes.data);
                    } catch (e) {
                        console.error("❌ ka10007 실패:", e.response?.data || e.message);
                    }
                }
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

