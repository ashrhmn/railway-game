import FullScreenSpinner from "@/components/common/FullScreenSpinner";
import service, { socket } from "@/service";
import { useQuery } from "@tanstack/react-query";
import { shortenIfAddress, useEthers } from "@usedapp/core";
import { endpoints, InferOutputs, WS_EVENTS } from "api-interface";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { COLOR } from "@prisma/client";
import { mapPositions } from "@/data/map.positions";
import { clx } from "@/utils/classname.utils";
import { handleReqError } from "@/utils/error.utils";
import { promiseToast } from "@/utils/toast.utils";
import { timestamp } from "@/utils/date.utils";
import { IPoint, Position } from "@/types";

const GameView = () => {
  const { account } = useEthers();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<COLOR | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<IPoint>({ x: -1, y: -1 });
  const [selectedNft, setSelectedNft] = useState<
    null | Exclude<typeof nfts, undefined>["data"][number]
  >(null);

  const [additionalLightUpPositions, setAdditionalLightUpPositions] = useState<
    IPoint[]
  >([]);

  useEffect(() => {
    setAdditionalLightUpPositions([]);
  }, [selectedColor, selectedGameId, selectedPoint, selectedNft, account]);

  const { data: allGames, status: allGameStatus } = useQuery({
    queryKey: ["games"],
    queryFn: () => service(endpoints.game.getAll)({}),
    keepPreviousData: true,
  });
  const { data: colors, status: colorsFetchStatus } = useQuery({
    queryKey: [
      "available-maps-by-wallet-game-id",
      selectedGameId || "",
      account || "",
    ],
    queryFn: () =>
      service(endpoints.game.getColorsAvailableForWalletByGameId)({
        param: { gameId: selectedGameId || "", walletAddress: account || "" },
      }),
    enabled: !!selectedGameId && !!account,
  });

  const {
    data: mapPositionsData,
    status: mapPositionsFetchStatus,
    refetch: refetchMapPositions,
  } = useQuery({
    queryKey: ["map-positions", selectedGameId || "", selectedColor || ""],
    queryFn: () =>
      service(endpoints.map.getPositions)({
        query: {
          color: selectedColor || "",
          gameId: selectedGameId || "",
          take: 999,
        },
      }),
    enabled: !!selectedGameId && !!selectedColor,
  });

  const {
    data: currentRailPosition,
    status: currentRailPositionStatus,
    refetch: refetchCurrentRailPosition,
  } = useQuery({
    queryKey: [
      "current-rail-positions",
      selectedGameId || "",
      selectedColor || "",
    ],
    queryFn: () =>
      service(endpoints.game.getCurrentRailPosition)({
        query: { gameId: selectedGameId || "", color: selectedColor || "" },
      }),
    enabled: !!selectedGameId && !!selectedColor,
  });

  const {
    data: nfts,
    status: nftsFetchStatus,
    refetch: refetchNfts,
  } = useQuery({
    queryKey: [
      "nfts",
      selectedColor || "",
      selectedGameId || "",
      account || "",
    ],
    queryFn: () =>
      service(endpoints.nft.getAllNfts)({
        query: {
          color: selectedColor || "",
          gameId: selectedGameId || "",
          owner: account || "",
          take: 1000,
        },
      }).then((data) => {
        if (selectedNft)
          setSelectedNft(
            data.data.find((n) => n.id === selectedNft.id) || null
          );
        return data;
      }),
    enabled: !!selectedGameId && !!selectedColor && !!account,
  });

  const positions = useMemo(() => {
    if (!selectedGameId || !selectedColor) return [];
    const def = mapPositions({ color: selectedColor, gameId: selectedGameId });
    if (!mapPositionsData) return def;
    return [
      ...def.filter(
        (d) => !mapPositionsData.find((p) => p.x === d.x && p.y === d.y)
      ),
      ...mapPositionsData,
    ];
  }, [mapPositionsData, selectedColor, selectedGameId]);

  const getBlockView = useCallback(
    (p: InferOutputs<typeof endpoints.map.getPositions>[number]) => {
      if (!p.isRevealed) return "";
      if (
        !!currentRailPosition &&
        currentRailPosition.x === p.x &&
        currentRailPosition.y === p.y
      )
        return "🚂";
      return `${p.x},${p.y}`;
    },
    [currentRailPosition]
  );

  const handleAssignNft = useCallback(async () => {
    try {
      if (
        !selectedNft ||
        !selectedColor ||
        !selectedGameId ||
        selectedPoint.x === -1 ||
        selectedPoint.y === -1
      )
        return;
      if (!account) throw "Please Connect your wallet";
      await promiseToast(
        service(endpoints.map.placeNftOnMap)({
          body: {
            color: selectedColor,
            gameId: selectedGameId,
            nftId: selectedNft.id,
            walletAddress: account,
            x: selectedPoint.x,
            y: selectedPoint.y,
            additionalLightUpPositions,
          },
        })
          .then(() => refetchMapPositions())
          .then(() => refetchNfts()),
        {
          loading: "Placing NFT...",
          success: "NFT Placed",
        }
      );
    } catch (error) {
      handleReqError(error);
    }
  }, [
    account,
    additionalLightUpPositions,
    refetchMapPositions,
    refetchNfts,
    selectedColor,
    selectedGameId,
    selectedNft,
    selectedPoint.x,
    selectedPoint.y,
  ]);

  const selectedPointDetails = useMemo(() => {
    if (selectedPoint.x === -1 || selectedPoint.y === -1) return null;
    return positions.find(
      (p) => p.x === selectedPoint.x && p.y === selectedPoint.y
    );
  }, [positions, selectedPoint.x, selectedPoint.y]);

  useEffect(() => {
    if (!!selectedGameId && !!selectedColor) {
      const railChangeEvent = WS_EVENTS.RAIL_POSITION_CHANGED({
        color: selectedColor,
        gameId: selectedGameId,
      }).event;

      const nftPlaceEvent = WS_EVENTS.MAP_POSITIONS_UPDATED({
        color: selectedColor,
        gameId: selectedGameId,
      }).event;

      const railChangeEventHandler = () => {
        refetchCurrentRailPosition();
        refetchMapPositions();
      };

      socket.on(railChangeEvent, railChangeEventHandler);
      socket.on(nftPlaceEvent, refetchMapPositions);

      return () => {
        socket.off(railChangeEvent, railChangeEventHandler);
        socket.off(nftPlaceEvent, refetchMapPositions);
      };
    }
  }, [
    refetchCurrentRailPosition,
    refetchMapPositions,
    selectedColor,
    selectedGameId,
  ]);

  if (allGameStatus !== "success")
    return (
      <Wrapper>
        <FullScreenSpinner />
      </Wrapper>
    );
  if (!account)
    return (
      <Wrapper>
        <h1>Please Connect your wallet</h1>
      </Wrapper>
    );
  if (!selectedGameId)
    return (
      <Wrapper>
        <div>
          <h1 className="text-center">Select a Game</h1>
          {allGames
            .filter((game) => game.status === "RUNNING")
            .map((game) => (
              <button
                onClick={() => setSelectedGameId(game.id)}
                className="btn btn-wide btn-lg m-2 flex flex-wrap"
                key={game.id}
              >
                {game.name}
              </button>
            ))}
        </div>
      </Wrapper>
    );
  if (colorsFetchStatus !== "success")
    return (
      <Wrapper>
        <FullScreenSpinner />
      </Wrapper>
    );
  if (!selectedColor)
    return (
      <Wrapper>
        <div>
          <div className="mb-2 flex justify-center">
            <button
              onClick={() => setSelectedGameId(null)}
              className="btn btn-sm"
            >
              Back
            </button>
          </div>
          <h1 className="text-center">Select a Map</h1>
          {colors.map((color) => (
            <div
              className="btn btn-wide m-2 flex flex-wrap"
              onClick={() => setSelectedColor(color)}
              key={color}
            >
              {color}
            </div>
          ))}
        </div>
      </Wrapper>
    );
  if (
    mapPositionsFetchStatus !== "success" ||
    currentRailPositionStatus !== "success" ||
    nftsFetchStatus !== "success"
  )
    return (
      <Wrapper>
        <FullScreenSpinner />
      </Wrapper>
    );
  return (
    <Wrapper>
      <div>
        <div className="mb-2 flex items-center justify-end gap-1">
          <div className="text-sm">
            <span className="font-bold">Rail Position</span> :{" "}
            {currentRailPosition.x},{currentRailPosition.y}{" "}
            <span className="font-bold">Direction</span> :{" "}
            {currentRailPosition.direction}
          </div>
          {((selectedPoint.x !== -1 && selectedPoint.y !== -1) ||
            !!selectedNft) && (
            <button
              onClick={() => {
                setSelectedPoint({ x: -1, y: -1 });
                setSelectedNft(null);
              }}
              className="btn btn-sm"
            >
              Reset Selection
            </button>
          )}
          <button
            className="btn btn-error btn-sm"
            onClick={() => {
              setSelectedColor(null);
              setSelectedPoint({ x: -1, y: -1 });
            }}
          >
            Exit
          </button>
        </div>
        <div className="flex w-full items-center gap-4">
          <div>
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
                            "flex h-12 w-12 items-center justify-center text-xs transition-all",
                            (selectedPoint.x === p.x &&
                              selectedPoint.y === p.y) ||
                              additionalLightUpPositions.some(
                                (lp) => lp.x === p.x && lp.y === p.y
                              )
                              ? "bg-gray-400 dark:bg-gray-900"
                              : !p.isRevealed
                              ? "bg-white dark:bg-black"
                              : "cursor-pointer bg-gray-300 hover:bg-red-500 dark:bg-gray-700 dark:hover:bg-red-700"
                          )}
                          onClick={() => setSelectedPoint({ x: p.x, y: p.y })}
                          key={p.x + "" + p.y}
                        >
                          {getBlockView(p)}
                        </div>
                      ))}
                  </div>
                ))}
            </div>
            <div className="my-2 flex h-28 max-w-3xl flex-wrap gap-1 overflow-y-auto">
              {nfts.data.map((nft) => (
                <button
                  onClick={() => {
                    setSelectedNft(nft);
                    setSelectedNft(nft);
                  }}
                  className={clx(
                    "btn btn-xs",
                    selectedNft?.id === nft.id && "btn-accent"
                  )}
                  key={nft.id}
                >
                  {nft.job}
                </button>
              ))}
            </div>
          </div>
          <div className="w-2/6">
            {selectedPointDetails && (
              <div className="my-2 text-sm">
                <h1 className="text-xl font-bold">Selected Point</h1>
                <div>
                  Place Revealed :{" "}
                  {selectedPointDetails.isRevealed ? "Yes" : "No"}
                </div>
                <div>Map Item : {selectedPointDetails.mapItem || "None"}</div>
                <div>
                  Map Item Variant :{" "}
                  {selectedPointDetails.mapItemVariant || "None"}
                </div>
                {selectedPointDetails.mapItem === "RIVER" && (
                  <div>
                    {selectedPointDetails.bridgeConstructedOn === 0
                      ? "Bridge Constructed : No"
                      : timestamp() > selectedPointDetails.bridgeConstructedOn
                      ? "Bridge Constructed : Yes"
                      : `Bridge Construction Completes on : ${new Date(
                          selectedPointDetails.bridgeConstructedOn * 1000
                        ).toLocaleString()}`}
                  </div>
                )}
                <div>
                  Preplaced Item : {selectedPointDetails.prePlaced || "None"}
                </div>
                <div>
                  Enemy : {selectedPointDetails.enemy?.name || "None"}{" "}
                  {selectedPointDetails.enemy &&
                    (selectedPointDetails.enemy.currentStrength === 0
                      ? "(Defeated)"
                      : `Strength(${selectedPointDetails.enemy.currentStrength}/${selectedPointDetails.enemy.strength})`)}
                </div>
                <div>
                  Player Assigned : {selectedPointDetails.nft?.job || "None"}
                </div>
              </div>
            )}
            {selectedNft && (
              <div className="my-2 text-sm">
                <h1 className="text-xl">Selected NFT</h1>
                <div>Job : {selectedNft.job}</div>
                <div>
                  Frozen :{" "}
                  {selectedNft.frozenTill < timestamp()
                    ? "No"
                    : `Till ${new Date(
                        selectedNft.frozenTill * 1000
                      ).toLocaleString()}`}
                </div>
                <div>{`B: ${selectedNft.abilityB} L: ${selectedNft.abilityL} K: ${selectedNft.abilityK} R: ${selectedNft.abilityR}`}</div>
              </div>
            )}
            {!!selectedPointDetails &&
              !!selectedNft &&
              selectedNft.job === "LIGHT" &&
              selectedNft.abilityL > 1 && (
                <>
                  <h1 className="text-sm font-bold">
                    Additional Light Up Positions
                  </h1>
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex">
                      <AdditionalLightUpPositionSelector
                        additionalLightUpPositions={additionalLightUpPositions}
                        point={Position.from(selectedPoint).up().getPosition()}
                        setAdditionalLightUpPositions={
                          setAdditionalLightUpPositions
                        }
                      />
                    </div>
                    <div className="flex">
                      <AdditionalLightUpPositionSelector
                        additionalLightUpPositions={additionalLightUpPositions}
                        point={Position.from(selectedPoint)
                          .left()
                          .getPosition()}
                        setAdditionalLightUpPositions={
                          setAdditionalLightUpPositions
                        }
                      />
                      <AdditionalLightUpPositionSelector
                        additionalLightUpPositions={additionalLightUpPositions}
                        disabled
                        point={selectedPoint}
                        setAdditionalLightUpPositions={
                          setAdditionalLightUpPositions
                        }
                      />
                      <AdditionalLightUpPositionSelector
                        additionalLightUpPositions={additionalLightUpPositions}
                        point={Position.from(selectedPoint)
                          .right()
                          .getPosition()}
                        setAdditionalLightUpPositions={
                          setAdditionalLightUpPositions
                        }
                      />
                    </div>
                    <div>
                      <AdditionalLightUpPositionSelector
                        additionalLightUpPositions={additionalLightUpPositions}
                        point={Position.from(selectedPoint)
                          .down()
                          .getPosition()}
                        setAdditionalLightUpPositions={
                          setAdditionalLightUpPositions
                        }
                      />
                    </div>
                  </div>
                </>
              )}
            {!!selectedNft &&
              selectedPoint.x !== -1 &&
              selectedPoint.y !== -1 && (
                <button
                  onClick={handleAssignNft}
                  className="btn btn-primary btn-sm"
                >
                  Assign {selectedNft.job} on
                  {[selectedPoint, ...additionalLightUpPositions]
                    .map(({ x, y }) => ` ${x},${y}`)
                    .join(",")}
                </button>
              )}
          </div>
        </div>
      </div>
    </Wrapper>
  );
};

