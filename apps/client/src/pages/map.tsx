import SelectColorGame from "@/components/common/SelectColorGame";
import MapView from "@/components/map/MapView";

import {
  getColors,
  getGames,
  getNftJobs,
  getMapItems,
} from "@/service/map.service";
import { serverSideAuth } from "@/service/serverSideAuth";
import { getCurrentUser } from "@/service/user.service";
import { GetServerSideProps, NextPage } from "next";
import { useState } from "react";

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
  const [colors, games, nftJobs, mapItems] = await Promise.all([
    getColors(context),
    getGames(context),
    getNftJobs(context),
    getMapItems(context),
  ]);

  return { props: { ...auth.props, colors, games, nftJobs, mapItems } };
};

const Map: NextPage<Props> = ({
  colors,
  games,
  mapItems,
  nftJobs,
  user: { roles },
}) => {
  const [selectedColor, setSelectedColor] = useState(
    !!colors && typeof colors?.[0] === "string" ? colors[0] : undefined
  );
  const [selectedGameId, setSelectedGameId] = useState(
    !!games && typeof games?.[0]?.id === "string" ? games[0].id : undefined
  );
  return (
    <>
      <SelectColorGame
        colors={colors}
        games={games}
        selectedColor={selectedColor}
        selectedGameId={selectedGameId}
        setSelectedColor={setSelectedColor}
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
