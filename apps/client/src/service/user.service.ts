import { endpoints } from "api-interface";
import { GetServerSidePropsContext } from "next";
import service from ".";

export const getUsers = (context?: GetServerSidePropsContext) =>
  service(endpoints.user.getAllUsers, context)({}).catch(() => null);

export const getRoles = (context?: GetServerSidePropsContext) =>
  service(endpoints.user.getRoles, context)({}).catch(() => null);