const AdditionalLightUpPositionSelector = ({
  point,
  disabled,
  setAdditionalLightUpPositions,
  additionalLightUpPositions,
}: {
  point: IPoint;
  disabled?: boolean;
  setAdditionalLightUpPositions: React.Dispatch<React.SetStateAction<IPoint[]>>;
  additionalLightUpPositions: IPoint[];
}) => {
  const isPointValid = useMemo(
    () => point.x >= 0 && point.y >= 0 && point.x <= 14 && point.y <= 14,
    [point.x, point.y]
  );
  return (
    <div
      onClick={() => {
        if (disabled || !isPointValid) return;
        setAdditionalLightUpPositions((prev) => {
          if (prev.some((p) => p.x === point.x && p.y === point.y)) {
            return prev.filter((p) => p.x !== point.x || p.y !== point.y);
          }
          return [...prev, point];
        });
      }}
      className={clx(
        "flex h-12 w-12 select-none items-center justify-center text-xs",
        disabled ||
          additionalLightUpPositions.some(
            (p) => p.x === point.x && p.y === point.y
          )
          ? "bg-neutral-focus/30"
          : "bg-neutral-focus",
        !disabled && isPointValid && "cursor-pointer"
      )}
    >
      {isPointValid && `${point.x}, ${point.y}`}
    </div>
  );
};

const Wrapper = ({ children }: { children: React.ReactNode }) => {
  const { account, activateBrowserWallet, deactivate } = useEthers();
  return (
    <div className="text-2xl">
      <nav className="fixed left-0 right-0 top-0 flex justify-end p-2">
        <button
          className="btn"
          onClick={!account ? activateBrowserWallet : deactivate}
        >
          {!!account ? shortenIfAddress(account) : "Connect Wallet"}
        </button>
      </nav>
      <div
        style={{ minHeight: "calc(100vh - 4rem)" }}
        className="mt-16 flex items-center justify-center overflow-y-auto"
      >
        {children}
      </div>
    </div>
  );
};

export default GameView;
