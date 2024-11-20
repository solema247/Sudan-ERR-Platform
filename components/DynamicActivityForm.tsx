//components.DynamicActivityForm.tsx
import React, { useState } from 'react';

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
  const getFields = (title: string) => {
    switch (title) {
      case 'Planned Activities':
        return {
          fieldNames: {
            field1: 'quantity',
            field2: 'activityDuration',
            field3: 'placeOfOperation',
          },
          placeholders: {
            field1: 'Quantity',
            field2: 'Activity Duration',
            field3: 'Place of Operation',
          },
        };
      case 'Expenses':
        return {
          fieldNames: {
            field1: 'description',
            field2: 'frequency',
            field3: 'unitPrice',
          },
          placeholders: {
            field1: 'Description',
            field2: 'Freq.',
            field3: 'Unit Price',
          },
        };
      default:
        return {
          fieldNames: {
            field1: 'field1',
            field2: 'field2',
            field3: 'field3',
          },
          placeholders: {
            field1: 'Field 1',
            field2: 'Field 2',
            field3: 'Field 3',
          },
        };
    }
  };

  const { fieldNames, placeholders } = getFields(title);

  const [rows, setRows] = useState([
    {
      selectedOption: '',
      [fieldNames.field1]: '',
      [fieldNames.field2]: '',
      [fieldNames.field3]: '',
    },
  ]);

  const handleAddRow = () => {
    setRows([
      ...rows,
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
      <h3 className="font-bold text-lg">{title}</h3>
      {rows.map((row, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center space-y-2 border-b pb-2 mb-2"
        >
          {/* Dropdown */}
          <select
            className="w-full md:w-1/4 p-2 border rounded"
            value={row.selectedOption}
            onChange={(e) =>
              handleRowChange(index, 'selectedOption', e.target.value)
            }
          >
            <option value="">{title}</option>
            {options.map((option) => (
              <option key={option.id} value={option.name}>
                {option.name}
              </option>
            ))}
          </select>

          {/* Input 1 */}
          <input
            type="text"
            placeholder={placeholders.field1}
            className="w-full md:w-1/4 p-2 border rounded"
            value={row[fieldNames.field1]}
            onChange={(e) =>
              handleRowChange(index, fieldNames.field1, e.target.value)
            }
          />

          {/* Input 2 */}
          <input
            type="text"
            placeholder={placeholders.field2}
            className="w-full md:w-1/4 p-2 border rounded"
            value={row[fieldNames.field2]}
            onChange={(e) =>
              handleRowChange(index, fieldNames.field2, e.target.value)
            }
          />

          {/* Input 3 */}
          <input
            type="text"
            placeholder={placeholders.field3}
            className="w-full md:w-1/4 p-2 border rounded"
            value={row[fieldNames.field3]}
            onChange={(e) =>
              handleRowChange(index, fieldNames.field3, e.target.value)
            }
          />

          {/* Remove Button */}
          <button
            type="button"
            className="bg-red-500 text-white px-4 py-2 rounded ml-2"
            onClick={() => handleRemoveRow(index)}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="bg-primaryGreen text-white px-4 py-2 rounded"
        onClick={handleAddRow}
      >
        Add Row
      </button>
    </div>
  );
};

export default DynamicActivityForm;


