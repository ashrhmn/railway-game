import RootLayout from "@/layouts/RootLayout";
import "@/styles/globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DAppProvider } from "@usedapp/core";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { Toaster } from "react-hot-toast";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      keepPreviousData: true,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <DAppProvider config={{}}>
      <QueryClientProvider client={queryClient}>
        {router.asPath === "/" ? (
          <Component {...pageProps} />
        ) : (
          <RootLayout pageProps={pageProps}>
            <Component {...pageProps} />
          </RootLayout>
        )}
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    </DAppProvider>
  );
}
