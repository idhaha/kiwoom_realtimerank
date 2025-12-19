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
        const dataResponse = await axios.get(
            "https://api.kiwoom.com/api/dostk/stkinfo",
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                    "api_id": "ka00198",
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
