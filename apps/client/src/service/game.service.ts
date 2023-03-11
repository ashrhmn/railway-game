import { endpoints } from "api-interface";
import { GetServerSidePropsContext } from "next";
import service from ".";

export const getAllGames = (context?: GetServerSidePropsContext) =>
  service(endpoints.game.getAll, context)({}).catch(() => null);

export const getAllGameStatus = (context?: GetServerSidePropsContext) =>
  service(endpoints.game.getAllStatus, context)({}).catch(() => null);
