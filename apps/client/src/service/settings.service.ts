import { endpoints } from "api-interface";
import { GetServerSidePropsContext } from "next";
import service from ".";

export const getAllSettings = (context?: GetServerSidePropsContext) =>
  service(endpoints.settings.getAll, context)({}).catch(() => null);
