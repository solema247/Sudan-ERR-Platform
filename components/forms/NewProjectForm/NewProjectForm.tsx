import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import Button from '../../ui/Button';
import FormBubble from '../../ui/FormBubble';
import NewProjectActivities from './NewProjectActivities';

/**
 * F1 Form
 * Application for a new project. Submits just a form. No files or images.
 * 
 * 
 * TODO: Make this whole thing typesafe
 * TODO: Convert everything to Formik <Field> shorthand. It is very verbose right now
 */

interface NewProjectApplicationProps {
  onReturnToMenu: () => void;
  initialValues?: Project | null;
  onDraftSubmitted?: () => void;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, onConfirm, onCancel }) => {
  const { t } = useTranslation('projectApplication');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md">
        <h3 className="text-xl font-bold mb-4">{t('confirmDialog.title')}</h3>
        <p className="mb-6">{t('confirmDialog.message')}</p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            {t('confirmDialog.review')}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-primaryGreen text-white rounded hover:bg-primaryGreen-dark"
          >
            {t('confirmDialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

const NewProjectForm:React.FC<NewProjectApplicationProps> = ({ 
    onReturnToMenu,
    initialValues,
    onDraftSubmitted
}) => {
   const { t, i18n } = useTranslation('projectApplication');
   const [availableRegions, setAvailableRegions] = useState([]);
   const [localitiesDict, setLocalitiesDict] = useState({});
   const [relevantLocalities, setRelevantLocalities] = useState([]);
   const [optionsActivities, setOptionsActivities] = useState([]);
   const [optionsExpenses, setOptionsExpenses] = useState([]);
   const [isFormSubmitted, setIsFormSubmitted] = useState(false);
   const [isLoading, setLoading] = useState(false);
   const [showConfirmDialog, setShowConfirmDialog] = useState(false);
   const [pendingSubmission, setPendingSubmission] = useState(null);
   const [userErrId, setUserErrId] = useState('');
   const [isDraftSaved, setIsDraftSaved] = useState(true);
   const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(initialValues?.id);

   useEffect(() => {
     // Add this effect to fetch the user's ERR ID
     const validateSession = async () => {
       try {
         const response = await fetch('/api/validate-session');
         const data = await response.json();
         if (data.success && data.user?.err_id) {
           setUserErrId(data.user.err_id);
         }
       } catch (error) {
         console.error('Error validating session:', error);
       }
     };

     validateSession();

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
     date: Yup.string(),
     err: Yup.string(),
     state: Yup.string(),
     locality: Yup.string(),
     project_objectives: Yup.string(),
     intended_beneficiaries: Yup.string(),
     estimated_beneficiaries: Yup.number(),
     planned_activities: Yup.array(),
     estimated_timeframe: Yup.string(),
     additional_support: Yup.string(),
     banking_details: Yup.string()
   });

 const getAvailableStates = (localitiesData) => {
     return localitiesData
     .map( (item) => item.state_name );
 }

 const getLocalitiesDict = (localitiesData) => {
     let dict = {};
     localitiesData.forEach((item) => {
         const { state_name, localities } = item;

         if (!dict[state_name]) {
             dict[state_name] = [];
         }
         if (!dict[state_name].includes(localities)) {
             localities.forEach((locality) => {
                 // Only add non-null localities
                 if (locality !== null) {
                     dict[state_name].push(locality);
                 }
             });
         }
     });
     return dict;
 };

   const handleSubmit = async (values, { setSubmitting }) => {
     setPendingSubmission({ 
       values: {
         ...values,
         id: initialValues?.id,
         currentLanguage: i18n.language,
         is_draft: false
       }, 
       setSubmitting 
     });
     setShowConfirmDialog(true);
   };

   const handleConfirmedSubmit = async () => {
     if (!pendingSubmission) return;
     
     const { values, setSubmitting } = pendingSubmission;
     setShowConfirmDialog(false);
     setLoading(true);
     
     try {
       console.log("Starting submission with values:", values); // Log the values being sent
       
       const res = await fetch('/api/project-application', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(values),
       });
       
       // Log the response status
       console.log("Response status:", res.status);
       
       if (res.ok) {
         const responseData = await res.json();
         console.log("Submission successful:", responseData);
         setIsFormSubmitted(true);
         if (onDraftSubmitted) {
           onDraftSubmitted();
         }
       } else {
         const errorData = await res.json();
         console.error('Submission failed with status:', res.status);
         console.error('Error details:', errorData);
         alert(t('submissionFailed') + ': ' + (errorData.message || 'Unknown error'));
       }
     } catch (error) {
       console.error('Error during submission:', error);
       alert(t('submissionFailed') + ': ' + error.message);
     } finally {
       setLoading(false);
       setSubmitting(false);
       setPendingSubmission(null);
     }
   };

   const handleCancelSubmit = () => {
     if (pendingSubmission) {
       const { setSubmitting } = pendingSubmission;
       setSubmitting(false); // Reset the form's submitting state
     }
     setShowConfirmDialog(false);
     setPendingSubmission(null);
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
         <FormBubble removeBoxShadow>
           <Formik
             initialValues={{
               date: initialValues?.date || '',
               err: userErrId,
               state: initialValues?.state || '',
               locality: initialValues?.locality || '',
               project_objectives: initialValues?.project_objectives || '',
               intended_beneficiaries: initialValues?.intended_beneficiaries || '',
               estimated_beneficiaries: initialValues?.estimated_beneficiaries || '',
               planned_activities: initialValues?.planned_activities || [],
               estimated_timeframe: initialValues?.estimated_timeframe || '',
               additional_support: initialValues?.additional_support || '',
               banking_details: initialValues?.banking_details || '',
               programOfficerName: initialValues?.program_officer_name || '',
               programOfficerPhone: initialValues?.program_officer_phone || '',
               reportingOfficerName: initialValues?.reporting_officer_name || '',
               reportingOfficerPhone: initialValues?.reporting_officer_phone || '',
               financeOfficerName: initialValues?.finance_officer_name || '',
               financeOfficerPhone: initialValues?.finance_officer_phone || '',
             }}
             validationSchema={validationSchema}
             onSubmit={(values, { setSubmitting }) => {
               console.log("Form submission started");
               setPendingSubmission({ 
                 values: {
                   ...values,
                   id: initialValues?.id,
                   currentLanguage: i18n.language,
                   is_draft: false
                 }, 
                 setSubmitting 
               });
               setShowConfirmDialog(true);
             }}
             enableReinitialize={true}
           >
             {({ isSubmitting, values, setFieldValue, errors, touched }) => {
               React.useEffect(() => {
                 setIsDraftSaved(false);
               }, [values]);

               return (
                 <Form className="space-y-3 bg-white p-3 rounded-lg">
                   <p className="text-3xl">{t('newProjectApplication')}</p>

                   {/* Date */}
                   <div className="mb-2">
                     <label className="font-bold block text-base text-black-bold mb-1">{t('date')}</label>
                     <Field name="date" type="date" className="text-sm w-full p-2 border rounded-lg" disabled={isLoading} />
                     {touched.date && errors.date && (
                       <div className="text-red-500 text-sm mt-1">{errors.date}</div>
                     )}
                   </div>

                   {/* ERR ID */}
                   <div className="mb-2">
                     <label className="font-bold block text-base text-black-bold mb-1">{t('errId')}</label>
                     <Field
                       name="err"
                       type="text"
                       className="text-sm w-full p-2 border rounded-lg bg-gray-100"
                       disabled={true}
                     />
                   </div>

                    {/* Objectives */}
                    <div className="mb-2">
                     <label className="font-bold block text-base text-black-bold mb-1">{t('projectObjectives')}</label>
                     <Field 
                       name="project_objectives"
                       type="text" 
                       className="text-sm w-full p-2 border rounded-lg" 
                       disabled={isLoading} 
                     />
                     {touched.project_objectives && errors.project_objectives && (
                       <div className="text-red-500 text-sm mt-1">{errors.project_objectives}</div>
                     )}
                   </div>

                   {/* Intended beneficiaries */}
                    <div className="mb-2">
                     <label className="font-bold block text-base text-black-bold mb-1">{t('intendedBeneficiaries')}</label>
                     <Field 
                       name="intended_beneficiaries"
                       type="text" 
                       className="text-sm w-full p-2 border rounded-lg" 
                       disabled={isLoading} 
                     />
                   </div>

                   {/* Estimated beneficiaries*/}
                    <div className="mb-2">
                     <label className="font-bold block text-base text-black-bold mb-1">{t('estimatedBeneficiaries')}</label>
                     <Field 
                       name="estimated_beneficiaries"
                       type="number" 
                       min="0"
                       className="text-sm w-full p-2 border rounded-lg" 
                       disabled={isLoading} 
                     />
                   </div>

                   {/* State or region */}
                   <div className="mb-2">
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

                   <div className="mb-2">
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

                   <NewProjectActivities optionsActivities={optionsActivities} optionsExpenses={optionsExpenses} />

                   {/* Estimated timeframe */}

                   <div className="mb-2">
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

                   <div className="mb-2">
                     <label className="font-bold block text-base text-black-bold mb-1">{t('additionalSupport')}</label>
                     <Field
                       as="textarea"
                       name="additional_support"
                       className="text-sm w-full p-2 border rounded-lg"
                       placeholder={t('enterAdditionalSupport')}
                       disabled={isLoading}
                     />
                   </div>

                   {/* Banking details */}
                   <div className="mb-2">
                     <label className="font-bold block text-base text-black-bold mb-1">{t('bankDetails')}</label>
                     <Field
                       name="banking_details"
                       type="text"
                       className="text-sm w-full p-2 border rounded-lg"
                       placeholder={t('enterBankDetails')}
                       disabled={isLoading}
                     />
                   </div>

                   {/* Add label and update the new fields section */}
                   <div className="mb-2">
                     <label className="font-bold block text-base text-black-bold mb-1">{t('errMembers')}</label>
                     <div className="space-y-4">
                       {/* Program Officer */}
                       <div className="grid grid-cols-2 gap-4">
                         <Field
                           name="programOfficerName"
                           type="text"
                           placeholder={t('programOfficer.name')}
                           className="text-sm w-full p-2 border rounded-lg"
                         />
                         <Field
                           name="programOfficerPhone"
                           type="tel"
                           placeholder={t('programOfficer.phone')}
                           className="text-sm w-full p-2 border rounded-lg"
                         />
                       </div>

                       {/* Reporting Officer */}
                       <div className="grid grid-cols-2 gap-4">
                         <Field
                           name="reportingOfficerName"
                           type="text"
                           placeholder={t('reportingOfficer.name')}
                           className="text-sm w-full p-2 border rounded-lg"
                         />
                         <Field
                           name="reportingOfficerPhone"
                           type="tel"
                           placeholder={t('reportingOfficer.phone')}
                           className="text-sm w-full p-2 border rounded-lg"
                         />
                       </div>

                       {/* Finance Officer */}
                       <div className="grid grid-cols-2 gap-4">
                         <Field
                           name="financeOfficerName"
                           type="text"
                           placeholder={t('financeOfficer.name')}
                           className="text-sm w-full p-2 border rounded-lg"
                         />
                         <Field
                           name="financeOfficerPhone"
                           type="tel"
                           placeholder={t('financeOfficer.phone')}
                           className="text-sm w-full p-2 border rounded-lg"
                         />
                       </div>
                     </div>
                   </div>

                   <div className="container py-4 px-4 mx-0 min-w-full flex flex-col items-center">
                     {/* Add error summary above the submit button */}
                     {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
                       <div className="text-red-500 text-sm mb-4">
                         {t('validation.pleaseFixErrors')}
                       </div>
                     )}
                     <div className="flex space-x-4">
                       <Button
                         type="button"
                         text={isDraftSaved ? t('drafts.saved') : t('actions.saveDraft')}
                         onClick={async () => {
                           const { 
                               err,
                               programOfficerName,
                               programOfficerPhone,
                               reportingOfficerName,
                               reportingOfficerPhone,
                               financeOfficerName,
                               financeOfficerPhone,
                               ...otherValues 
                           } = values;

                           const draftData = {
                               ...otherValues,
                               id: currentDraftId,
                               err_id: err,
                               program_officer_name: programOfficerName,
                               program_officer_phone: programOfficerPhone,
                               reporting_officer_name: reportingOfficerName,
                               reporting_officer_phone: reportingOfficerPhone,
                               finance_officer_name: financeOfficerName,
                               finance_officer_phone: financeOfficerPhone,
                               is_draft: true
                           };

                           console.log('Saving draft with data:', draftData);

                           try {
                               const response = await fetch('/api/project-drafts', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify(draftData),
                                   credentials: 'include'
                               });
                               if (!response.ok) throw new Error('Failed to save draft');
                               const data = await response.json();
                               if (data.success && data.draft) {
                                   setCurrentDraftId(data.draft.id);
                                   setIsDraftSaved(true);
                                   alert(t('drafts.saved'));
                               } else {
                                   throw new Error('Invalid response format');
                               }
                           } catch (error) {
                               console.error('Error saving draft:', error);
                               alert(t('drafts.saveError'));
                           }
                         }}
                         disabled={isSubmitting || isLoading || isDraftSaved}
                         className={isDraftSaved ? 'opacity-50 cursor-not-allowed' : ''}
                       />
                       <Button
                         type="submit"
                         text={t('actions.submit')}
                         disabled={isSubmitting || isLoading}
                       />
                     </div>
                   </div>
                 </Form>
               );
             }}
           </Formik>
         </FormBubble>
       )}
       
       <ConfirmDialog
         isOpen={showConfirmDialog}
         onConfirm={handleConfirmedSubmit}
         onCancel={handleCancelSubmit}
       />
     </>
   );
 };

 export default NewProjectForm;