import service from "@/service";
import { handleReqError } from "@/utils/error.utils";
import { promiseToast } from "@/utils/toast.utils";
import { endpoints } from "api-interface";
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useState } from "react";

export const getServerSideProps: GetServerSideProps = async (context) =>
  service(
    endpoints.auth.currentUser,
    context
  )({})
    .then(() => ({
      props: {},
      redirect: { destination: "/", statusCode: 301 },
    }))
    .catch(() => ({ props: {} }));

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  const handleSignIn = () =>
    promiseToast(
      service(endpoints.auth.login)({ body: { username, password } }),
      {
        loading: "Signing In...",
      }
    )
      .then(() => router.push("/"))
      .catch(handleReqError);
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <input
        className="rounded border-2 border-neutral-600 p-2 text-xl"
        value={username}
        placeholder="Username"
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        className="rounded border-2 border-neutral-600 p-2 text-xl"
        value={password}
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <div>
        <button
          onClick={handleSignIn}
          className="rounded bg-blue-500 p-2 text-white"
        >
          Sign In
        </button>
      </div>
    </div>
  );
};

export default Login;
