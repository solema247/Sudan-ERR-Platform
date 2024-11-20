//components.DynamicActivityForm.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DynamicActivityFormProps {
  title: string;
  options: Array<{ id: string; name: string }>;
  onChange: (data: Array<any>) => void;
}

const DynamicActivityForm: React.FC<DynamicActivityFormProps> = ({
  title,
  options,
  onChange,
}) => {
  const { t } = useTranslation('projectApplication');

  const getFields = (translatedTitle: string) => {
    if (translatedTitle === t('plannedActivities')) {
      return {
        fieldNames: {
          field1: 'quantity',
          field2: 'activityDuration',
          field3: 'placeOfOperation',
        },
        placeholders: {
          field1: t('quantity'),
          field2: t('activityDuration'),
          field3: t('placeOfOperation'),
        },
      };
    } else if (translatedTitle === t('expenses')) {
      return {
        fieldNames: {
          field1: 'description',
          field2: 'frequency',
          field3: 'unitPrice',
        },
        placeholders: {
          field1: t('description'),
          field2: t('frequency'),
          field3: t('unitPrice'),
        },
      };
    }
    return {
      fieldNames: {
        field1: 'field1',
        field2: 'field2',
        field3: 'field3',
      },
      placeholders: {
        field1: t('field1'),
        field2: t('field2'),
        field3: t('field3'),
      },
    };
  };

  const translatedTitle = t(title); // Translate title dynamically
  const { fieldNames, placeholders } = getFields(translatedTitle);

  const [rows, setRows] = useState([
    {
      selectedOption: '',
      [fieldNames.field1]: '',
      [fieldNames.field2]: '',
      [fieldNames.field3]: '',
    },
  ]);

  const handleAddRow = () => {
    setRows((prevRows) => [
      ...prevRows,
      {
        selectedOption: '',
        [fieldNames.field1]: '',
        [fieldNames.field2]: '',
        [fieldNames.field3]: '',
      },
    ]);
  };

  const handleRowChange = (index: number, field: string, value: string) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    setRows(updatedRows);
    onChange(updatedRows);
  };

  const handleRemoveRow = (index: number) => {
    const updatedRows = rows.filter((_, idx) => idx !== index);
    setRows(updatedRows);
    onChange(updatedRows);
  };

  return (
    <div className="space-y-4 bg-gray-50 p-4 rounded-lg shadow-md">
      {/* Form Title */}
      <h3 className="font-bold text-lg">{translatedTitle}</h3>

      {/* Form Rows */}
      {rows.map((row, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center space-y-2 border-b pb-2 mb-2"
        >
          {/* Dropdown for Activities/Expenses */}
          <select
            className="w-full md:w-1/4 p-2 border rounded"
            value={row.selectedOption}
            onChange={(e) =>
              handleRowChange(index, 'selectedOption', e.target.value)
            }
          >
            <option value="">{translatedTitle}</option>
            {options.map((option) => (
              <option key={option.id} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>

          {/* Input Field 1 */}
          <input
            type="text"
            placeholder={placeholders.field1}
            className="w-full md:w-1/4 p-2 border rounded"
            value={row[fieldNames.field1]}
            onChange={(e) =>
              handleRowChange(index, fieldNames.field1, e.target.value)
            }
          />

          {/* Input Field 2 */}
          <input
            type="text"
            placeholder={placeholders.field2}
            className="w-full md:w-1/4 p-2 border rounded"
            value={row[fieldNames.field2]}
            onChange={(e) =>
              handleRowChange(index, fieldNames.field2, e.target.value)
            }
          />

          {/* Input Field 3 */}
          <input
            type="text"
            placeholder={placeholders.field3}
            className="w-full md:w-1/4 p-2 border rounded"
            value={row[fieldNames.field3]}
            onChange={(e) =>
              handleRowChange(index, fieldNames.field3, e.target.value)
            }
          />

          {/* Remove Row Button */}
          <button
            type="button"
            className="bg-red-500 text-white px-4 py-2 rounded ml-2"
            onClick={() => handleRemoveRow(index)}
          >
            {t('remove')}
          </button>
        </div>
      ))}

      {/* Add Row Button */}
      <button
        type="button"
        className="bg-primaryGreen text-white px-4 py-2 rounded"
        onClick={handleAddRow}
      >
        {t('addRow')}
      </button>
    </div>
  );
};

export default DynamicActivityForm;





