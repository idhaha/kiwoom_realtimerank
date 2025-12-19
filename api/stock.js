const axios = require('axios');

// 환경변수에서 API 키 가져오기
const appKey = (process.env.KIWOOM_APPKEY || "").trim();
const secretKey = (process.env.KIWOOM_SECRETKEY || "").trim();

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
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                timeout: 5000
            }
        );


        const token = response.data.token || response.data.access_token;
        if (token) {
            return token;
        } else {
            const bodyKeys = Object.keys(response.data || {}).join(', ');
            const bodyStr = JSON.stringify(response.data);
            throw new Error(`토큰 발급 실패: 응답에 token 필드가 없습니다. Keys: [${bodyKeys}], Body: ${bodyStr}`);
        }
    } catch (error) {
        const errorData = error.response?.data;
        console.error("토큰 발급 에러:", errorData || error.message);
        const detailedMessage = errorData ? JSON.stringify(errorData) : error.message;
        throw new Error(`토큰 발급 실패: ${detailedMessage}`);
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
        let accessToken = null;
        try {
            console.log("키움 API 토큰 발급 중...");
            accessToken = await getAccessToken(appKey, secretKey);
            console.log("토큰 발급 완료");
        } catch (tokenError) {
            console.error("토큰 발급 실패:", tokenError.message);
            res.status(500).json({
                success: false,
                error: tokenError.message,
                phase: "token_issuance",
                timestamp: new Date().toISOString()
            });
            return;
        }

        // 2. 실시간종목조회순위 API 호출 (POST 방식 및 필수 파라미터 적용)
        console.log("실시간종목조회순위 데이터 조회 중...");

        const apiResponse = await axios.post(
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

        console.log("데이터 조회 완료");

        // 3. 응답 데이터 가공 (item_inq_rank 추출)
        const rawData = apiResponse.data;
        const stocks = rawData.item_inq_rank || [];

        // 3. 응답 반환
        res.status(200).json({
            success: true,
            data: stocks,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        const errorData = error.response?.data;
        console.error("데이터 조회 에러:", errorData || error.message);

        res.status(500).json({
            success: false,
            error: error.message,
            details: errorData || null,
            phase: "data_fetching",
            timestamp: new Date().toISOString()
        });
    }
};
