import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import Button from '../../ui/Button';
import FormBubble from '../../ui/FormBubble';
import NewProjectActivities from './NewProjectActivities';
import { newSupabase } from '../../../services/newSupabaseClient';
import { useRouter } from 'next/router';

/**
 * F1 Form
 * Application for a new project. Submits just a form. No files or images.
 * 
 * 
 * TODO: Make this whole thing typesafe
 * TODO: Convert everything to Formik <Field> shorthand. It is very verbose right now
 */

interface Project {
    id?: string;
    date?: string;
    err?: string;
    state?: string;
    locality?: string;
    project_objectives?: string;
    intended_beneficiaries?: string;
    estimated_beneficiaries?: number;
    planned_activities?: Array<any>;
    estimated_timeframe?: string;
    additional_support?: string;
    banking_details?: string;
    program_officer_name?: string;
    program_officer_phone?: string;
    reporting_officer_name?: string;
    reporting_officer_phone?: string;
    finance_officer_name?: string;
    finance_officer_phone?: string;
    feedback?: {
        feedback_text: string;
        created_by: {
            full_name: string;
        };
    };
}

interface NewProjectApplicationProps {
    onReturnToMenu: () => void;
    initialValues?: Project | null;
    projectToEdit?: string;
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
    projectToEdit,
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
   const [currentDraftId, setCurrentDraftId] = useState<string | undefined>(initialValues?.id);
   const [editingProject, setEditingProject] = useState<Project | null>(null);
   const router = useRouter();

