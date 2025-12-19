const axios = require('axios');

// 여기에 발급받은 키를 직접 입력해서 테스트하세요
const APP_KEY = "W62_plrNeKZvLGo7nJmj03cYnOfBo5oWu6jWhtFyGEU";
const SECRET_KEY = "V3Sph2gnN__fIx38wxKl8pSDDLDbfGDBxgsrh-rQKdM";

async function testKiwoomAPI() {
    try {
        console.log("1. 토큰 발급 시도...");
        console.log(`Using AppKey: ${APP_KEY.substring(0, 5)}...`);

        // URL 및 파라미터 수정 (/oauth/token -> /oauth2/token, appsecret -> secretkey)
        const tokenResponse = await axios.post(
            "https://api.kiwoom.com/oauth2/token",
            {
                appkey: APP_KEY,
                secretkey: SECRET_KEY,
                grant_type: "client_credentials",
            },
            {
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("✅ 토큰 발급 성공!");
        console.log("전체 응답 데이터:", JSON.stringify(tokenResponse.data, null, 2));

        // 키움 API 문서에 따르면 'token' 필드를 사용함
        const accessToken = tokenResponse.data.token || tokenResponse.data.access_token;

        if (!accessToken) {
            console.error("❌ 에러: 응답 데이터에서 토큰을 찾을 수 없습니다.");
            return;
        }

        console.log(`추출된 Access Token: ${accessToken.substring(0, 10)}...`);

        console.log("\n2. 실시간 종목 순위 조회 시도...");
        // ka00198 API 필수 파라미터 보강 (qry_tp 추가)
        const dataResponse = await axios.post(
            "https://api.kiwoom.com/api/dostk/stkinfo",
            {
                "qry_tp": "1",         // 조회구분 (1: 실시간조회순위)
                "mrkt_tp": "000",      // 시장구분 (000: 전체, 001: 코스피, 101: 코스닥)
                "sort_tp": "1",        // 정렬구분 (1: 순회수정 등)
                "trde_qty_tp": "0000", // 거래량구분
                "stk_cnd": "0",        // 종목조건
                "crd_cnd": "0",        // 신용조건
                "stex_tp": "1"         // 거래소구분
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                    "api-id": "ka00198",
                }
            }
        );

        console.log("✅ 데이터 조회 성공!");
        console.log("데이터 샘플:", JSON.stringify(dataResponse.data, null, 2).substring(0, 300) + "...");

    } catch (error) {
        console.error("\n❌ 테스트 실패!");
        if (error.response) {
            console.error(`HTTP Status: ${error.response.status}`);
            console.error("Error Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Error Message:", error.message);
            if (error.stack) console.error("Stack Trace:", error.stack);
        }
    }
}

testKiwoomAPI();
