import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { verify } from "argon2";
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
      const user = await this.prisma.user.findUnique({
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

  currentUser = createService<typeof endpoints.auth.currentUser>(
    (_, { user }) => {
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
      const dbUser = await this.prisma.user.findUnique({
        where: { username: user.username },
      });
      if (!dbUser) throw new UnauthorizedException();
      const { access_token, refresh_token } = generateTokens(dbUser);
      return { access_token, refresh_token };
    },
  );
}
