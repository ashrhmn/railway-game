import {
  BadRequestException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { hash, verify } from "argon2";
import { createAsyncService, createService } from "src/utils/common.utils";
import { endpoints } from "api-interface";
import { PrismaService } from "../prisma/prisma.service";
import { generateTokens, getRefreshTokenUser } from "src/utils/auth.utils";
import { CONFIG } from "src/config/app.config";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  login = createAsyncService<typeof endpoints.auth.login>(
    async ({ body }, { res }) => {
      const { username, password } = body;
      const user = await this.prisma.user.findFirst({
        where: {
          username,
        },
      });

      if (!user) throw new HttpException("Invalid Username or Password", 400);

      const isCorrectPassword = await verify(user.password, password).catch(
        () => false,
      );

      if (!isCorrectPassword)
        throw new HttpException("Invalid Username or Password", 400);

      const { access_token, refresh_token } = generateTokens(user);
      res.cookie("authorization", access_token, {
        httpOnly: true,
        expires: new Date(Date.now() + CONFIG.JWT.TIMEOUT.ACCESS * 1000),
        secure: CONFIG.NODE_ENV === "production",
      });
      res.cookie("refresh_token", refresh_token, {
        httpOnly: true,
        secure: CONFIG.NODE_ENV === "production",
      });
      return { access_token, refresh_token };
    },
  );

  signup = createAsyncService<typeof endpoints.auth.signup>(
    async ({ body }, { res }) => {
      const { username, password: plainPassword, confirmPassword } = body;
      if (plainPassword !== confirmPassword)
        throw new BadRequestException("Both passwords must match");

      const existingUser = await this.prisma.user.findFirst({
        where: {
          username,
        },
      });

      if (!!existingUser)
        throw new BadRequestException("Username already in use");

      const password = await hash(plainPassword);

      const user = await this.prisma.user.create({
        data: { username, password, roles: ["USER"] },
      });
      const { access_token, refresh_token } = generateTokens(user);
      res.cookie("authorization", access_token, {
        httpOnly: true,
        expires: new Date(Date.now() + CONFIG.JWT.TIMEOUT.ACCESS * 1000),
        secure: CONFIG.NODE_ENV === "production",
      });
      res.cookie("refresh_token", refresh_token, {
        httpOnly: true,
        secure: CONFIG.NODE_ENV === "production",
      });

      return "success";
    },
  );

  currentUser = createAsyncService<typeof endpoints.auth.currentUser>(
    async (_, { user }) => {
      if (!!user) return user;
      // throw new UnauthorizedException();
      throw new HttpException("message", 401);
    },
  );

  logout = createService<typeof endpoints.auth.logout>((_, { res }) => {
    res.clearCookie("authorization");
    res.clearCookie("refresh_token");
    return res.redirect("/login");
  });

  refreshToken = createAsyncService<typeof endpoints.auth.refreshToken>(
    async (_, { req }) => {
      const user = getRefreshTokenUser(req);
      if (!user) throw new UnauthorizedException();
      const dbUser = await this.prisma.user.findFirst({
        where: { username: user.username },
      });
      if (!dbUser) throw new UnauthorizedException();
      const { access_token, refresh_token } = generateTokens(dbUser);
      return { access_token, refresh_token };
    },
  );
}
