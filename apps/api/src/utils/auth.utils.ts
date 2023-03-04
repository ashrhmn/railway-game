import { User } from "@prisma/client";
import { Request } from "express";
import { verify } from "jsonwebtoken";
import { CONFIG } from "src/config/app.config";
import { sign } from "jsonwebtoken";
import { IAuthUser } from "src/interfaces";

export const getUser = (req: Request) => {
  try {
    const access_token = req.cookies.authorization || req.headers.authorization;
    if (!access_token || typeof access_token !== "string") return null;
    return verify(access_token, CONFIG.JWT.SECRET.ACCESS) as IAuthUser;
  } catch (err) {
    // console.error("req.user error : ", err);
    return null;
  }
};

export const getRefreshTokenUser = (req: Request) => {
  try {
    const refresh_token =
      req.cookies.refresh_token || req.headers.refresh_token;
    if (!refresh_token || typeof refresh_token !== "string") return null;
    return verify(refresh_token, CONFIG.JWT.SECRET.REFRESH) as IAuthUser;
  } catch (err) {
    // console.error("req.user error : ", err);
    return null;
  }
};

export const generateTokens = (user: User) => {
  const { password: _, ...payload } = user;

  const access_token = sign(payload, CONFIG.JWT.SECRET.ACCESS, {
    expiresIn: CONFIG.JWT.TIMEOUT.ACCESS,
  });

  const { roles: __, ...refreshTokenPayload } = payload;

  const refresh_token = sign(refreshTokenPayload, CONFIG.JWT.SECRET.REFRESH, {
    expiresIn: CONFIG.JWT.TIMEOUT.REFRESH,
  });
  return { access_token, refresh_token };
};
