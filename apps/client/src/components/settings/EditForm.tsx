import service from "@/service";
import { IEditingSetting } from "@/types";
import { clx } from "@/utils/classname.utils";
import { handleReqError } from "@/utils/error.utils";
import { promiseToast } from "@/utils/toast.utils";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { endpoints } from "api-interface";
import { useForm } from "react-hook-form";
import { z } from "zod";

const updateSchema = endpoints.settings.update.bodySchema;
type IUpdateFrom = z.infer<typeof updateSchema>;

const EditForm = ({
  data: initData,
  setEditingSetting,
  refetch,
}: {
  data: IEditingSetting;
  setEditingSetting: React.Dispatch<React.SetStateAction<IEditingSetting>>;
  refetch: () => void;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IUpdateFrom>({
    resolver: zodResolver(endpoints.settings.update.bodySchema),
    values: initData || { boolValue: true, numValue: 0, strValue: "" },
  });
  const handleUpdate = async (data: IUpdateFrom) => {
    if (!initData) return;
    await promiseToast(
      service(endpoints.settings.update)({
        body: data,
        param: { key: initData.key },
      })
        .then(refetch)
        .then(() => setEditingSetting(null)),
      { success: "Updated successfully", loading: "Updating..." }
    ).catch(handleReqError);
    console.log(data);
  };
  return (
    <form
      className={clx(
        !initData && "translate-x-full",
        "fixed right-0 top-0 bottom-0 z-30 w-96 bg-slate-300 p-2 transition-all dark:bg-slate-700"
      )}
      onSubmit={handleSubmit(handleUpdate)}
    >
      <button
        type="reset"
        onClick={() => setEditingSetting(null)}
        className="btn btn-xs btn-circle"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
      <div className="form-control">
        <label className="label">
          <span className="label-text">{initData?.title}</span>
        </label>
        {!!initData && initData.valueType === "NUMBER" && (
          <>
            <input
              type="number"
              className="input-bordered input"
              {...register("numValue")}
            />
            <p className="text-error">{errors.numValue?.message}</p>
          </>
        )}
        {!!initData && initData.valueType === "STRING" && (
          <>
            <input
              type="number"
              className="input-bordered input"
              {...register("strValue")}
            />
            <p className="text-error">{errors.strValue?.message}</p>
          </>
        )}
        {!!initData && initData.valueType === "BOOLEAN" && (
          <>
            <input
              type="number"
              className="input-bordered input"
              {...register("boolValue")}
            />
            <p className="text-error">{errors.boolValue?.message}</p>
          </>
        )}
      </div>
      <div className="mt-4">
        <button type="submit" className="btn btn-primary">
          Update
        </button>
      </div>
    </form>
  );
};

export default EditForm;
