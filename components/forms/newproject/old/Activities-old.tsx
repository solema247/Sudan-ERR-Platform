// import React from 'react';
// import { useTranslation } from 'react-i18next';
// import { FieldArray, Formik, Field, Form } from 'formik';

// interface ActivityFormProps {
//   title: string;
//   options: Array<{ id: string; name: string }>;
//   onChange: (data: Array<any>) => void;
// }

// const DynamicActivityForm: React.FC<ActivityFormProps> = ({ title, options, onChange }) => {
//   const { t } = useTranslation('projectApplication');

//   const getFields = (translatedTitle: string) => {
//     if (translatedTitle === t('plannedActivities')) {
//       return {
//         fields: [
//           { name: 'quantity', placeholder: t('quantity') },
//           { name: 'activityDuration', placeholder: t('activityDuration') },
//           { name: 'placeOfOperation', placeholder: t('placeOfOperation') }
//         ]
//       };
//     } else if (translatedTitle === t('expenses')) {
//       return {
//         fields: [
//           { name: 'description', placeholder: t('description') },
//           { name: 'frequency', placeholder: t('frequency') },
//           { name: 'unitPrice', placeholder: t('unitPrice') }
//         ]
//       };
//     }
//     return {
//       fields: [
//         { name: 'field1', placeholder: t('field1') },
//         { name: 'field2', placeholder: t('field2') },
//         { name: 'field3', placeholder: t('field3') }
//       ]
//     };
//   };

//   const translatedTitle = t(title);
//   const { fields } = getFields(translatedTitle);

//   return (
//     <Formik
//       initialValues={{
//         rows: [
//           { selectedOption: '', quantity: '', activityDuration: '', placeOfOperation: '' }
//         ]
//       }}
//       onSubmit={(values) => {
//         onChange(values.rows);
//       }}
//     >
//       {({ values }) => (
//         <Form className="space-y-4 bg-gray-50 p-4 rounded-lg">
//           <h3 className="font-bold text-md">{translatedTitle}</h3>
//           <FieldArray name="rows">
//             {({ push, remove }) => (
//               <>
//                 {values.rows.map((row, index) => (
//                   <div key={index} className="flex flex-wrap items-center space-y-2 border-b pb-2 mb-2">
//                     <Field
//                       as="select"
//                       name={`rows[${index}].selectedOption`}
//                       className="text-sm w-full md:w-1/4 p-2 border rounded"
//                     >
//                       <option value="">{translatedTitle}</option>
//                       {options.map((option) => (
//                         <option key={option.id} value={option.name}>
//                           {option.name}
//                         </option>
//                       ))}
//                     </Field>

//                     {fields.map((field, idx) => (
//                       <Field
//                         key={idx}
//                         type="text"
//                         name={`rows[${index}].${field.name}`}
//                         placeholder={field.placeholder}
//                         className="text-sm w-full md:w-1/4 p-2 border rounded"
//                       />
//                     ))}

//                     <button
//                       type="button"
//                       className="text-red-500 ml-2"
//                       onClick={() => remove(index)}
//                     >
//                       {t('removeRow')}
//                     </button>
//                   </div>
//                 ))}
//                 <button
//                   type="button"
//                   className="bg-primaryGreen text-white px-4 py-2 rounded"
//                   onClick={() =>
//                     push({ selectedOption: '', quantity: '', activityDuration: '', placeOfOperation: '' })
//                   }
//                 >
//                   {t('addRow')}
//                 </button>
//               </>
//             )}
//           </FieldArray>
//           <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
//             {t('save')}
//           </button>
//         </Form>
//       )}
//     </Formik>
//   );
// };

// export default DynamicActivityForm;
