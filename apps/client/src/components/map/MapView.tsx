import { mapPositions } from "@/data/map.positions";
import service from "@/service";
import { getNftJobs, getMapItems } from "@/service/map.service";
import { clx } from "@/utils/classname.utils";
import { handleReqError } from "@/utils/error.utils";
import { promiseToast } from "@/utils/toast.utils";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "api-interface";
import React, { useMemo, useState } from "react";

type Props = {
  color: string;
  gameId: string;
  nftJobs: Awaited<ReturnType<typeof getNftJobs>>;
  mapItems: Awaited<ReturnType<typeof getMapItems>>;
};

const MapView = ({ color, gameId, mapItems, nftJobs }: Props) => {
  const [selectedPoint, setSelectedPoint] = useState({ x: -1, y: -1 });
  const [selectedNftJob, setSelectedNftJob] = useState("NOT_SELECTED");

  const [selectedMapItem, setSelectedMapItem] = useState("NOT_SELECTED");

  const [assigning, setAssigning] = useState<"FIXED" | "ROAD">("FIXED");

  const { data, status, refetch } = useQuery({
    queryKey: ["map-positions", color, gameId],
    queryFn: () =>
      service(endpoints.map.getPositions)({ query: { color, gameId } }),
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

  if (status === "loading") return <div>Loading...</div>;
  if (status === "error") return <div>Error getting map details</div>;
  if (!mapItems) return <div>Error getting map items</div>;
  if (!nftJobs) return <div>Error getting nft jobs</div>;

  const handleAssign = () =>
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
          ...(selectedNftJob !== "NOT_SELECTED"
            ? { prePlaced: selectedNftJob }
            : {}),
        },
      }),
      {
        loading: "Assigning Nft Job...",
      }
    )
      .then(() => {
        refetch();
        setSelectedNftJob("NOT_SELECTED");
        setSelectedMapItem("NOT_SELECTED");
        // setSelectedPoint({ x: -1, y: -1 });
      })
      .catch(handleReqError);

  const handleRemove = () => {
    if (!selectedPointDetails) return;
    promiseToast(
      service(endpoints.map.removeItem)({
        param: { id: selectedPointDetails.id },
      }),
      {
        loading: "Removing item...",
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
  return (
    <div className="mt-8 flex flex-wrap gap-3 p-1">
      <div>
        {Array(15)
          .fill(0)
          .map((_, i) => (
            <div className="flex" key={i}>
              {positions
                .filter((p) => p.x === 14 - i)
                .sort((a, b) => a.y - b.y)
                .map((p) => (
                  <div
                    className={clx(
                      "m-0.5 flex h-12 w-12 cursor-pointer items-center justify-center text-xs transition-all hover:bg-red-500 dark:hover:bg-red-700",
                      selectedPoint.x === p.x && selectedPoint.y === p.y
                        ? "bg-gray-400 dark:bg-gray-900"
                        : !!p.mapItem || !!p.prePlaced
                        ? "bg-slate-500 text-white dark:bg-slate-500"
                        : "bg-gray-300 dark:bg-gray-700"
                    )}
                    onClick={() => setSelectedPoint({ x: p.x, y: p.y })}
                    key={p.x + "" + p.y}
                  >
                    {p.mapItem?.[0] || p.prePlaced || `${p.x},${p.y}`}
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
                className="badge-accent badge"
              >
                Reset Selection
              </button>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <h1>
                Already Assigned :{" "}
                {selectedPointDetails?.mapItem ||
                  selectedPointDetails?.prePlaced ||
                  "None"}
              </h1>
              {(!!selectedPointDetails?.mapItem ||
                !!selectedPointDetails?.prePlaced) && (
                <button onClick={handleRemove} className="badge-warning badge">
                  Remove
                </button>
              )}
            </div>
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
              <h1>Road Track</h1>
            </div>
            {assigning === "FIXED" && (
              <div className="form-control mt-4">
                <label className="label-text label">
                  Select a Fixed Item to assign
                </label>
                <select
                  value={selectedMapItem}
                  onChange={(e) => setSelectedMapItem(e.target.value)}
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
                  {nftJobs.map((nj) => (
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
              className={clx("btn-accent btn mt-4")}
            >
              Assign
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapView;
