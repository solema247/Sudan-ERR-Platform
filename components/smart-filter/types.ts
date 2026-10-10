export type FilterInputType = 'select' | 'multi_select' | 'date_range';

export type FilterValue = string | string[] | [string, string];

export type FilterSelectOption = { value: string; label: string };

export type FilterFieldConfig = {
  id: string;
  label: string;
  type: FilterInputType;
  options?: FilterSelectOption[];
  placeholder?: string;
};

export type ActiveFilter = {
  id: string;
  fieldId: string;
  value: FilterValue;
};