   useEffect(() => {
     const validateSession = async () => {
       try {
         const { data: { session } } = await newSupabase.auth.getSession();
         
         if (!session) {
           router.push('/login');
           return;
         }

         // Get user data directly from the users table
         const { data: userData, error: userError } = await newSupabase
           .from('users')
           .select('err_id')
           .eq('id', session.user.id)
           .single();

         if (userError || !userData) {
           console.error('Error fetching user data:', userError);
           return;
         }

         setUserErrId(userData.err_id);
       } catch (error) {
         console.error('Session validation error:', error);
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
         const { data: { session } } = await newSupabase.auth.getSession();
         
         if (!session) {
           throw new Error('No active session');
         }

         const res = await fetch(`/api/project-application?language=${i18n.language}`, {
           credentials: 'include',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${session.access_token}`
           }
         });

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

           // If we have a state from editingProject or initialValues, set the relevant localities
           const projectState = editingProject?.state || initialValues?.state;
           if (projectState && localitiesDict[projectState]) {
             setRelevantLocalities(localitiesDict[projectState]);
           }
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
   }, [i18n.language, t, router, editingProject?.state, initialValues?.state]);

   useEffect(() => {
     const fetchProjectDetails = async () => {
       if (!projectToEdit) return;

       try {
         const { data: { session } } = await newSupabase.auth.getSession();
         
         if (!session) {
           throw new Error('No active session');
         }

         // Fetch project details
         const { data: project, error: projectError } = await newSupabase
           .from('err_projects')
           .select('*')
           .eq('id', projectToEdit)
           .single();

         if (projectError) throw projectError;

         // Fetch latest feedback
         const res = await fetch(`/api/project-feedback?project_id=${projectToEdit}`, {
           credentials: 'include',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${session.access_token}`
           }
         });

         if (!res.ok) throw new Error('Failed to fetch feedback');

         const { feedback } = await res.json();
         
         // Format the project data to match the form structure
         const formattedProject = {
           ...project,
           date: project.date || '',
           err: project.err_id || '',
           state: project.state || '',
           locality: project.locality || '',
           project_objectives: project.project_objectives || '',
           intended_beneficiaries: project.intended_beneficiaries || '',
           estimated_beneficiaries: project.estimated_beneficiaries || '',
           planned_activities: project.planned_activities || [],
           estimated_timeframe: project.estimated_timeframe || '',
           additional_support: project.additional_support || '',
           banking_details: project.banking_details || '',
           programOfficerName: project.program_officer_name || '',
           programOfficerPhone: project.program_officer_phone || '',
           reportingOfficerName: project.reporting_officer_name || '',
           reportingOfficerPhone: project.reporting_officer_phone || '',
           financeOfficerName: project.finance_officer_name || '',
           financeOfficerPhone: project.finance_officer_phone || '',
           feedback: feedback[0]
         };

         setEditingProject(formattedProject);

       } catch (error) {
         console.error('Error fetching project details:', error);
         alert(t('errors.fetchProjectError'));
       }
     };

     fetchProjectDetails();
   }, [projectToEdit, t]);

   const validationSchema = Yup.object({
     date: Yup.string().required(t('validation.required')),
     err: Yup.string().nullable(),
     state: Yup.string().required(t('validation.required')),
     locality: Yup.string().required(t('validation.required')),
     project_objectives: Yup.string().required(t('validation.required')),
     intended_beneficiaries: Yup.string().required(t('validation.required')),
     estimated_beneficiaries: Yup.number().nullable(),
     planned_activities: Yup.array()
       .min(1, t('validation.atLeastOneActivity'))
       .of(
         Yup.object().shape({
           selectedActivity: Yup.string().required(t('validation.required')),
           quantity: Yup.number().required(t('validation.required')).min(1, t('validation.minValue')),
           duration: Yup.number().required(t('validation.required')).min(1, t('validation.minValue')),
           location: Yup.string().required(t('validation.required'))
         })
       ),
     estimated_timeframe: Yup.string().required(t('validation.required')),
     additional_support: Yup.string().nullable(),
     banking_details: Yup.string().required(t('validation.required')),
     programOfficerName: Yup.string().required(t('validation.required')),
     programOfficerPhone: Yup.string().required(t('validation.required'))
   });

   // Helper component for required field labels
   const RequiredLabel = ({ children, required = false }) => (
     <label className="font-bold block text-base text-black-bold mb-1">
       {children}
       {required && <span className="text-red-500 ml-1">*</span>}
     </label>
   );

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
         id: projectToEdit || initialValues?.id,
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
       const { data: { session } } = await newSupabase.auth.getSession();
       
       if (!session) {
         throw new Error('No active session');
       }

       const { 
         dirty, 
         currentLanguage, 
         err,
         programOfficerName,
         programOfficerPhone,
         reportingOfficerName,
         reportingOfficerPhone,
         financeOfficerName,
         financeOfficerPhone,
         ...otherValues 
       } = values;
       
       // Format data to match database schema
       const projectData = {
         ...otherValues,
         err_id: err,
         program_officer_name: programOfficerName,
         program_officer_phone: programOfficerPhone,
         reporting_officer_name: reportingOfficerName,
         reporting_officer_phone: reportingOfficerPhone,
         finance_officer_name: financeOfficerName,
         finance_officer_phone: financeOfficerPhone,
         is_draft: false,
         status: 'pending',
         submitted_at: new Date().toISOString(),
         last_modified: new Date().toISOString(),
         created_by: userErrId,
         language: currentLanguage || 'en'
       };

       // If we have a draft ID or editing an existing project, use PUT
       const method = currentDraftId || projectToEdit ? 'PUT' : 'POST';
       const id = currentDraftId || projectToEdit;
       
       const res = await fetch('/api/project-application', {
         method,
         headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${session.access_token}`
         },
         body: JSON.stringify({
           ...projectData,
           id
         }),
         credentials: 'include'
       });
       
       if (res.ok) {
         setIsFormSubmitted(true);
         if (onDraftSubmitted) {
           onDraftSubmitted();
         }
       } else {
         const errorData = await res.json();
         alert(t('submissionFailed') + ': ' + (errorData.message || 'Unknown error'));
       }
     } catch (error) {
       console.error('Error submitting project:', error);
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

   // Add this effect outside of Formik
   useEffect(() => {
     if (editingProject?.state || initialValues?.state) {
       const state = editingProject?.state || initialValues?.state;
       if (state && localitiesDict[state]) {
         setRelevantLocalities(localitiesDict[state]);
       }
     }
   }, [editingProject?.state, initialValues?.state, localitiesDict]);

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
           {editingProject?.feedback && (
             <div className="mb-6 p-4 bg-blue-50 rounded-lg">
               <h3 className="text-lg font-semibold mb-2">{t('feedback.title')}</h3>
               <p className="mb-2">{editingProject.feedback.feedback_text}</p>
               <p className="text-sm text-gray-600">
                 {t('feedback.providedBy')}: {editingProject.feedback.created_by.full_name}
               </p>
             </div>
           )}
           <Formik
             initialValues={{
               date: editingProject?.date || initialValues?.date || '',
               err: userErrId,
               state: editingProject?.state || initialValues?.state || '',
               locality: editingProject?.locality || initialValues?.locality || '',
               project_objectives: editingProject?.project_objectives || initialValues?.project_objectives || '',
               intended_beneficiaries: editingProject?.intended_beneficiaries || initialValues?.intended_beneficiaries || '',
               estimated_beneficiaries: editingProject?.estimated_beneficiaries || initialValues?.estimated_beneficiaries || '',
               planned_activities: editingProject?.planned_activities || initialValues?.planned_activities || [],
               estimated_timeframe: editingProject?.estimated_timeframe || initialValues?.estimated_timeframe || '',
               additional_support: editingProject?.additional_support || initialValues?.additional_support || '',
               banking_details: editingProject?.banking_details || initialValues?.banking_details || '',
               programOfficerName: editingProject?.program_officer_name || initialValues?.program_officer_name || '',
               programOfficerPhone: editingProject?.program_officer_phone || initialValues?.program_officer_phone || '',
               reportingOfficerName: editingProject?.reporting_officer_name || initialValues?.reporting_officer_name || '',
               reportingOfficerPhone: editingProject?.reporting_officer_phone || initialValues?.reporting_officer_phone || '',
               financeOfficerName: editingProject?.finance_officer_name || initialValues?.finance_officer_name || '',
               financeOfficerPhone: editingProject?.finance_officer_phone || initialValues?.finance_officer_phone || '',
             }}
             validationSchema={validationSchema}
             onSubmit={handleSubmit}
             enableReinitialize={true}
           >
             {({ isSubmitting, values, setFieldValue, errors, touched, dirty }) => {
               // Remove the useEffect here and handle state changes in onChange
               return (
                 <Form className="space-y-3 bg-white p-3 rounded-lg">
                   <p className="text-3xl">{t('newProjectApplication')}</p>

                   {/* Date */}
                   <div className="mb-2">
                     <RequiredLabel required>{t('date')}</RequiredLabel>
                     <Field name="date" type="date" className="text-sm w-full p-2 border rounded-lg" disabled={isLoading} />
                     {touched.date && errors.date && (
                       <div className="text-red-500 text-sm mt-1">{String(errors.date)}</div>
                     )}
                   </div>

                   {/* ERR ID */}
                   <div className="mb-2">
                     <RequiredLabel>{t('errId')}</RequiredLabel>
                     <Field
                       name="err"
                       type="text"
                       className="text-sm w-full p-2 border rounded-lg bg-gray-100"
                       disabled={true}
                     />
                   </div>

                    {/* Objectives */}
                    <div className="mb-2">
                     <RequiredLabel required>{t('projectObjectives')}</RequiredLabel>
                     <Field 
                       name="project_objectives"
                       type="text" 
                       className="text-sm w-full p-2 border rounded-lg" 
                       disabled={isLoading} 
                     />
                     {touched.project_objectives && errors.project_objectives && (
                       <div className="text-red-500 text-sm mt-1">{String(errors.project_objectives)}</div>
                     )}
                   </div>

                   {/* Intended beneficiaries */}
                    <div className="mb-2">
                     <RequiredLabel required>{t('intendedBeneficiaries')}</RequiredLabel>
                     <Field 
                       name="intended_beneficiaries"
                       type="text" 
                       className="text-sm w-full p-2 border rounded-lg" 
                       disabled={isLoading} 
                     />
                     {touched.intended_beneficiaries && errors.intended_beneficiaries && (
                       <div className="text-red-500 text-sm mt-1">{String(errors.intended_beneficiaries)}</div>
                     )}
                   </div>

                   {/* Estimated beneficiaries*/}
                    <div className="mb-2">
                     <RequiredLabel>{t('estimatedBeneficiaries')}</RequiredLabel>
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
                     <RequiredLabel required>{t('state')}</RequiredLabel>
                     <Field
                       name="state"
                       as="select"
                       className="text-sm w-full p-2 border rounded-lg"
                       disabled={isLoading}
                       onChange={(e) => {
                         const selectedState = e.target.value;
                         setFieldValue('state', selectedState);
                         setFieldValue('locality', ''); // Reset locality when state changes
                         if (selectedState && localitiesDict[selectedState]) {
                           setRelevantLocalities(localitiesDict[selectedState]);
                         } else {
                           setRelevantLocalities([]);
                         }
                       }}
                     >
                       <option value="">{t('selectState')}</option>
                       {availableRegions.map((state_name) => (
                         <option key={state_name} value={state_name}>
                           {state_name}
                         </option>
                       ))}
                     </Field>
                     {touched.state && errors.state && (
                       <div className="text-red-500 text-sm mt-1">{String(errors.state)}</div>
                     )}
                   </div>

                   {/* Locality*/}

                   <div className="mb-2">
                     <RequiredLabel required>{t('locality')}</RequiredLabel>
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
                     {touched.locality && errors.locality && (
                       <div className="text-red-500 text-sm mt-1">{String(errors.locality)}</div>
                     )}
                   </div>

                   {/* Add/remove activities and their expenses */}

                   <NewProjectActivities optionsActivities={optionsActivities} optionsExpenses={optionsExpenses} />
                   {touched.planned_activities && errors.planned_activities && (
                     <div className="text-red-500 text-sm mt-1">
                       {typeof errors.planned_activities === 'string' 
                         ? errors.planned_activities 
                         : t('validation.required')}
                     </div>
                   )}

                   {/* Estimated timeframe */}

                   <div className="mb-2">
                     <RequiredLabel required>{t('estimatedTimeframe')}</RequiredLabel>
                     <Field
                       as="textarea"
                       name="estimated_timeframe"
                       className="text-sm w-full p-2 border rounded-lg"
                       placeholder={t('enterEstimatedTimeframe')}
                       disabled={isLoading}
                     />
                     {touched.estimated_timeframe && errors.estimated_timeframe && (
                       <div className="text-red-500 text-sm mt-1">{String(errors.estimated_timeframe)}</div>
                     )}
                   </div>

                   {/* Additional support */}

                   <div className="mb-2">
                     <RequiredLabel>{t('additionalSupport')}</RequiredLabel>
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
                     <RequiredLabel required>{t('bankDetails')}</RequiredLabel>
                     <Field
                       name="banking_details"
                       type="text"
                       className="text-sm w-full p-2 border rounded-lg"
                       placeholder={t('enterBankDetails')}
                       disabled={isLoading}
                     />
                     {touched.banking_details && errors.banking_details && (
                       <div className="text-red-500 text-sm mt-1">{String(errors.banking_details)}</div>
                     )}
                   </div>

                   {/* Add label and update the new fields section */}
                   <div className="mb-2">
                     <RequiredLabel required>{t('errMembers')}</RequiredLabel>
                     <div className="space-y-4">
                       {/* Program Officer */}
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <Field
                             name="programOfficerName"
                             type="text"
                             placeholder={t('programOfficer.name') + ' *'}
                             className="text-sm w-full p-2 border rounded-lg"
                           />
                           {touched.programOfficerName && errors.programOfficerName && (
                             <div className="text-red-500 text-sm mt-1">{String(errors.programOfficerName)}</div>
                           )}
                         </div>
                         <div>
                           <Field
                             name="programOfficerPhone"
                             type="tel"
                             placeholder={t('programOfficer.phone') + ' *'}
                             className="text-sm w-full p-2 border rounded-lg"
                           />
                           {touched.programOfficerPhone && errors.programOfficerPhone && (
                             <div className="text-red-500 text-sm mt-1">{String(errors.programOfficerPhone)}</div>
                           )}
                         </div>
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
                       <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 w-full">
                         <div className="flex">
                           <div className="ml-3">
                             <h3 className="text-sm font-medium text-red-800">
                               {t('validation.pleaseFixErrors')}
                             </h3>
                             <div className="mt-2 text-sm text-red-700">
                               <ul className="list-disc list-inside space-y-1">
                                 {errors.date && touched.date && (
                                   <li>{t('date')}</li>
                                 )}
                                 {errors.project_objectives && touched.project_objectives && (
                                   <li>{t('projectObjectives')}</li>
                                 )}
                                 {errors.intended_beneficiaries && touched.intended_beneficiaries && (
                                   <li>{t('intendedBeneficiaries')}</li>
                                 )}
                                 {errors.state && touched.state && (
                                   <li>{t('state')}</li>
                                 )}
                                 {errors.locality && touched.locality && (
                                   <li>{t('locality')}</li>
                                 )}
                                 {errors.planned_activities && touched.planned_activities && (
                                   <li>{t('activities.header')}</li>
                                 )}
                                 {errors.estimated_timeframe && touched.estimated_timeframe && (
                                   <li>{t('estimatedTimeframe')}</li>
                                 )}
                                 {errors.banking_details && touched.banking_details && (
                                   <li>{t('bankDetails')}</li>
                                 )}
                                 {errors.programOfficerName && touched.programOfficerName && (
                                   <li>{t('programOfficer.name')}</li>
                                 )}
                                 {errors.programOfficerPhone && touched.programOfficerPhone && (
                                   <li>{t('programOfficer.phone')}</li>
                                 )}
                               </ul>
                             </div>
                           </div>
                         </div>
                       </div>
                     )}
                     <div className="flex space-x-4">
                       <Button
                         type="button"
                         text={!dirty ? t('drafts.saved') : t('actions.saveDraft')}
                         onClick={async () => {
                           try {
                               const { data: { session } } = await newSupabase.auth.getSession();
                               
                               if (!session) {
                                   throw new Error('No active session');
                               }

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
                                   ...Object.entries(otherValues).reduce((acc, [key, value]) => {
                                       if (value !== undefined && value !== null && value !== '') {
                                           acc[key] = value;
                                       }
                                       return acc;
                                   }, {}),
                                   id: projectToEdit || currentDraftId,
                                   err_id: err,
                                   program_officer_name: programOfficerName || null,
                                   program_officer_phone: programOfficerPhone || null,
                                   reporting_officer_name: reportingOfficerName || null,
                                   reporting_officer_phone: reportingOfficerPhone || null,
                                   finance_officer_name: financeOfficerName || null,
                                   finance_officer_phone: financeOfficerPhone || null,
                                   is_draft: true,
                                   status: 'draft',
                                   created_by: userErrId
                               };

                               const response = await fetch('/api/project-drafts', {
                                   method: 'POST',
                                   headers: { 
                                       'Content-Type': 'application/json',
                                       'Authorization': `Bearer ${session.access_token}`
                                   },
                                   body: JSON.stringify(draftData),
                                   credentials: 'include'
                               });

                               if (!response.ok) throw new Error('Failed to save draft');
                               
                               const data = await response.json();
                               if (data.success && data.draft) {
                                   setCurrentDraftId(data.draft.id);
                                   setFieldValue('dirty', false);
                                   alert(t('drafts.saved'));
                                   if (onDraftSubmitted) {
                                       onDraftSubmitted();
                                   }
                               } else {
                                   throw new Error('Invalid response format');
                               }
                           } catch (error) {
                               console.error('Error saving draft:', error);
                               alert(t('drafts.saveError'));
                           }
                         }}
                         disabled={isSubmitting || isLoading || !dirty}
                         className={!dirty ? 'opacity-50 cursor-not-allowed' : ''}
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