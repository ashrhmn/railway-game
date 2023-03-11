import { endpoints } from "api-interface";
import { GetServerSidePropsContext } from "next";
import service from ".";
import { formatSuccess, formatError } from "@/utils/error.utils";

export const getUsers = (context?: GetServerSidePropsContext) =>
  service(endpoints.user.getAllUsers, context)({})
    .then(formatSuccess)
    .catch(formatError);

export const getRoles = (context?: GetServerSidePropsContext) =>
  service(endpoints.user.getRoles, context)({}).catch(() => null);

export const getCurrentUser = (context?: GetServerSidePropsContext) =>
  service(endpoints.auth.currentUser, context)({});
