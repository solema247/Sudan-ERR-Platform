import React from "react";
 import { Field, FieldArray } from "formik";

 const NewProjectActivities = ({ optionsActivities, optionsExpenses }) => (
   <FieldArray name="planned_activities">
     {({ push, remove, form }) => (
       <div className="space-y-4">
         <h3 className="text-2xl font-bold pt-4">Activities and Expenses</h3>
         {form.values.planned_activities.map((activity, index) => (

           <div key={index} className="p-4 bg-gray-100 rounded-lg shadow-md">
             <div className="mb-3">
               <label className="font-bold block text-sm mb-1">Select Activity</label>
               <Field
                 as="select"
                 name={`planned_activities[${index}].selectedActivity`}
                 className="text-sm w-full p-2 border rounded-lg"
               >
                 <option value="">Select Activity</option>
                 {optionsActivities.map((option) => (
                   <option key={option.value} value={option.value}>
                     {option.label}
                   </option>
                 ))}
               </Field>
             </div>

             <div className="mb-3">
               <label className="font-bold block text-sm mb-1">Quantity</label>
               <Field
                 name={`planned_activities[${index}].quantity`}
                 type="number"
                 className="text-sm w-full p-2 border rounded-lg"
                 placeholder="Enter quantity"
               />
             </div>

             <div className="mb-3">
               <label className="font-bold block text-sm mb-1">Expenses</label>
               <FieldArray name={`planned_activities[${index}].expenses`}>
                 {({ push, remove }) => (
                   <div className="space-y-2">
                     {activity.expenses.map((expense, expenseIndex) => (
                       <div key={expenseIndex} className="space-y-2">
                        <Field
                         as="select"
                         name={`planned_activities[${index}].expenses[${expenseIndex}].expense`}
                         className="text-sm w-full p-2 border rounded-lg"
                       >
                       <option value="">Select Expense</option>
                       {optionsExpenses.map((option) => (
                         <option key={option.value} value={option.value}>
                           {option.label}
                         </option>
                       ))}
                       </Field>

                         <Field
                           name={`planned_activities[${index}].expenses[${expenseIndex}].description`}
                           type="text"
                           placeholder="Expense Description"
                           className="text-sm w-full p-2 border rounded-lg"
                         />
                         <Field
                           name={`planned_activities[${index}].expenses[${expenseIndex}].amount`}
                           type="number"
                           placeholder="Amount"
                           className="text-sm w-full p-2 border rounded-lg"
                         />
                         <button
                           type="button"
                           className="text-red-500 font-bold"
                           onClick={() => remove(expenseIndex)}
                         >
                           Remove Expense
                         </button>
                       </div>
                     ))}
                     <button
                       type="button"
                       className="text-primaryGreen mt-2"
                       onClick={() => push({ expense: '', description: '', amount: '' })}
                     >
                       + Add Expense
                     </button>
                   </div>
                 )}
               </FieldArray>
             </div>

             <button
               type="button"
               className="text-red-500 mt-2 font-bold"
               onClick={() => remove(index)}
             >
               Remove Activity
             </button>
           </div>
         ))}
         <button
           type="button"
           className="text-primaryGreen mt-4 font-bold"
           onClick={() => push({ selectedActivity: '', quantity: '', expenses: [] })}
         >
           + Add Activity
         </button>
       </div>
     )}
   </FieldArray>
 );

 export default NewProjectActivities