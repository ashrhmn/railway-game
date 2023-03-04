import service from "@/service";
import { endpoints, InferOutputs } from "api-interface";
import { GetServerSideProps } from "next";
import Link from "next/link";

export const getServerSideProps: GetServerSideProps = async (context) =>
  service(
    endpoints.auth.currentUser,
    context,
  )({})
    .then((user) => ({ props: { user } }))
    .catch(() => ({
      props: {},
      redirect: { destination: "/login", statusCode: 301 },
    }));

const Dashboard = ({
  user,
}: {
  user: InferOutputs<typeof endpoints.auth.currentUser>;
}) => {
  return (
    <div className="p-3">
      <div className="flex justify-end items-center p-2">
        <Link
          href={`/api/auth/logout`}
          className="bg-red-600 text-white p-1 rounded"
        >
          Logout
        </Link>
      </div>
      <h1>Welcome, {user.username}</h1>
      <p>Roles : {user.roles.join(" | ")}</p>
    </div>
  );
};

export default Dashboard;
