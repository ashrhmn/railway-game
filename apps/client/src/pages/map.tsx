import service from "@/service";
import { serverSideAuth } from "@/service/serverSideAuth";
import { endpoints } from "api-interface";
import { GetServerSideProps, GetServerSidePropsContext, NextPage } from "next";
import Link from "next/link";

const getColors = (context: GetServerSidePropsContext) =>
  service(endpoints.map.getColors, context)({}).catch(() => null);

type Props = {
  colors: Awaited<ReturnType<typeof getColors>>;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const auth = await serverSideAuth(context);
  if (!("user" in auth.props)) return auth;
  const colors = await getColors(context);
  return { props: { ...auth.props, colors } };
};

const Map: NextPage<Props> = ({ colors }) => {
  if (!colors) return <div>Error retriving colors</div>;
  return (
    <>
      <div className="flex gap-3 text-2xl flex-wrap p-3">
        {colors.map((color) => (
          <Link key={color} href={`/map/${color}`}>
            {color}
          </Link>
        ))}
      </div>
    </>
  );
};

export default Map;
