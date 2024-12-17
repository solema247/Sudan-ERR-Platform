import React from "react";
import { FieldArray } from "formik";
import ActivityCard from "./ActivityCard";

const ActivitiesList = ({ values, optionsActivities, optionsExpenses, push, remove }) => (

  <FieldArray name="activities">
    {() => (
      <div>
        {values.activities.map((activity, activityIndex) => (
          <ActivityCard
            key={activityIndex}
            activityIndex={activityIndex}
            optionsActivities={optionsActivities}
            optionsExpenses={optionsExpenses}
            remove={remove}
          />
        ))}

        <button
          type="button"
          className="py-2 rounded mt-4"
          onClick={() =>
            push({
              selectedActivity: "",
              quantity: "",
              duration: "",
              placeOfOperation: "",
              expenses: [],
            })
          }
        >
          + Add Another Activity
        </button>
      </div>
    )}
  </FieldArray>
);

export default ActivitiesList;
