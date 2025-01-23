// import React, { useEffect, useState } from 'react';
// import { Formik } from 'formik';

// enum FieldType {
//     number = "number",
//     text = "text"
// }

// interface AppFieldProps {
//     id: string
//     type: FieldType
//     localizedName: string
// }

// const AppField = (props:AppFieldProps) => {
//     const { id, type, localizedName } = props;

//     return (
//         <div>
//             <label htmlFor="{id}" className="font-bold block text-base text-black-bold mb-1">{id}</label>
//             <input
//             id="{id}"
//             name="{id}"
//             type="{fieldType}"
//             onChange={formik.handleChange}
//             onBlur={formik.handleBlur}
//             value={values.id}
//             className={`text-sm w-full p-2 border rounded-lg ${
//                 touched.err_id && errors.err_id ? 'border-red-500' : 'border-gray-300'
//             }`}
//         </div>

//     )


//         {/* {touched.err_id && errors.err_id && typeof errors.err_id === 'string' && (
//         <div className="text-red-500 text-sm">{errors.err_id}</div>
//     )
//     } */}