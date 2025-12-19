const axios = require('axios');

// 환경변수에서 API 키 가져오기
// Vercel 프로젝트 설정에서 Environment Variables로 등록해야 함
const appKey = process.env.KIWOOM_APPKEY;
const secretKey = process.env.KIWOOM_SECRETKEY;

/**
 * 키움 API Access Token 발급
 */
async function getAccessToken(appKey, secretKey) {
    try {
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
                },
            }
        );


        const token = response.data.token || response.data.access_token;
        if (token) {
            return token;
        } else {
            throw new Error("토큰 발급 실패: 응답에 token 필드가 없습니다");
        }
    } catch (error) {
        console.error("토큰 발급 에러:", error.response?.data || error.message);
        throw new Error(`토큰 발급 실패: ${error.message}`);
    }
}

/**
 * Vercel Serverless Function Handler
 */
module.exports = async (req, res) => {
    // CORS 처리
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        if (!appKey || !secretKey) {
            res.status(500).json({
                error: "API 키가 설정되지 않았습니다. Vercel 환경변수를 설정해주세요.",
            });
            return;
        }

        // 1. Access Token 발급
        console.log("키움 API 토큰 발급 중...");
        const accessToken = await getAccessToken(appKey, secretKey);
        console.log("토큰 발급 완료");

        // 2. 실시간종목조회순위 API 호출
        console.log("실시간종목조회순위 데이터 조회 중...");

        // 쿼리 파라미터 전달
        const queryParams = req.query;

        const apiResponse = await axios.get(
            "https://api.kiwoom.com/api/dostk/stkinfo",
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`,
                    "api_id": "ka00198",
                },
                params: queryParams,
            }
        );

        console.log("데이터 조회 완료");

        // 3. 응답 반환
        res.status(200).json({
            success: true,
            data: apiResponse.data,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error("API 호출 에러:", error.response?.data || error.message);

        res.status(500).json({
            success: false,
            error: error.message,
            details: error.response?.data || null,
            timestamp: new Date().toISOString(),
        });
    }
};
