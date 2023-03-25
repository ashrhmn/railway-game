export type IEditingSetting = null | {
  key: string;
  strValue?: string | null;
  numValue?: number | null;
  boolValue?: boolean | null;
  valueType: string;
  title: string | null;
};
