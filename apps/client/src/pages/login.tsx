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
    <div className="flex h-[100vh] w-[100vw] items-center justify-center">
      <form
        onSubmit={(e) => e.preventDefault()}
        className="flex w-full max-w-xs flex-col items-center justify-center gap-4 rounded-xl bg-gray-900 p-5"
      >
        <div className="form-control w-full">
          <label className="label-text label">Username</label>
          <input
            className="input-bordered input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="form-control w-full">
          <label className="label-text label">Password</label>
          <input
            type="password"
            className="input-bordered input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" onClick={handleSignIn} className="btn btn-accent">
          Sign In
        </button>
      </form>
    </div>
  );
};

export default Login;
