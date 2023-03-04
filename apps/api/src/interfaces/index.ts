import { User } from "@prisma/client";
import { Request, Response } from "express";

export type IAuthUser = Pick<User, "username" | "id" | "roles"> & {
  iat: number;
  exp: number;
};
export type IContextRequest = Request & {
  user?: IAuthUser;
  tokens?: { authorization: string; refresh_token: string };
};

export type IContext = {
  req: IContextRequest;
  res: Response;
  user?: IAuthUser;
};
