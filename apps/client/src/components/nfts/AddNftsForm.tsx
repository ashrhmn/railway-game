import { getColors, getGames } from "@/service/map.service";
import { clx } from "@/utils/classname.utils";
import { XMarkIcon } from "@heroicons/react/24/solid";
import React from "react";
import SelectColorGame from "../common/SelectColorGame";
import axios from "axios";
import { promiseToast } from "@/utils/toast.utils";
import { handleReqError } from "@/utils/error.utils";

type Props = {
  colors: Awaited<ReturnType<typeof getColors>>;
  games: Awaited<ReturnType<typeof getGames>>;
  selectedColor: string | undefined;
  setSelectedColor: React.Dispatch<React.SetStateAction<string | undefined>>;
  selectedGameId: string | undefined;
  setSelectedGameId: React.Dispatch<React.SetStateAction<string | undefined>>;
  show: boolean;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
};

const AddNftsForm = ({
  show,
  setShow,
  colors,
  games,
  selectedColor,
  selectedGameId,
  setSelectedColor,
  setSelectedGameId,
}: Props) => {
  const handleFromSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formdata = new FormData(e.currentTarget);
    formdata.append("game_id", selectedGameId || "");
    promiseToast(
      axios.post("/api/nfts/add-csv", formdata, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }),
      {
        loading: "Adding NFTs",
        success: "NFTs added",
      }
    ).catch(handleReqError);
  };

  return (
    <form
      onSubmit={handleFromSubmit}
      className={clx(
        !show && "translate-x-full",
        "fixed top-0 right-0 bottom-0 z-20 w-80 bg-neutral p-2 transition-all"
      )}
    >
      <button
        type="reset"
        onClick={() => setShow((v) => !v)}
        className="btn btn-xs btn-circle"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
      <h1 className="my-4 text-2xl font-bold">Add NFTs</h1>
      <SelectColorGame
        colors={colors}
        games={games}
        selectedColor={selectedColor}
        selectedGameId={selectedGameId}
        setSelectedColor={setSelectedColor}
        setSelectedGameId={setSelectedGameId}
        colorAllOption
        hideColor
      />

      <input
        type="file"
        name="file"
        className="file-input mt-4 w-full max-w-xs"
      />
      <div className="form-control mt-2">
        <label className="label flex cursor-pointer justify-start gap-4">
          <input name="replace" type="checkbox" className="checkbox" />
          <span className="label-text">
            Replace all previous NFTs from this game
          </span>
        </label>
      </div>
      <button type="submit" className="btn btn-primary mt-4 w-full">
        Add
      </button>
    </form>
  );
};

export default AddNftsForm;
