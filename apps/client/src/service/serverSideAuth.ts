import { endpoints } from "api-interface";
import { GetServerSidePropsContext } from "next";
import service from ".";

export const serverSideAuth = async (context: GetServerSidePropsContext) =>
  service(
    endpoints.auth.currentUser,
    context
  )({})
    .then((user) => ({ props: { user } }))
    .catch(() => ({
      redirect: { destination: "/login", permanent: true },
    }));
