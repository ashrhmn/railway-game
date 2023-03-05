import MapView from "@/components/map/MapView";
import {
  getColors,
  getGames,
  getNftJobs,
  getMapItems,
} from "@/service/map.service";
import { serverSideAuth } from "@/service/serverSideAuth";
import { GetServerSideProps, NextPage } from "next";
import { useState } from "react";

type Props = {
  colors: Awaited<ReturnType<typeof getColors>>;
  games: Awaited<ReturnType<typeof getGames>>;
  nftJobs: Awaited<ReturnType<typeof getNftJobs>>;
  mapItems: Awaited<ReturnType<typeof getMapItems>>;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const auth = await serverSideAuth(context);
  if (!("user" in auth.props)) return auth;
  const [colors, games, nftJobs, mapItems] = await Promise.all([
    getColors(context),
    getGames(context),
    getNftJobs(context),
    getMapItems(context),
  ]);
  return { props: { ...auth.props, colors, games, nftJobs, mapItems } };
};

const Map: NextPage<Props> = ({ colors, games, mapItems, nftJobs }) => {
  const [selectedColor, setSelectedColor] = useState(
    !!colors && typeof colors?.[0] === "string" ? colors[0] : ""
  );
  const [selectedGameId, setSelectedGameId] = useState(
    !!games && typeof games?.[0]?.id === "string" ? games[0].id : ""
  );
  if (!games) return <div>Error retriving games</div>;
  if (!colors) return <div>Error retriving colors</div>;
  return (
    <>
      <div className="md:flex md:justify-end md:gap-2">
        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text">Select a Game</span>
          </label>
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="select-bordered select"
          >
            {games.map((game) => (
              <option value={game.id} key={game.name}>
                {game.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text">Select Map Color</span>
          </label>
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="select-bordered select"
          >
            {colors.map((color) => (
              <option value={color} key={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
      </div>
      <MapView
        color={selectedColor}
        gameId={selectedGameId}
        mapItems={mapItems}
        nftJobs={nftJobs}
      />
    </>
  );
};

export default Map;
