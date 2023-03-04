import Link from "next/link";
import { ReactNode } from "react";
import { Toaster } from "react-hot-toast";

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <>
      <nav className="text-xl flex w-full justify-end items-center gap-4 p-4">
        <Link href={`/`}>Dashboard</Link>
        <Link href={`/login`}>Login</Link>
        <Link href={`/signup`}>Sign Up</Link>
      </nav>
      <main>{children}</main>
      <Toaster position="bottom-right" />
    </>
  );
};

export default RootLayout;
