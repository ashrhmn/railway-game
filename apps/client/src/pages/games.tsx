import service from "@/service";
import { endpoints } from "api-interface";
import { GetServerSideProps, NextPage } from "next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { clx } from "@/utils/classname.utils";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { promiseToast } from "@/utils/toast.utils";
import { handleReqError } from "@/utils/error.utils";
import { useQuery } from "@tanstack/react-query";
import { serverSideAuth } from "@/service/serverSideAuth";
import { getAllGames, getAllGameStatus } from "@/service/game.service";
import GameUpdateForm from "@/components/game/GameUpdateForm";
import ErrorView from "@/components/common/ErrorView";
import FullScreenSpinner from "@/components/common/FullScreenSpinner";

type Props = {
  games: Awaited<ReturnType<typeof getAllGames>>;
  user: Awaited<ReturnType<typeof serverSideAuth>>;
  allStatus: Awaited<ReturnType<typeof getAllGameStatus>>;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const auth = await serverSideAuth(context);
  // if (!("user" in auth.props)) return auth;

  if ("redirect" in auth) return auth;
  const [allStatus] = await Promise.all([getAllGameStatus(context)]);

  return {
    props: {
      ...auth.props,
      allStatus,
    },
  };
};

const createFormSchema = endpoints.game.createGame.bodySchema;
type CreateFormData = z.infer<typeof createFormSchema>;

const Games: NextPage<Props> = ({ allStatus }) => {
  const [isAddModalShown, setIsAddModalShown] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createFormSchema),
  });
  const {
    data: games,
    refetch,
    error,
    status,
  } = useQuery({
    queryKey: ["games"],
    queryFn: () => getAllGames(),
  });
  const [editingItem, setEditingItem] = useState<
    Exclude<Awaited<ReturnType<typeof getAllGames>>, null>[number] | null
  >(null);
  useEffect(() => {
    refetch();
  }, [editingItem, refetch]);
  const handleAddGame = (data: CreateFormData) => {
    promiseToast(service(endpoints.game.createGame)({ body: data }), {
      loading: "Creating Game...",
    })
      .then(() => {
        setIsAddModalShown(false);
        refetch();
      })
      .catch(handleReqError);
  };
  if (status === "loading") return <FullScreenSpinner />;
  if (status === "error") return <ErrorView error={error} />;

  console.log({ games });

  return (
    <>
      <GameUpdateForm
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        allStatus={allStatus}
      />
      <div className="flex justify-end">
        <button
          className="btn btn-primary"
          onClick={() => setIsAddModalShown((v) => !v)}
        >
          Create a Game
        </button>
      </div>
      <form
        onSubmit={handleSubmit(handleAddGame)}
        className={clx(
          "form-control fixed top-0 right-0 bottom-0 z-20 w-full max-w-xs bg-slate-300 p-4 transition-all dark:bg-slate-700",
          !isAddModalShown && "translate-x-full"
        )}
      >
        <button
          type="reset"
          onClick={() => setIsAddModalShown((v) => !v)}
          className="btn btn-xs btn-circle"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
        <label className="label">
          <span className="label-text">Game Name</span>
        </label>
        <input
          className="input-bordered input w-full max-w-xs"
          type="text"
          {...register("name")}
        />
        <p className="mt-2 text-error">{errors.name?.message}</p>
        <label className="label">
          <span className="label-text">NFT Contract Address</span>
        </label>
        <input
          className="input-bordered input w-full max-w-xs"
          type="text"
          {...register("contractAddress")}
        />
        <p className="mt-2 text-error">{errors.contractAddress?.message}</p>
        <label className="label">
          <span className="label-text">Chain ID</span>
        </label>
        <input
          className="input-bordered input w-full max-w-xs"
          type="text"
          {...register("chainId")}
        />
        <p className="mt-2 text-error">{errors.chainId?.message}</p>
        <input className="btn mt-4 w-full max-w-xs" type="submit" value="Add" />
      </form>

      <div className="mt-10 overflow-x-auto">
        <table className="table-zebra table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contract Address</th>
              <th>Chain ID</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!!games &&
              games.map((game) => (
                <GameItemRow
                  key={game.id}
                  game={game}
                  setEditingItem={setEditingItem}
                  refetch={refetch}
                />
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const GameItemRow = ({
  game,
  setEditingItem,
  refetch,
}: {
  game: Exclude<Awaited<ReturnType<typeof getAllGames>>, null>[number];
  setEditingItem: Dispatch<
    SetStateAction<
      Exclude<Awaited<ReturnType<typeof getAllGames>>, null>[number] | null
    >
  >;
  refetch: () => void;
}) => {
  const handleDelete = () =>
    promiseToast(
      service(endpoints.game.deleteGame)({ param: { id: game.id } })
        .then(refetch)
        .catch(handleReqError),
      {
        loading: "Deleting...",
        success: "Deleted",
      }
    );
  return (
    <>
      <tr>
        <td>{game.name}</td>
        <td>{game.contractAddress}</td>
        <td>{game.chainId}</td>
        <td>{game.status}</td>
        <td className="flex items-center gap-1">
          <button
            onClick={() => setEditingItem(game)}
            className="btn btn-accent btn-sm"
          >
            Edit
          </button>
          <div>
            <label
              htmlFor={`delete-game-modal-${game.id}`}
              className="btn btn-error btn-sm"
            >
              Delete
            </label>
            <input
              type="checkbox"
              id={`delete-game-modal-${game.id}`}
              className="modal-toggle"
            />
            <label
              htmlFor={`delete-game-modal-${game.id}`}
              className="modal cursor-pointer"
            >
              <label className="modal-box relative" htmlFor="">
                <h3 className="text-lg font-bold">
                  Are you sure want to delete the game {game.name || game.id}
                </h3>
                <p className="py-4">
                  This will also delete all the NFTs and history along with it
                  <br />
                  NFTs : {game._count.nfts}
                  <br />
                  Map Position : {game._count.mapPositions}
                  <br />
                  Rail Position : {game._count.railPositions}
                  <br />
                  Winner Teams : {game._count.winnerTeams}
                </p>
                <div className="modal-action">
                  <label
                    htmlFor={`delete-game-modal-${game.id}`}
                    className="btn btn-error"
                    onClick={handleDelete}
                  >
                    Confirm Delete
                  </label>
                </div>
              </label>
            </label>
          </div>
          <div>
            <label
              htmlFor={`view-winners-game-modal-${game.id}`}
              className="btn btn-info btn-sm"
            >
              Winners
            </label>
            <input
              type="checkbox"
              id={`view-winners-game-modal-${game.id}`}
              className="modal-toggle"
            />
            <label
              htmlFor={`view-winners-game-modal-${game.id}`}
              className="modal cursor-pointer"
            >
              <label className="modal-box relative" htmlFor="">
                <h3 className="text-lg font-bold">
                  Winners of the game {game.name || game.id}
                </h3>
                {game.winnerTeams.length === 0 && (
                  <p className="py-4">No Winners Yet</p>
                )}
                {game.winnerTeams.length > 0 && (
                  <div className="w-full overflow-x-auto">
                    <table className="table-zebra table-compact table w-full">
                      <thead>
                        <tr>
                          <th>Winner Team</th>
                          <th>Game Won On</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.winnerTeams.map((winnerTeam) => (
                          <tr key={winnerTeam.id}>
                            <td>{winnerTeam.color}</td>
                            <td>{`${winnerTeam.createdAt.toLocaleDateString()} ${winnerTeam.createdAt.toLocaleTimeString()}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </label>
            </label>
          </div>
        </td>
      </tr>
    </>
  );
};

export default Games;
