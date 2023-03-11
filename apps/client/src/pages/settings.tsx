import ErrorView from "@/components/common/ErrorView";
import FullScreenSpinner from "@/components/common/FullScreenSpinner";
import service from "@/service";
import { getAllSettings } from "@/service/settings.service";
import { clx } from "@/utils/classname.utils";
import { handleReqError } from "@/utils/error.utils";
import { promiseToast } from "@/utils/toast.utils";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "api-interface";
import { GetServerSideProps, NextPage } from "next";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type IEditingSetting = null | {
  key: string;
  strValue?: string | null;
  numValue?: number | null;
  boolValue?: boolean | null;
  valueType: string;
  title: string | null;
};

type Props = {
  settings: Awaited<ReturnType<typeof getAllSettings>>;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const settings = await getAllSettings(context);
  return { props: { settings } };
};

const SettingsPage: NextPage<Props> = ({ settings: initialSettings }) => {
  const {
    data: settings,
    error,
    refetch,
  } = useQuery({
    queryFn: () => service(endpoints.settings.getAll)({}),
    queryKey: ["settings-all"],
    initialData: initialSettings,
    retry: false,
  });
  const [editingSetting, setEditingSetting] = useState<IEditingSetting>(null);
  if (!!error) return <ErrorView error={error} />;
  if (!settings) return <FullScreenSpinner />;

  return (
    <div>
      <EditForm
        data={editingSetting}
        setEditingSetting={setEditingSetting}
        refetch={refetch}
      />
      <div className="mt-4">
        <table className="table-zebra table w-full">
          <tbody>
            {settings.map(
              ({
                boolValue,
                description,
                id,
                key,
                numValue,
                strValue,
                title,
                valueType,
              }) => (
                <tr key={id}>
                  <td>{title}</td>
                  <td>{description}</td>
                  <td>
                    {valueType === "STRING"
                      ? strValue
                      : valueType === "NUMBER"
                      ? numValue
                      : valueType === "BOOLEAN"
                      ? boolValue
                        ? "YES"
                        : "NO"
                      : null}
                  </td>
                  <td className="btn">
                    <button
                      onClick={() =>
                        setEditingSetting({
                          key,
                          valueType,
                          boolValue,
                          numValue,
                          strValue,
                          title,
                        })
                      }
                    >
                      UPDATE
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

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
        "fixed right-0 top-0 bottom-0 z-30 w-96 bg-neutral p-2 transition-all"
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

export default SettingsPage;
