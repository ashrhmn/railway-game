import SelectColorGame from "@/components/common/SelectColorGame";
import TextTooltip from "@/components/common/TextTooltip";
import AddNftsForm from "@/components/nfts/AddNftsForm";
import service from "@/service";
import { getColors, getGames } from "@/service/map.service";
import { serverSideAuth } from "@/service/serverSideAuth";
import { clx } from "@/utils/classname.utils";
import { timestamp } from "@/utils/date.utils";
import { handleReqError } from "@/utils/error.utils";
import { promiseToast } from "@/utils/toast.utils";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "api-interface";
import axios from "axios";
import { GetServerSideProps, NextPage } from "next";
import Image from "next/image";
import React, { useCallback, useMemo, useState } from "react";
import { NFT_JOB, COLOR } from "@prisma/client";
import useDebounce from "@/hooks/useDebounce";

type Props = {
  colors: Awaited<ReturnType<typeof getColors>>;
  games: Awaited<ReturnType<typeof getGames>>;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const auth = await serverSideAuth(context);
  if ("redirect" in auth) return auth;
  const [colors, games] = await Promise.all([
    getColors(context),
    getGames(context),
  ]);
  return { props: { ...auth.props, colors, games } };
};

const NftsPage: NextPage<Props> = ({ colors, games }) => {
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    undefined
  );
  const [selectedGameId, setSelectedGameId] = useState(
    !!games && typeof games?.[0]?.id === "string" ? games[0].id : undefined
  );

  const [selectedPage, setSelectedPage] = useState(1);

  const [itemsPerPage, setItemsPerPage] = useState(25);

  const [itemsPerPageDelayed, setItemsPerPageDelayed] = useState(25);

  useDebounce(() => setItemsPerPageDelayed(itemsPerPage), 700, [itemsPerPage]);

  const { data, refetch } = useQuery({
    queryKey: [
      "nfts",
      selectedColor || "all",
      selectedGameId || "all",
      selectedPage.toString(),
      itemsPerPageDelayed.toString(),
    ],
    queryFn: useCallback(
      () =>
        service(endpoints.nft.getAllNfts)({
          query: {
            take: itemsPerPageDelayed,
            skip: (selectedPage - 1) * itemsPerPageDelayed,
            gameId: selectedGameId,
            color: selectedColor,
          },
        }),
      [itemsPerPageDelayed, selectedColor, selectedGameId, selectedPage]
    ),
    keepPreviousData: true,
  });

  const handleDeleteNfts = useCallback(() => {
    if (!selectedGameId) return;
    promiseToast(
      service(endpoints.nft.deleteAllNfts)({
        param: { game_id: selectedGameId },
      }),
      { loading: "Deleting...", success: "Deleted" }
    )
      .then(() => refetch())
      .catch(handleReqError);
  }, [refetch, selectedGameId]);

  const handleRandomizeTokenId = () => {
    if (!selectedGameId) return;
    promiseToast(
      service(endpoints.nft.randomizeFixTokenId)({
        body: { gameId: selectedGameId },
      }).then(() => refetch()),
      {
        loading: "Randomizing...",
        success: "Done. Owners will be refreshed automatically",
      }
    ).catch(handleReqError);
  };

  const handleRefreshOwners = () => {
    if (!selectedGameId) return;
    promiseToast(
      axios
        .post(
          `/api/nfts/update-owners/${selectedGameId}`,
          {},
          { withCredentials: true }
        )
        .then(() => refetch()),
      { loading: "Refreshing...", success: "Done" }
    ).catch(handleReqError);
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [percentageValuesForJobs, setPercentageValuesForJobs] = useState<
    Record<NFT_JOB, string>
  >({
    BRIDGE: "0",
    KNIGHT: "0",
    LIGHT: "0",
    RAIL_2_4: "0",
    RAIL_2_4_6_8: "0",
    RAIL_2_6: "0",
    RAIL_2_8: "0",
    RAIL_4_6: "0",
    RAIL_4_8: "0",
    RAIL_6_8: "0",
  });

  const totalPercentageOfUpdatingNftJobs = useMemo(
    () =>
      Object.values(percentageValuesForJobs).reduce(
        (prev, curr) => prev + +curr,
        0
      ),
    [percentageValuesForJobs]
  );

  const updateNftJobErrorText = useCallback(
    (job: NFT_JOB) => {
      if (!percentageValuesForJobs[job] || isNaN(+percentageValuesForJobs[job]))
        return "Invalid Percentage Value";

      if (
        (+percentageValuesForJobs[job] * (data?.unfilteredCount || 0)) / 100 !==
        Math.floor(
          (+percentageValuesForJobs[job] * (data?.unfilteredCount || 0)) / 100
        )
      )
        return "Invalid Percentage, NFT count must be rounded";

      if (
        (+percentageValuesForJobs[job] * (data?.unfilteredCount || 0)) / 100 >
        (data?.unfilteredCount || 0)
      )
        return "Max percentage is 100%";

      if (
        (+percentageValuesForJobs[job] * (data?.unfilteredCount || 0)) /
          100 /
          Object.values(COLOR).length !==
        Math.floor(
          (+percentageValuesForJobs[job] * (data?.unfilteredCount || 0)) /
            100 /
            Object.values(COLOR).length
        )
      )
        return "Number of per color NFTs must be rounded";
    },
    [data?.unfilteredCount, percentageValuesForJobs]
  );

  const handleUpdateNftJobs = async () => {
    try {
      if (!selectedGameId) throw "No game selected";
      const jobs = Object.values(NFT_JOB)
        .map((job) => ({
          job,
          percentage: +percentageValuesForJobs[job],
        }))
        .filter((job) => job.percentage > 0);

      await promiseToast(
        service(endpoints.nft.updateNftsByPercentage)({
          body: { jobs, gameId: selectedGameId },
        }).then(() => refetch()),
        { loading: "Updating...", success: "Updated" }
      );
    } catch (error) {
      handleReqError(error);
    }
  };

  return (
    <>
      <AddNftsForm
        show={showAddForm}
        setShow={setShowAddForm}
        colors={colors}
        games={games}
        selectedColor={selectedColor}
        selectedGameId={selectedGameId}
        setSelectedColor={setSelectedColor}
        setSelectedGameId={setSelectedGameId}
        refetch={refetch}
      />
      <SelectColorGame
        colors={colors}
        games={games}
        selectedColor={selectedColor}
        selectedGameId={selectedGameId}
        setSelectedColor={setSelectedColor}
        setSelectedGameId={setSelectedGameId}
        colorAllOption
      />
      <div className="flex flex-col lg:flex-row">
        <div className="min-w-[40rem] overflow-x-auto">
          <details>
            <summary className="text-lg font-bold">Update NFT Jobs</summary>
            <div>
              {Object.values(NFT_JOB).map((job) => (
                <div
                  className={clx(
                    "p-1",
                    !!updateNftJobErrorText(job) &&
                      "rounded-xl border-[0.5px] border-error"
                  )}
                  key={job}
                >
                  <div
                    className={clx("my-0.5 flex items-center gap-3")}
                    key={job}
                  >
                    <span className="w-28">{job}</span>
                    <div>
                      <label className="input-group">
                        <input
                          className="input-bordered input input-xs w-16"
                          type="text"
                          value={percentageValuesForJobs[job]}
                          onChange={(e) =>
                            setPercentageValuesForJobs((v) => ({
                              ...v,
                              [job]: e.target.value,
                            }))
                          }
                        />
                        <span>%</span>
                      </label>
                    </div>
                    <span>
                      {
                        +(
                          (+percentageValuesForJobs[job] *
                            (data?.unfilteredCount || 0)) /
                            100 || 0
                        ).toFixed(4)
                      }{" "}
                      NFTs (
                      {
                        +(
                          (+percentageValuesForJobs[job] *
                            (data?.unfilteredCount || 0)) /
                            100 /
                            Object.values(COLOR).length || 0
                        ).toFixed(4)
                      }{" "}
                      per color )
                    </span>
                  </div>
                  {!!updateNftJobErrorText(job) && (
                    <span className="error text-xs text-error">
                      {updateNftJobErrorText(job)}
                    </span>
                  )}
                </div>
              ))}
              <div className="mt-2 flex justify-center gap-4">
                <span>
                  Percentage Total : {totalPercentageOfUpdatingNftJobs}
                </span>
                <button
                  disabled={totalPercentageOfUpdatingNftJobs !== 100}
                  onClick={handleUpdateNftJobs}
                  className="btn btn-accent btn-sm"
                >
                  Update
                </button>
              </div>
            </div>
          </details>
        </div>
        <div className="w-full">
          <div className="mt-8 flex flex-wrap items-center justify-end gap-4">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="btn-outline btn btn-accent"
            >
              Add
            </button>

            <label htmlFor="delete-modal" className="btn btn-error">
              Delete
            </label>
            <button onClick={handleRandomizeTokenId} className="btn">
              Randomize Token ID
            </button>
            <button onClick={handleRefreshOwners} className="btn">
              Refresh Owners
            </button>
            <input type="checkbox" id="delete-modal" className="modal-toggle" />
            <label htmlFor="delete-modal" className="modal cursor-pointer">
              <label className="modal-box relative" htmlFor="">
                <h3 className="text-lg font-bold">
                  Are you sure you want to delete all nfts from{" "}
                  {games?.find((g) => g.id === selectedGameId)?.name ||
                    selectedGameId}
                  ?
                </h3>
                <div className="modal-action">
                  <label
                    onClick={handleDeleteNfts}
                    htmlFor="delete-modal"
                    className="btn btn-warning"
                  >
                    Confirm
                  </label>
                </div>
              </label>
            </label>
          </div>

          <div className="btn-group mt-8 flex flex-wrap items-center justify-end">
            {selectedPage > 5 && (
              <button className="btn" onClick={() => setSelectedPage(1)}>
                First
              </button>
            )}
            {Array(Math.ceil((data?.count || 0) / itemsPerPageDelayed))
              .fill(0)
              .map((_, i) =>
                Math.abs(selectedPage - i) <= 5 ? (
                  <button
                    className={clx(
                      "btn",
                      selectedPage - 1 === i && "btn-active"
                    )}
                    key={i}
                    onClick={() => setSelectedPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ) : null
              )}
            {selectedPage <
              Math.ceil((data?.count || 0) / itemsPerPageDelayed) - 6 && (
              <button
                className="btn"
                onClick={() =>
                  setSelectedPage(
                    Math.ceil((data?.count || 0) / itemsPerPageDelayed)
                  )
                }
              >
                Last
              </button>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <label className="input-group w-72">
              <span>Items Per Page</span>
              <input
                value={itemsPerPage}
                onChange={(e) =>
                  setItemsPerPage(Math.max(e.target.valueAsNumber || 25, 25))
                }
                className="input-bordered input w-28"
                type="number"
              />
            </label>
          </div>
        </div>
      </div>
      <h1 className="text-xs">Total : {data?.count}</h1>
      <div className="relative mt-5 h-[60vh] overflow-x-auto rounded-xl border-2 border-base-300">
        <table className="table-zebra table-compact table w-full">
          <thead>
            <tr>
              <th>Token ID</th>
              <th>Name</th>
              <th>Description</th>
              <th>Color</th>
              <th>Job</th>
              <th>Owner</th>
              <th>Frozen</th>
              <th>Metadata</th>
              <th>Image</th>
              <th>Level</th>
              <th>B</th>
              <th>K</th>
              <th>L</th>
              <th>R</th>
            </tr>
          </thead>
          <tbody>
            {data?.data.map((nft) => (
              <tr key={nft.id}>
                <td>{nft.tokenId}</td>
                <td>
                  <TextTooltip position="RIGHT" text={nft.name} limit={20} />
                </td>
                <td>
                  <TextTooltip text={nft.description} limit={15} />
                </td>
                <td>{nft.color}</td>
                <td>{nft.job}</td>
                <td>
                  <TextTooltip text={nft.owner || ""} limit={15} />
                </td>
                <td>{nft.frozenTill > timestamp() ? "Yes" : "No"}</td>
                <td>
                  <pre className="max-h-60 overflow-y-auto bg-neutral p-1">
                    {JSON.stringify(nft.metadata, null, 2)}
                  </pre>
                </td>
                <td className="relative h-20 w-20">
                  <Image
                    className="object-contain"
                    fill
                    src={nft.image}
                    alt=""
                  />
                </td>
                <td>{nft.level}</td>
                <td>{nft.abilityB}</td>
                <td>{nft.abilityK}</td>
                <td>{nft.abilityL}</td>
                <td>{nft.abilityR}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default NftsPage;
