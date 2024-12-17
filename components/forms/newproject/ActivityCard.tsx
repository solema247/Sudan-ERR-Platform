import React from "react";
import { Field, FieldArray } from "formik";

const ActivityCard = ({ values, activityIndex, optionsActivities, optionsExpenses, remove }) => (
  <div className="space-y-6 p-6 rounded-lg bg-gray-50 shadow-md">
    {/* Activity Card */}
    <div>
      <label htmlFor={`activities[${activityIndex}].selectedActivity`} className="block text-sm font-bold">
        Select Activity
      </label>
      <Field
        as="select"
        name={`activities[${activityIndex}].selectedActivity`}
        className="w-full p-2 border rounded mt-1 text-sm"
      >
        <option value="">Select Activity</option>
        {optionsActivities.map((option) => (
          <option key={option.id} value={option.name}>
            {option.name}
          </option>
        ))}
      </Field>
    </div>

    <div>
      <label htmlFor={`activities[${activityIndex}].quantity`} className="block text-sm font-bold">
        Quantity
      </label>
      <Field
        type="number"
        name={`activities[${activityIndex}].quantity`}
        placeholder="Quantity"
        className="w-full p-2 border rounded mt-1 text-sm"
      />
    </div>

    <div>
      <label htmlFor={`activities[${activityIndex}].duration`} className="block text-sm font-bold">
        Duration
      </label>
      <Field
        type="text"
        name={`activities[${activityIndex}].duration`}
        placeholder="Duration"
        className="w-full p-2 border rounded mt-1 text-sm"
      />
    </div>

    <div>
      <label htmlFor={`activities[${activityIndex}].placeOfOperation`} className="block text-sm font-bold">
        Place of Operation
      </label>
      <Field
        type="text"
        name={`activities[${activityIndex}].placeOfOperation`}
        placeholder="Place of Operation"
        className="w-full p-2 border rounded mt-1 text-sm"
      />
    </div>

    <button
      type="button"
      className="text-red-500"
      onClick={() => remove(activityIndex)}
    >
      Remove
    </button>

    <div className="space-y-4 mt-6">
      <h4 className="font-bold text-lg">Expenses for this activity</h4>
      <FieldArray name={`activities[${activityIndex}].expenses`}>
        {({ push, remove }) => (
          <>
            {values.activities[activityIndex].expenses.map((expense, expenseIndex) => (
              <div
                key={expenseIndex}
                className="space-y-4 mb-6 bg-slate-300 rounded-lg px-4 py-4 font-bold"
              >
                <div>
                  <label
                    htmlFor={`activities[${activityIndex}].expenses[${expenseIndex}].description`}
                    className="block text-sm"
                  >
                    Expense Description
                  </label>
                  <Field
                    type="text"
                    name={`activities[${activityIndex}].expenses[${expenseIndex}].description`}
                    placeholder="Expense Description"
                    className="w-full p-2 border rounded mt-1 text-sm font-normal"
                  />
                </div>

                <div>
                  <label
                    htmlFor={`activities[${activityIndex}].expenses[${expenseIndex}].amount`}
                    className="block text-sm font-bold"
                  >
                    Amount
                  </label>
                  <Field
                    type="number"
                    name={`activities[${activityIndex}].expenses[${expenseIndex}].amount`}
                    placeholder="Amount"
                    className="w-full p-2 border rounded mt-1 text-sm font-normal"
                  />
                </div>

                <button
                  type="button"
                  className="text-red-700 font-normal"
                  onClick={() => remove(expenseIndex)}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="py-2 mt-4"
              onClick={() => push({ description: "", amount: "" })}
            >
              + Add Expense
            </button>
          </>
        )}
      </FieldArray>
    </div>
  </div>
);

export default ActivityCard;
