import RootLayout from "@/layouts/RootLayout";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

export const getInitialProps = async () => {
  return { a: "b" };
};

export default function App({ Component, pageProps }: AppProps) {
  return (
    <RootLayout pageProps={pageProps}>
      <Component {...pageProps} />
    </RootLayout>
  );
}
