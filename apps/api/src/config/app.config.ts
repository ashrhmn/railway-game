export const CONFIG = {
  JWT: {
    SECRET: {
      ACCESS:
        process.env.ACCESS_TOKEN_JWT_SECRET || "access_token_not_configured",
      REFRESH:
        process.env.REFRESH_TOKEN_JWT_SECRET || "refresh_token_not_configured",
    },
    TIMEOUT: {
      ACCESS: +(process.env.ACCESS_TOKEN_TIMEOUT || 300), // 5 minutes default
      REFRESH: "365d",
    },
  },
  NODE_ENV: process.env.NODE_ENV || "development",
};
