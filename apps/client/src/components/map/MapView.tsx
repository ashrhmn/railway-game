import { mapPositions } from "@/data/map.positions";
import service, { socket } from "@/service";
import { getNftJobs, getMapItems } from "@/service/map.service";
import { clx } from "@/utils/classname.utils";
import { handleReqError } from "@/utils/error.utils";
import { promiseToast } from "@/utils/toast.utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { endpoints, WS_EVENTS } from "api-interface";
import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import ErrorView from "../common/ErrorView";
import FullScreenSpinner from "../common/FullScreenSpinner";
import { COLOR, ROLE, MAP_ITEMS } from "@prisma/client";

type Props = {
  color: COLOR;
  gameId: string;
  nftJobs: Awaited<ReturnType<typeof getNftJobs>>;
  mapItems: Awaited<ReturnType<typeof getMapItems>>;
  roles: ROLE[];
};
const directionSchema = endpoints.map.expandEnemySize.bodySchema.pick({
  direction: true,
});
const assignEnemyInputSchema = endpoints.map.assignEnemyToPosition.bodySchema;
type IAssignEnemyInput = z.infer<typeof assignEnemyInputSchema>;

const MapView = ({ color, gameId, mapItems, nftJobs, roles }: Props) => {
  const [selectedPoint, setSelectedPoint] = useState({ x: -1, y: -1 });
  const [selectedNftJob, setSelectedNftJob] = useState("NOT_SELECTED");

  const [selectedMapItem, setSelectedMapItem] = useState<
    MAP_ITEMS | "NOT_SELECTED"
  >("NOT_SELECTED");
  const [selectedMapItemVariant, setSelectedMapItemVariant] =
    useState("NOT_SELECTED");

  const [assigning, setAssigning] = useState<"FIXED" | "ROAD">("FIXED");

  const { data: mapItemVariants } = useQuery({
    queryKey: ["map-item-variants", selectedMapItem],
    queryFn: () => {
      if (assigning === "ROAD" || selectedMapItem === "NOT_SELECTED")
        return Promise.resolve([]);
      return service(endpoints.map.getMapItemVariants)({
        query: { mapItem: selectedMapItem },
      });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IAssignEnemyInput>({
    resolver: zodResolver(assignEnemyInputSchema),
    values: {
      gameId,
      color,
      x: selectedPoint.x,
      y: selectedPoint.y,
      name: "",
      strength: 1,
    },
  });

  const handleAssignEnemy = (data: IAssignEnemyInput) => {
    if (selectedPoint.x === -1 || selectedPoint.y === -1) return;
    promiseToast(service(endpoints.map.assignEnemyToPosition)({ body: data }), {
      loading: "Assigning Enemy...",
      success: "Enemy Assigned",
    })
      .then(() => {
        refetch();
      })
      .catch(handleReqError);
  };

  const { data: currentRailPosition, refetch: refetchRailPosition } = useQuery({
    queryKey: ["rail-current-position", color, gameId],
    queryFn: () =>
      service(endpoints.game.getCurrentRailPosition)({
        query: { color, gameId },
      }),
    keepPreviousData: true,
  });

  const { data, status, refetch, error } = useQuery({
    queryKey: ["map-positions", color, gameId],
    queryFn: () =>
      service(endpoints.map.getPositions)({
        query: { color, gameId, take: 1000 },
      }),
    retry: 0,
    keepPreviousData: true,
  });
  const positions = useMemo(() => {
    const def = mapPositions({ color, gameId });
    if (!data) return def;
    return [
      ...def.filter((d) => !data.find((p) => p.x === d.x && p.y === d.y)),
      ...data,
    ];
  }, [color, data, gameId]);

  const selectedPointDetails = useMemo(() => {
    if (selectedPoint.x === -1 || selectedPoint.y === -1) return null;
    return positions.find(
      (p) => p.x === selectedPoint.x && p.y === selectedPoint.y
    );
  }, [positions, selectedPoint.x, selectedPoint.y]);

  const handleAssign = () => {
    if (selectedPoint.x === -1 || selectedPoint.y === -1) return;
    if (
      !!mapItemVariants &&
      mapItemVariants.length > 0 &&
      selectedMapItemVariant === "NOT_SELECTED"
    ) {
      toast.error("Please select a variant");
      return;
    }
    promiseToast(
      service(endpoints.map.assignItemToPosition)({
        body: {
          gameId,
          x: selectedPoint.x,
          y: selectedPoint.y,
          color,
          ...(selectedMapItem !== "NOT_SELECTED"
            ? { mapItem: selectedMapItem }
            : {}),
          ...(selectedMapItemVariant !== "NOT_SELECTED" &&
          !!mapItemVariants &&
          mapItemVariants.length > 0
            ? { mapItemVariant: selectedMapItemVariant }
            : {}),
          ...(selectedNftJob !== "NOT_SELECTED"
            ? { prePlaced: selectedNftJob }
            : {}),
        },
      }),
      {
        loading: "Assigning...",
        success: "Assigned",
      }
    )
      .then(() => {
        refetch();
        setSelectedNftJob("NOT_SELECTED");
        setSelectedMapItem("NOT_SELECTED");
      })
      .catch(handleReqError);
  };

  const handleRemove = () => {
    if (!selectedPointDetails) return;
    promiseToast(
      service(endpoints.map.removeItem)({
        param: { id: selectedPointDetails.id },
      }),
      {
        loading: "Removing item...",
        success: "Removed",
      }
    )
      .then(() => {
        refetch();
        setSelectedNftJob("NOT_SELECTED");
        setSelectedMapItem("NOT_SELECTED");
        // setSelectedPoint({ x: -1, y: -1 });
      })
      .catch(handleReqError);
  };

  const expandEnemy = (
    direction: z.infer<typeof directionSchema>["direction"]
  ) => {
    if (!selectedPointDetails || !selectedPointDetails.enemy) return;
    promiseToast(
      service(endpoints.map.expandEnemySize)({
        param: { id: selectedPointDetails.id },
        body: { direction, enemyId: selectedPointDetails.enemy.id },
      }),
      {
        loading: "Expanding enemy...",
        success: "Expanded",
      }
    )
      .then(() => {
        refetch();
        setSelectedNftJob("NOT_SELECTED");
        setSelectedMapItem("NOT_SELECTED");
        // setSelectedPoint({ x: -1, y: -1 });
      })
      .catch(handleReqError);
  };

  useEffect(() => {
    const railChangeEvent = WS_EVENTS.RAIL_POSITION_CHANGED({
      color,
      gameId,
    }).event;

    const nftPlaceEvent = WS_EVENTS.MAP_POSITIONS_UPDATED({
      color,
      gameId,
    }).event;

    const railChangeEventHandler = () => {
      refetchRailPosition();
      refetch();
    };

    socket.on(railChangeEvent, railChangeEventHandler);
    socket.on(nftPlaceEvent, refetch);

    return () => {
      socket.off(railChangeEvent, railChangeEventHandler);
      socket.off(nftPlaceEvent, refetch);
    };
  }, [color, gameId, refetch, refetchRailPosition]);

  if (status === "loading") return <FullScreenSpinner />;
  if (status === "error") return <ErrorView error={error} />;
  if (!mapItems) return <div>Error getting map items</div>;
  if (!nftJobs) return <div>Error getting nft jobs</div>;

  return (
    <div className="mt-8 flex flex-wrap gap-3 p-1">
      <div className="select-none">
        {Array(15)
          .fill(0)
          .map((_, i) => (
            <div className="flex" key={i}>
              {positions
                .filter((p) => p.y === 14 - i)
                .sort((a, b) => a.x - b.x)
                .map((p) => (
                  <div
                    className={clx(
                      "m-0.5 flex h-12 w-12 cursor-pointer items-center justify-center text-xs transition-all hover:bg-red-500 dark:hover:bg-red-700",
                      selectedPoint.x === p.x && selectedPoint.y === p.y
                        ? "bg-gray-400 dark:bg-gray-900"
                        : !!p.mapItem || !!p.prePlaced || !!p.enemy
                        ? "bg-slate-500 text-white dark:bg-slate-500"
                        : "bg-gray-300 dark:bg-gray-700"
                    )}
                    onClick={() => setSelectedPoint({ x: p.x, y: p.y })}
                    key={p.x + "" + p.y}
                  >
                    {!!currentRailPosition &&
                    currentRailPosition.x === p.x &&
                    currentRailPosition.y === p.y
                      ? "🚂"
                      : roles.includes("GAMEDEV") && !p.isRevealed
                      ? null
                      : p.mapItem === "MOUNTAIN"
                      ? "🏔️"
                      : p.mapItem === "RIVER"
                      ? "🌊"
                      : `${p.x},${p.y}`}
                  </div>
                ))}
            </div>
          ))}
      </div>
      <div className="">
        <h1 className="text-2xl font-bold">Select a point to modify</h1>
        {selectedPoint.x !== -1 && selectedPoint.y !== -1 && (
          <div className="mt-8">
            <div className="flex items-center gap-2">
              <h1>
                Selected Point : {selectedPoint.x} , {selectedPoint.y}
              </h1>
              <button
                onClick={() => setSelectedPoint({ x: -1, y: -1 })}
                className="badge badge-accent"
              >
                Reset Selection
              </button>
            </div>
            <div className="mt-6">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">Already Assigned</h1>
                {(!!selectedPointDetails?.mapItem ||
                  !!selectedPointDetails?.enemy ||
                  !!selectedPointDetails?.prePlaced) && (
                  <button
                    onClick={handleRemove}
                    className="badge badge-warning"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2">
                <div>
                  <h1>Fixed Item</h1>
                  <h1>(Preplaced) NFT</h1>
                  <h1>Enemy</h1>
                  <h1>Player Assigned</h1>
                </div>
                <div>
                  <h1>
                    {selectedPointDetails?.mapItemVariant ||
                      selectedPointDetails?.mapItem ||
                      "None"}
                  </h1>
                  <h1>{selectedPointDetails?.prePlaced || "None"}</h1>
                  <h1>
                    {!!selectedPointDetails?.enemy
                      ? `${selectedPointDetails.enemy.name} (Strength : ${selectedPointDetails.enemy.currentStrength}/${selectedPointDetails.enemy.strength})`
                      : "None"}
                  </h1>
                  <h1>{selectedPointDetails?.nft?.job || "None"}</h1>
                </div>
              </div>
            </div>
            {(selectedPointDetails?.enemy?._count.positions || 999) < 6 && (
              <>
                <h1 className="mt-6 text-xl font-bold">Expand Enemy</h1>
                <div className="flex items-center">
                  {selectedPointDetails?.enemy?._count.positions === 4 && (
                    <DirectionButton direction="L" expandEnemy={expandEnemy} />
                  )}
                  {selectedPointDetails?.enemy?._count.positions === 1 && (
                    <div className="grid grid-cols-2">
                      <div>
                        <DirectionButton
                          direction="TL"
                          expandEnemy={expandEnemy}
                        />
                        <DirectionButton
                          direction="BL"
                          expandEnemy={expandEnemy}
                        />
                      </div>
                      <div>
                        <DirectionButton
                          direction="TR"
                          expandEnemy={expandEnemy}
                        />
                        <DirectionButton
                          direction="BR"
                          expandEnemy={expandEnemy}
                        />
                      </div>
                    </div>
                  )}
                  {selectedPointDetails?.enemy?._count.positions === 4 && (
                    <DirectionButton direction="R" expandEnemy={expandEnemy} />
                  )}
                </div>
              </>
            )}
            <h1 className="mt-6 text-xl font-bold">(Re)assign</h1>
            <div className="mt-4 flex items-center gap-3">
              <h1>Fixed Item</h1>
              <div className="flex gap-2">
                <input
                  type="radio"
                  name="radio-1"
                  className="radio-accent radio"
                  checked={assigning === "FIXED"}
                  onChange={() => {
                    setAssigning("FIXED");
                    setSelectedNftJob("NOT_SELECTED");
                  }}
                />
                <input
                  type="radio"
                  name="radio-1"
                  className="radio-accent radio"
                  checked={assigning === "ROAD"}
                  onChange={() => {
                    setAssigning("ROAD");
                    setSelectedMapItem("NOT_SELECTED");
                  }}
                />
              </div>
              <h1>(Preplaced) NFT</h1>
            </div>
            {assigning === "FIXED" && (
              <>
                <div className="form-control mt-4">
                  <label className="label-text label">
                    Select a Fixed Item to assign
                  </label>
                  <select
                    value={selectedMapItem}
                    onChange={(e) =>
                      setSelectedMapItem(e.target.value as MAP_ITEMS)
                    }
                    className="select-bordered select"
                  >
                    <option disabled value="NOT_SELECTED">
                      Select an item
                    </option>
                    {mapItems.map((mi) => (
                      <option key={mi} value={mi}>
                        {mi}
                      </option>
                    ))}
                  </select>
                </div>
                {!!mapItemVariants && mapItemVariants.length > 0 && (
                  <div className="form-control mt-4">
                    <label className="label-text label">
                      Select a {selectedMapItem} variant
                    </label>
                    <select
                      value={selectedMapItemVariant}
                      onChange={(e) =>
                        setSelectedMapItemVariant(e.target.value)
                      }
                      className="select-bordered select"
                    >
                      <option disabled value="NOT_SELECTED">
                        Select an item
                      </option>
                      {mapItemVariants.map((mi) => (
                        <option key={mi} value={mi}>
                          {mi}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
            {assigning === "ROAD" && (
              <div className="form-control mt-4">
                <label className="label-text label">
                  Select Pre-existing RailRoads
                </label>
                <select
                  value={selectedNftJob}
                  onChange={(e) => setSelectedNftJob(e.target.value)}
                  className="select-bordered select"
                >
                  <option disabled value="NOT_SELECTED">
                    Select an item
                  </option>
                  {nftJobs
                    .filter((j) => j.startsWith("RAIL_"))
                    .map((nj) => (
                      <option key={nj} value={nj}>
                        {nj}
                      </option>
                    ))}
                </select>
              </div>
            )}
            <button
              onClick={handleAssign}
              disabled={
                selectedPoint.x === -1 ||
                selectedPoint.y === -1 ||
                (selectedMapItem === "NOT_SELECTED" &&
                  selectedNftJob === "NOT_SELECTED")
              }
              className={clx("btn btn-accent mt-4")}
            >
              Assign
            </button>

            <h1 className="mt-6 text-xl font-bold">Add Enemies</h1>

            <form onSubmit={handleSubmit(handleAssignEnemy)}>
              <div className="form-control mt-4">
                <label className="label-text label">Enemy Name</label>
                <input
                  type="text"
                  className="input-bordered input"
                  {...register("name")}
                />
                <p className="text-error">{errors.name?.message}</p>
              </div>
              <div className="form-control mt-4">
                <label className="label-text label">Enemy Strength</label>
                <input
                  type="number"
                  className="input-bordered input"
                  {...register("strength")}
                />
                <p className="text-error">{errors.strength?.message}</p>
              </div>
              <button type="submit" className="btn mt-4">
                Add Enemy
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

const DirectionButton = ({
  direction,
  expandEnemy,
}: {
  direction: z.infer<typeof directionSchema>["direction"];
  expandEnemy: (
    _direction: z.infer<typeof directionSchema>["direction"]
  ) => void;
}) => (
  <div
    onClick={() => expandEnemy(direction)}
    className="m-1 flex h-6 w-6 cursor-pointer items-center justify-center bg-gray-600"
  >
    {direction}
  </div>
);

export default MapView;
