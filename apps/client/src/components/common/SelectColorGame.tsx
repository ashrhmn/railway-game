import { getColors, getGames } from "@/service/map.service";
import React from "react";

type Props = {
  colors: Awaited<ReturnType<typeof getColors>>;
  games: Awaited<ReturnType<typeof getGames>>;
  selectedColor: string | undefined;
  setSelectedColor: React.Dispatch<React.SetStateAction<string | undefined>>;
  selectedGameId: string | undefined;
  setSelectedGameId: React.Dispatch<React.SetStateAction<string | undefined>>;
  colorAllOption?: boolean;
  hideColor?: boolean;
};

const SelectColorGame = ({
  colors,
  hideColor,
  games,
  selectedColor,
  selectedGameId,
  setSelectedColor,
  setSelectedGameId,
  colorAllOption,
}: Props) => {
  if (!games) return <div>Error retriving games</div>;
  if (!colors) return <div>Error retriving colors</div>;
  return (
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
      {!hideColor && (
        <div className="form-control w-full max-w-xs">
          <label className="label">
            <span className="label-text">Select Map Color</span>
          </label>
          <select
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="select-bordered select"
          >
            {colorAllOption && <option value={undefined}>All</option>}
            {colors.map((color) => (
              <option value={color} key={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default SelectColorGame;
