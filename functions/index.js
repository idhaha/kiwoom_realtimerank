const functions = require("firebase-functions");
const axios = require("axios");
const cors = require("cors")({ origin: true });

/**
 * 키움 API Access Token 발급
 */
async function getAccessToken(appKey, secretKey) {
  try {
    const response = await axios.post(
      "https://api.kiwoom.com/oauth/token",
      {
        appkey: appKey,
        appsecret: secretKey,
        grant_type: "client_credentials",
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (response.data && response.data.access_token) {
      return response.data.access_token;
    } else {
      throw new Error("토큰 발급 실패: access_token이 없습니다");
    }
  } catch (error) {
    console.error("토큰 발급 에러:", error.response?.data || error.message);
    throw new Error(`토큰 발급 실패: ${error.message}`);
  }
}

/**
 * 실시간종목조회순위 데이터 조회
 */
exports.getStockRanking = functions.https.onRequest((request, response) => {
  return cors(request, response, async () => {
    try {
      // 환경변수에서 API 키 가져오기 (process.env 우선, 없으면 functions.config() 사용)
      const appKey = process.env.KIWOOM_APPKEY || functions.config().kiwoom?.appkey;
      const secretKey = process.env.KIWOOM_SECRETKEY || functions.config().kiwoom?.secretkey;

      if (!appKey || !secretKey) {
        response.status(500).json({
          error: "API 키가 설정되지 않았습니다. " +
            "Firebase Functions 환경변수를 설정해주세요.",
          hint: "firebase functions:config:set " +
            "kiwoom.appkey=\"YOUR_KEY\" kiwoom.secretkey=\"YOUR_SECRET\"",
        });
        return;
      }

      // 1. Access Token 발급
      console.log("키움 API 토큰 발급 중...");
      const accessToken = await getAccessToken(appKey, secretKey);
      console.log("토큰 발급 완료");

      // 2. 실시간종목조회순위 API 호출
      console.log("실시간종목조회순위 데이터 조회 중...");
      const apiResponse = await axios.get(
        "https://api.kiwoom.com/api/dostk/stkinfo",
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "api_id": "ka00198",
          },
          params: request.query, // 클라이언트에서 전달된 쿼리 파라미터 사용
        },
      );

      console.log("데이터 조회 완료");

      // 3. 응답 반환
      response.status(200).json({
        success: true,
        data: apiResponse.data,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("API 호출 에러:", error.response?.data || error.message);

      response.status(500).json({
        success: false,
        error: error.message,
        details: error.response?.data || null,
        timestamp: new Date().toISOString(),
      });
    }
  });
});
