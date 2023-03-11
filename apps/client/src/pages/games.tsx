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

type Props = {
  games: Awaited<ReturnType<typeof getAllGames>>;
  user: Awaited<ReturnType<typeof serverSideAuth>>;
  allStatus: Awaited<ReturnType<typeof getAllGameStatus>>;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const auth = await serverSideAuth(context);
  // if (!("user" in auth.props)) return auth;

  if ("redirect" in auth) return auth;
  const [games, allStatus] = await Promise.all([
    getAllGames(context),
    getAllGameStatus(context),
  ]);

  return { props: { ...auth.props, games, allStatus } };
};

const createFormSchema = endpoints.game.createGame.bodySchema;
type CreateFormData = z.infer<typeof createFormSchema>;

const Games: NextPage<Props> = ({ games: initialGames, allStatus }) => {
  const [isAddModalShown, setIsAddModalShown] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createFormSchema),
  });
  const { data: games, refetch } = useQuery({
    queryKey: ["games"],
    queryFn: () => getAllGames(),
    initialData: initialGames,
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
  if (!initialGames) return <div>Error retriving games</div>;

  return (
    <>
      <UpdateForm
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        allStatus={allStatus}
      />
      <div className="flex justify-end">
        <button
          className="btn-primary btn"
          onClick={() => setIsAddModalShown((v) => !v)}
        >
          Create a Game
        </button>
      </div>
      <form
        onSubmit={handleSubmit(handleAddGame)}
        className={clx(
          "form-control fixed top-0 right-0 bottom-0 z-20 w-full max-w-xs bg-slate-600 p-4 transition-all",
          !isAddModalShown && "translate-x-full"
        )}
      >
        <button
          type="reset"
          onClick={() => setIsAddModalShown((v) => !v)}
          className="btn-xs btn-circle btn"
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
                />
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

const updateFormSchema = endpoints.game.updateGame.bodySchema;
type UpdateFormData = z.infer<typeof updateFormSchema>;

const UpdateForm = ({
  editingItem,
  setEditingItem,
  allStatus,
}: {
  editingItem:
    | Exclude<Awaited<ReturnType<typeof getAllGames>>, null>[number]
    | null;
  setEditingItem: Dispatch<
    SetStateAction<
      Exclude<Awaited<ReturnType<typeof getAllGames>>, null>[number] | null
    >
  >;
  allStatus: Props["allStatus"];
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateFormSchema),
    values: {
      name: editingItem?.name || "",
      contractAddress: editingItem?.contractAddress || "",
    },
  });

  const handleUpdateGame = (data: UpdateFormData) => {
    if (!editingItem) return;
    promiseToast(
      service(endpoints.game.updateGame)({
        body: data,
        param: { id: editingItem.id },
      }).then(() => setEditingItem(null)),
      { loading: "Updating Game", success: "Game Updated" }
    ).catch(handleReqError);
  };
  return (
    <form
      onSubmit={handleSubmit(handleUpdateGame)}
      className={clx(
        "form-control fixed top-0 right-0 bottom-0 z-20 w-full max-w-xs bg-slate-600 p-4 transition-all",
        !editingItem && "translate-x-full"
      )}
    >
      <button
        type="reset"
        onClick={() => setEditingItem(null)}
        className="btn-xs btn-circle btn"
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
        <span className="label-text">Game Status</span>
      </label>
      <select className="select" {...register("status")}>
        {!!allStatus &&
          allStatus.map((status) => (
            <option key={status.id} value={status.name}>
              {status.name}
            </option>
          ))}
      </select>
      <p className="mt-2 text-error">{errors.status?.message}</p>
      <label className="label">
        <span className="label-text">Chain ID</span>
      </label>
      <input
        className="input-bordered input w-full max-w-xs"
        type="text"
        {...register("chainId")}
      />
      <p className="mt-2 text-error">{errors.chainId?.message}</p>
      <input
        className="btn mt-4 w-full max-w-xs"
        type="submit"
        value="Update Game"
      />
    </form>
  );
};

const GameItemRow = ({
  game,
  setEditingItem,
}: {
  game: Exclude<Awaited<ReturnType<typeof getAllGames>>, null>[number];
  setEditingItem: Dispatch<
    SetStateAction<
      Exclude<Awaited<ReturnType<typeof getAllGames>>, null>[number] | null
    >
  >;
}) => {
  return (
    <>
      <tr>
        <td>{game.name}</td>
        <td>{game.contractAddress}</td>
        <td>{game.chainId}</td>
        <td>{game.status}</td>
        <td>
          <button
            onClick={() => setEditingItem(game)}
            className="btn-accent btn"
          >
            Edit
          </button>
        </td>
      </tr>
    </>
  );
};

export default Games;
