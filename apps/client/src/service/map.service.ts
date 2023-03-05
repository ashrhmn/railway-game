import { endpoints } from "api-interface";
import service from ".";
import { GetServerSidePropsContext } from "next";

export const getColors = (context?: GetServerSidePropsContext) =>
  service(endpoints.map.getColors, context)({}).catch(() => null);
export const getGames = (context?: GetServerSidePropsContext) =>
  service(endpoints.game.getAll, context)({}).catch(() => null);
export const getNftJobs = (context?: GetServerSidePropsContext) =>
  service(endpoints.map.getNftJobs, context)({}).catch(() => null);
export const getMapItems = (context?: GetServerSidePropsContext) =>
  service(endpoints.map.getMapItems, context)({}).catch(() => null);
