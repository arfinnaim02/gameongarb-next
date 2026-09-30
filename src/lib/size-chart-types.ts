export type SizeChartUnit =
  | "IN"
  | "CM"
  | "NONE";

export type SizeChartRowData = {
  size: string;

  values:
    string[];
};

export type AdminSizeChartRecord = {
  id: string;

  name: string;

  unit:
    SizeChartUnit;

  note: string;

  columns:
    string[];

  rows:
    SizeChartRowData[];

  active:
    boolean;

  productCount:
    number;

  createdAt:
    string;

  updatedAt:
    string;
};

export type AdminSizeChartOption = {
  id: string;

  name: string;

  unit:
    SizeChartUnit;

  active:
    boolean;
};

export type PublicSizeChart = {
  id: string;

  name: string;

  unit:
    SizeChartUnit;

  note: string;

  columns:
    string[];

  rows:
    SizeChartRowData[];
};