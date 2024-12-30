import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import Button from '../ui/Button';
import FormBubble from '../ui/FormBubble';
import ActivitiesFieldArray from './NewProjectActivities';

/**
 * Application for a new project.
 * 
 * TODO: Make this whole thing typesafe
 */

interface NewProjectApplicationProps {
  onReturnToMenu: () => void;
}


const NewProjectApplication:React.FC<NewProjectApplicationProps> = ({ onReturnToMenu }) => {
   const { t, i18n } = useTranslation('projectApplication');
   const [availableRegions, setAvailableRegions] = useState([]);
   const [localitiesDict, setLocalitiesDict] = useState({});
   const [relevantLocalities, setRelevantLocalities] = useState([]);
   const [optionsActivities, setOptionsActivities] = useState([]);
   const [optionsExpenses, setOptionsExpenses] = useState([]);
   const [isFormSubmitted, setIsFormSubmitted] = useState(false);
   const [isLoading, setLoading] = useState(false);


   useEffect(() => {
     /**
      * Fetches Select options for activities, expenses and localities (which are based on what state you have selected.)
      * 
      * "intendedBeneficiaries": "Intended Beneficiaries",
    "estimatedBeneficiaries": "Estimated Beneficiaries",
      */

     const fetchOptions = async () => {
       setLoading(true);
       try {
         const res = await fetch(`/api/project-application?language=${i18n.language}`);
         if (res.ok) {
           const data = await res.json();

           if (!Array.isArray(data.states)) {
             throw new Error('Invalid data format: states should be an array');
           }

           // Populate <select>
           setOptionsActivities(
             data.plannedActivities.map(({ id, name }) => ({ value: id, label: t(name) }))
           );
           setOptionsExpenses(
             data.expenseCategories.map(({ id, name }) => ({ value: id, label: t(name) }))
           );

           const stateAndLocalityData = data.states;
           const localitiesDict = getLocalitiesDict(stateAndLocalityData);
           const availableStates = getAvailableStates(stateAndLocalityData);

           setAvailableRegions(availableStates);
           setLocalitiesDict(localitiesDict);

         } else {
           throw new Error('Failed to fetch options');
         }
       } catch (error) {
         console.error('Error fetching options:', error);
       } finally {
         setLoading(false);
       }
     };
     fetchOptions();
   }, [i18n.language, t]);

   const validationSchema = Yup.object({
     date: Yup.string().required(t('validation.required')),
     err: Yup.string().required(t('validation.required')),
     state: Yup.string().required(t('validation.required')),
     locality: Yup.string().required(t('validation.required')),
     project_objectives: Yup.string().required(t('validation.required')),
     intended_beneficiaries: Yup.string().required(t('validation.required')),
     estimated_beneficiaries: Yup.number().required(t('validation.required')),
     planned_activities: Yup.array().of(
       Yup.object({
         selectedActivity: Yup.string().required(t('validation.required')),
         quantity: Yup.number().required(t('validation.required')),
         expenses: Yup.array().of(
           Yup.object({
             expense: Yup.string().required(t('validation.required')),
             description: Yup.string().required(t('validation.required')),
             amount: Yup.number().required(t('validation.required')),
           })
         ),
       })
     ),
     estimated_timeframe: Yup.string().required(t('validation.required')),
     additional_support: Yup.string(),
     officer_name: Yup.string().required(t('validation.required')),
   });

 const getAvailableStates = (localitiesData) => {
     return localitiesData
     .map( (item) => item.state_name );
 }

 const getLocalitiesDict = (localitiesData) => {
     let dict = {};
     localitiesData.forEach((item) => {
         const { state_name, localities } = item; // Destructure the state_name and locality

         if (!dict[state_name]) {
             dict[state_name] = []; // Initialize array if it doesn't exist
         }
         if (!dict[state_name].includes(localities)) {
             localities.forEach((locality) => {
                 dict[state_name].push(locality); // Add locality if it's not already in the array
             })

         }
     })
     return dict;
   }

   const handleSubmit = async (values, { setSubmitting }) => {
     setLoading(true);
     
     try {
       console.log("Making POST request to /api/project-application");
       const res = await fetch('/api/project-application', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(values),
       });
       
       console.log("Response received:", res);
       
       if (res.ok) {
         console.log("Submission successful");
         setIsFormSubmitted(true);
       } else {
         const errorData = await res.json();
         console.error('Submission failed:', errorData);
         alert(t('submissionFailed'));
       }
     } catch (error) {
       console.error('Error submitting form:', error);
       alert(t('submissionFailed'));
     } finally {
       setLoading(false);
       setSubmitting(false);
     }
   };

   return (
     <>
       {isFormSubmitted ? (
         <div className="bg-white p-4 rounded-lg">
           <p className="text-black-bold text-base mb-4">{t('formSubmitted')}</p>
           <div className="flex justify-center">
             <Button text={t('returnToMenu')} onClick={onReturnToMenu} />
           </div>
         </div>
       ) : (
         <FormBubble>
           <Formik
             initialValues={{
               date: '',
               err: '',
               state: '',
               locality: '',
               project_objectives: '',
               intended_beneficiaries: '',
               estimated_beneficiaries: '',
               planned_activities: [],
               estimated_timeframe: '',
               additional_support: '',
               officer_name: '',
             }}
             validationSchema={validationSchema}
             onSubmit={(values, actions) => {
               console.log("Formik onSubmit triggered");
               handleSubmit(values, actions);
             }}
           >
             {({ isSubmitting, values, setFieldValue }) => (
               <Form className="space-y-3 bg-white p-3 rounded-lg">
                 <p className="text-3xl">{t('newProjectApplication')}</p>

                 {/* Date */}
                 <div className="mb-3">
                   <label className="font-bold block text-base text-black-bold mb-1">{t('date')}</label>
                   <Field name="date" type="date" className="text-sm w-full p-2 border rounded-lg" disabled={isLoading} />
                 </div>

                 {/* Room ID */}
                 <div className="mb-3">
                   <label className="font-bold block text-base text-black-bold mb-1">{t('errId')}</label>
                   <Field name="err" type="text" className="text-sm w-full p-2 border rounded-lg" placeholder={t('enterErrId')} disabled={isLoading} />
                 </div>

                  {/* Objectives */}
                  <div className="mb-3">
                   <label className="font-bold block text-base text-black-bold mb-1">{t('projectObjectives')}</label>
                   <Field 
                     name="project_objectives"
                     type="text" 
                     className="text-sm w-full p-2 border rounded-lg" 
                     disabled={isLoading} 
                   />
                 </div>

                 {/* Intended beneficiaries */}
                  <div className="mb-3">
                   <label className="font-bold block text-base text-black-bold mb-1">{t('intendedBeneficiaries')}</label>
                   <Field 
                     name="intended_beneficiaries"
                     type="text" 
                     className="text-sm w-full p-2 border rounded-lg" 
                     disabled={isLoading} 
                   />
                 </div>

                 {/* Estimated beneficiaries*/}
                  <div className="mb-3">
                   <label className="font-bold block text-base text-black-bold mb-1">{t('estimatedBeneficiaries')}</label>
                   <Field 
                     name="estimated_beneficiaries"
                     type="number" 
                     className="text-sm w-full p-2 border rounded-lg" 
                     disabled={isLoading} 
                   />
                 </div>

                 {/* State or region */}
                 <div className="mb-3">
                   <label className="font-bold block text-base text-black-bold mb-1">{t('state')}</label>
                   <Field
                     name="state"
                     as="select"
                     className="text-sm w-full p-2 border rounded-lg"
                     disabled={isLoading}
                     onChange={(e) => {
                       const selectedState = e.target.value;
                       setFieldValue('state', selectedState);
                       setFieldValue('locality', ''); // Reset locality when state changes
                       setRelevantLocalities(localitiesDict[selectedState]);
                     }}
                   >
                     <option value="">{t('selectState')}</option>
                     {availableRegions.map((state_name) => (
                       <option key={state_name} value={state_name}>
                         {state_name}
                       </option>
                     ))}
                   </Field>
                 </div>

                 {/* Locality*/}

                 <div className="mb-3">
                   <label className="font-bold block text-base text-black-bold mb-1">{t('locality')}</label>
                   <Field
                     name="locality"
                     as="select"
                     className="text-sm w-full p-2 border rounded-lg"
                     disabled={!values.state || isLoading}
                     >
                     <option value="">{t('selectLocality')}</option>
                     {relevantLocalities && relevantLocalities.length > 0 ? (
                         relevantLocalities.map((locality) => (
                         <option key={locality} value={locality}>
                             {locality}
                         </option>
                         ))
                     ) : (
                         <option key="no" value="Trouble getting localities">
                         {t('troubleGettingLocalities')}
                         </option>
                     )}
                     </Field>
                 </div>

                 {/* Add/remove activities and their expenses */}

                 <ActivitiesFieldArray optionsActivities={optionsActivities} optionsExpenses={optionsExpenses} />

                 {/* Estimated timeframe */}

                 <div className="mb-3">
                   <label className="font-bold block text-base text-black-bold mb-1">{t('estimatedTimeframe')}</label>
                   <Field
                     as="textarea"
                     name="estimated_timeframe"
                     className="text-sm w-full p-2 border rounded-lg"
                     placeholder={t('enterEstimatedTimeframe')}
                     disabled={isLoading}
                   />
                 </div>

                 {/* Additional support */}

                 <div className="mb-3">
                   <label className="font-bold block text-base text-black-bold mb-1">{t('additionalSupport')}</label>
                   <Field
                     as="textarea"
                     name="additional_support"
                     className="text-sm w-full p-2 border rounded-lg"
                     placeholder={t('enterAdditionalSupport')}
                     disabled={isLoading}
                   />
                 </div>

                 {/* Officer name */}

                 <div className="mb-3">
                   <label className="font-bold block text-base text-black-bold mb-1">{t('officerName')}</label>
                   <Field
                     name="officer_name"
                     type="text"
                     className="text-sm w-full p-2 border rounded-lg"
                     placeholder={t('enterOfficerName')}
                     disabled={isLoading}
                   />
                 </div>

                 <div className="container py-4 px-4 mx-0 min-w-full flex flex-col items-center">
                   <Button
                     type="submit"
                     text={isLoading ? t('button.processing') : t('button.submit')}
                     disabled={isSubmitting || isLoading}
                     onClick={() => console.log("Submit button clicked")}
                   />
                 </div>
               </Form>
             )}
           </Formik>
         </FormBubble>
       )}
     </>
   );
 };

 export default NewProjectApplication;