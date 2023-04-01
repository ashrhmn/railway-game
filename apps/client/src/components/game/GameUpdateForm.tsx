import service from "@/service";
import { getAllGames, getAllGameStatus } from "@/service/game.service";
import { clx } from "@/utils/classname.utils";
import { handleReqError } from "@/utils/error.utils";
import { promiseToast } from "@/utils/toast.utils";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { endpoints } from "api-interface";
import { Dispatch, SetStateAction } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const updateFormSchema = endpoints.game.updateGame.bodySchema;
type UpdateFormData = z.infer<typeof updateFormSchema>;

const GameUpdateForm = ({
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
  allStatus: Awaited<ReturnType<typeof getAllGameStatus>>;
}) => {
  return (
    <div
      className={clx(
        "fixed top-0 right-0 bottom-0 z-20 w-full max-w-xs bg-slate-600 transition-all",
        !editingItem && "translate-x-full"
      )}
    >
      {!!editingItem && !!allStatus && (
        <Form
          allStatus={allStatus}
          editingItem={editingItem}
          setEditingItem={setEditingItem}
        />
      )}
    </div>
  );
};

const Form = ({
  editingItem,
  setEditingItem,
  allStatus,
}: {
  editingItem: Exclude<Awaited<ReturnType<typeof getAllGames>>, null>[number];
  setEditingItem: Dispatch<
    SetStateAction<
      Exclude<Awaited<ReturnType<typeof getAllGames>>, null>[number] | null
    >
  >;
  allStatus: Exclude<Awaited<ReturnType<typeof getAllGameStatus>>, null>;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateFormData>({
    resolver: zodResolver(updateFormSchema),
    values: {
      name: editingItem.name,
      contractAddress: editingItem.contractAddress || "",
      chainId: editingItem.chainId || 0,
      status: editingItem.status,
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
        "form-control h-full w-full bg-slate-600 p-4 transition-all"
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

export default GameUpdateForm;
