import ErrorView from "@/components/common/ErrorView";
import FullScreenSpinner from "@/components/common/FullScreenSpinner";
import EditForm from "@/components/settings/EditForm";
import service from "@/service";
import { serverSideAuth } from "@/service/serverSideAuth";
import {
  getAllAbilityScoreMappings,
  getAllSettings,
} from "@/service/settings.service";
import { IEditingSetting } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { endpoints } from "api-interface";
import { GetServerSideProps, NextPage } from "next";
import React, { useState } from "react";

type Props = {
  settings: Awaited<ReturnType<typeof getAllSettings>>;
  abilityScoreMappings: Awaited<ReturnType<typeof getAllAbilityScoreMappings>>;
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const auth = await serverSideAuth(context);
  if ("redirect" in auth) return auth;
  const [settings, abilityScoreMappings] = await Promise.all([
    getAllSettings(context),
    getAllAbilityScoreMappings(context),
  ]);
  return { props: { ...auth.props, settings, abilityScoreMappings } };
};

const SettingsPage: NextPage<Props> = ({
  settings: initialSettings,
  abilityScoreMappings: initialAbilityScoreMappings,
}) => {
  const {
    data: settings,
    error: settingsFetchError,
    refetch: refetchSettings,
  } = useQuery({
    queryFn: () => service(endpoints.settings.getAll)({}),
    queryKey: ["settings-all"],
    initialData: initialSettings,
    retry: false,
  });

  const { data: abilityScoreMappings, error: abilityScoreMappingsFetchError } =
    useQuery({
      queryKey: ["ability-score-mappings"],
      queryFn: () => service(endpoints.settings.getAllAbilityScoreMappings)({}),
      initialData: initialAbilityScoreMappings,
      retry: false,
    });

  const [editingSetting, setEditingSetting] = useState<IEditingSetting>(null);
  if (!!settingsFetchError) return <ErrorView error={settingsFetchError} />;
  if (!!abilityScoreMappingsFetchError)
    return <ErrorView error={abilityScoreMappingsFetchError} />;
  if (!settings) return <FullScreenSpinner />;
  if (!abilityScoreMappings) return <FullScreenSpinner />;

  return (
    <div>
      <EditForm
        data={editingSetting}
        setEditingSetting={setEditingSetting}
        refetch={refetchSettings}
      />
      <div className="mt-8">
        <h1 className="my-2 text-2xl">Preferences</h1>
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
      <div className="mt-8">
        <h1 className="my-2 text-2xl">Ability Score Mapping</h1>
        <table className="table-zebra table w-full">
          <thead>
            <tr>
              <th rowSpan={2}>Level</th>
              <th colSpan={2}>B</th>
              <th colSpan={2}>L</th>
              <th colSpan={2}>K</th>
              <th colSpan={2}>R</th>
            </tr>
            <tr>
              <th>Min</th>
              <th>Max</th>
              <th>Min</th>
              <th>Max</th>
              <th>Min</th>
              <th>Max</th>
              <th>Min</th>
              <th>Max</th>
            </tr>
          </thead>
          <tbody>
            {abilityScoreMappings.map((asm) => (
              <tr key={asm.id}>
                <td>{asm.level}</td>
                <td>{asm.abilityB_Min}</td>
                <td>{asm.abilityB_Max}</td>
                <td>{asm.abilityL_Min}</td>
                <td>{asm.abilityL_Max}</td>
                <td>{asm.abilityK_Min}</td>
                <td>{asm.abilityK_Max}</td>
                <td>{asm.abilityR_Min}</td>
                <td>{asm.abilityR_Max}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SettingsPage;
