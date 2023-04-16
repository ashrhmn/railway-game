import ErrorView from "@/components/common/ErrorView";
import FullScreenSpinner from "@/components/common/FullScreenSpinner";
import SelectColorGame from "@/components/common/SelectColorGame";
import MapView from "@/components/map/MapView";
import service from "@/service";

import {
  getColors,
  getGames,
  getNftJobs,
  getMapItems,
} from "@/service/map.service";
import { serverSideAuth } from "@/service/serverSideAuth";
import { getCurrentUser } from "@/service/user.service";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "api-interface";
import { GetServerSideProps, NextPage } from "next";
import { useEffect, useState } from "react";

type Props = {
  colors: Awaited<ReturnType<typeof getColors>>;
  games: Awaited<ReturnType<typeof getGames>>;
  nftJobs: Awaited<ReturnType<typeof getNftJobs>>;
  mapItems: Awaited<ReturnType<typeof getMapItems>>;
  user: Awaited<ReturnType<typeof getCurrentUser>>;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const auth = await serverSideAuth(context);
  if ("redirect" in auth) return auth;
  const [colors, nftJobs, mapItems] = await Promise.all([
    getColors(context),
    getNftJobs(context),
    getMapItems(context),
  ]);

  return { props: { ...auth.props, colors, nftJobs, mapItems } };
};

const Map: NextPage<Props> = ({
  colors,
  mapItems,
  nftJobs,
  user: { roles },
}) => {
  const {
    data: games,
    error,
    status,
  } = useQuery({
    queryKey: ["games"],
    queryFn: () => service(endpoints.game.getAll)({}),
  });
  const [selectedColor, setSelectedColor] = useState(
    !!colors && typeof colors?.[0] === "string" ? colors[0] : undefined
  );
  const [selectedGameId, setSelectedGameId] = useState<string | undefined>(
    undefined
  );
  useEffect(() => {
    setSelectedGameId((v) => v || games?.[0]?.id);
  }, [games]);
  if (status === "error") return <ErrorView error={error} />;
  if (status === "loading") return <FullScreenSpinner />;
  return (
    <>
      <SelectColorGame
        colors={colors}
        games={games}
        selectedColor={selectedColor}
        selectedGameId={selectedGameId}
        setSelectedColor={setSelectedColor as any}
        setSelectedGameId={setSelectedGameId}
      />
      {!!selectedColor && !!selectedGameId && (
        <MapView
          color={selectedColor}
          gameId={selectedGameId}
          mapItems={mapItems}
          nftJobs={nftJobs}
          roles={roles}
        />
      )}
    </>
  );
};

export default Map;
