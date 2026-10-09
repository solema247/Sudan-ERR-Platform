import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Formik, Form, Field, FieldArray } from 'formik';
import * as Yup from 'yup';
import Button from '../../ui/Button';
import NewProjectActivities from './NewProjectActivities';
import { newSupabase } from '../../../services/newSupabaseClient';
import { useRouter } from 'next/router';

const FIELD = 'app-input !py-2 text-sm';

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
    currency?: string;
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

interface EmergencyRoom {
    name: string;
    name_ar: string | null;
    states?: { state_name: string | null; state_name_ar: string | null; locality: string | null; locality_ar: string | null } | null;
}

const CURRENCIES = ['USD', 'SDG'] as const;

interface UserDataResponse {
    err_id: string;
    emergency_rooms: EmergencyRoom;
}

export type F1RoomScope = {
  emergency_room_id: string;
  grant_segment: string;
  state_name?: string;
  locality?: string;
  room_label?: string;
};

interface NewProjectApplicationProps {
    onReturnToMenu: () => void;
    initialValues?: Project | null;
    projectToEdit?: string;
    onDraftSubmitted?: () => void;
    /** Selected room + grant segment from Create flow (OCR or manual scope) */
    roomScope?: F1RoomScope | null;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, onConfirm, onCancel }) => {
  const { t } = useTranslation('project-application');
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#0f1828]/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="app-panel p-6 max-w-md w-full">
        <h3 className="text-xl font-bold mb-4 text-white">{t('confirmDialog.title')}</h3>
        <p className="mb-6 text-[#a8b6cc]">{t('confirmDialog.message')}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold text-[#a8b6cc] hover:text-white"
          >
            {t('confirmDialog.review')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-brand-orange text-[#152238] hover:bg-[#ffb88a]"
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
    onDraftSubmitted,
    roomScope = null,
}) => {
   const { t, i18n } = useTranslation('project-application');
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
   const [userErrName, setUserErrName] = useState('');
   // The room's own state and locality, used to fill in the form (still editable)
   const [roomState, setRoomState] = useState('');
   const [roomLocality, setRoomLocality] = useState('');
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

         // Prefer room chosen in Create flow (admin/OCR/manual scope)
         if (roomScope?.emergency_room_id) {
           setUserErrId(roomScope.emergency_room_id);
           setUserErrName(roomScope.room_label || roomScope.emergency_room_id);
           if (roomScope.state_name) setRoomState(roomScope.state_name);
           if (roomScope.locality) setRoomLocality(roomScope.locality);
           return;
         }

         // Own room (base_err) — left join so admin without room still loads
         const { data, error: userError } = await newSupabase
           .from('users')
           .select(`
             err_id,
             emergency_rooms (
               name,
               name_ar,
               states ( state_name, state_name_ar, locality, locality_ar )
             )
           `)
           .eq('auth_user_id', session.user.id)
           .single();

         if (userError || !data) {
           console.error('Error fetching user data:', userError);
           return;
         }

         setUserErrId(data.err_id || '');
         const er = data.emergency_rooms as any;
         const room = Array.isArray(er) ? er[0] : er;
         if (room) {
           const errName = i18n.language === 'ar' && room.name_ar
             ? room.name_ar
             : room.name;
           setUserErrName(errName || '');
           const roomPlace = Array.isArray(room.states) ? room.states[0] : room.states;
           if (roomPlace) {
             const isAr = i18n.language === 'ar';
             setRoomState((isAr ? roomPlace.state_name_ar : roomPlace.state_name) || roomPlace.state_name || '');
             setRoomLocality((isAr ? roomPlace.locality_ar : roomPlace.locality) || roomPlace.locality || '');
           }
         }
       } catch (error) {
         console.error('Session validation error:', error);
       }
     };

     validateSession();

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
   }, [i18n.language, t, router, editingProject?.state, initialValues?.state, roomScope?.emergency_room_id, roomScope?.grant_segment]);

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
           currency: project.currency || 'USD',
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

   const RequiredLabel = ({ children, required = false }) => (
     <label className="font-semibold block text-xs text-[#a8b6cc] mb-1">
       {children}
       {required && <span className="text-brand-orange ml-0.5">*</span>}
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
        funding_cycle_id: _fundingCycleId,
        cycle_state_allocation_id: _cycleAllocationId,
        planned_activities,
        programOfficerName,
        programOfficerPhone,
        reportingOfficerName,
        reportingOfficerPhone,
        financeOfficerName,
        financeOfficerPhone,
        ...otherValues 
      } = values;

      // Extract expenses from planned_activities but keep planned_activities as-is
      let extractedExpenses = [];
      
      if (planned_activities && Array.isArray(planned_activities)) {
        planned_activities.forEach(activity => {
          if (activity.expenses && Array.isArray(activity.expenses)) {
            const transformedExpenses = activity.expenses.map(expense => {
              const { total, expense: expenseId, frequency, unitPrice, description, ...otherFields } = expense;
              return {
                ...otherFields,
                total_cost: total,
                expense: expenseId,
                frequency,
                unitPrice,
                description
              };
            });
            extractedExpenses.push(...transformedExpenses);
          }
        });
      }

      const roomId =
        (otherValues as any).emergency_room_id ||
        roomScope?.emergency_room_id ||
        err ||
        userErrId;
      const grantSegment =
        (otherValues as any).grant_segment ||
        roomScope?.grant_segment ||
        (initialValues as any)?.grant_segment ||
        null;

      // Room-linked; funding cycle/grant call still assigned later in portal
      const projectData = {
        ...otherValues,
        err_id: roomId,
        emergency_room_id: roomId,
        grant_segment: grantSegment,
        funding_cycle_id: null,
        cycle_state_allocation_id: null,
        grant_call_id: null,
        grant_call_state_allocation_id: null,
        donor_id: null,
        planned_activities: planned_activities,
        expenses: extractedExpenses.length > 0 ? extractedExpenses : null,
        funding_status: 'unassigned',
        source: 'err_app',
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
        created_by: userErrId || roomId,
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
     const state = editingProject?.state || initialValues?.state || roomState;
     if (state && localitiesDict[state]) {
       setRelevantLocalities(localitiesDict[state]);
     }
   }, [editingProject?.state, initialValues?.state, roomState, localitiesDict]);

   return (
     <>
       {isFormSubmitted ? (
         <div className="space-y-4">
           <p className="text-white text-base">{t('formSubmitted')}</p>
           <button type="button" onClick={onReturnToMenu} className="app-action-primary">
             {t('returnToMenu')}
           </button>
         </div>
       ) : (
         <div>
           {editingProject?.feedback && (
             <div className="mb-6 p-4 rounded-2xl bg-[#1c2d48] border border-brand-orange/30">
               <h3 className="text-lg font-semibold mb-2 text-white">{t('feedback.title')}</h3>
               <p className="mb-2 text-[#e8eef8]">{editingProject.feedback.feedback_text}</p>
               <p className="text-sm text-[#8a97ab]">
                 {t('feedback.providedBy')}: {editingProject.feedback.created_by.full_name}
               </p>
             </div>
           )}
           <Formik
             initialValues={{
               date: editingProject?.date || initialValues?.date || '',
               err: roomScope?.emergency_room_id || (initialValues as any)?.emergency_room_id || userErrId,
               emergency_room_id: roomScope?.emergency_room_id || (initialValues as any)?.emergency_room_id || userErrId,
               grant_segment: roomScope?.grant_segment || (initialValues as any)?.grant_segment || '',
               state: editingProject?.state || initialValues?.state || roomScope?.state_name || roomState || '',
               locality: editingProject?.locality || initialValues?.locality || roomScope?.locality || (editingProject?.state || initialValues?.state ? '' : roomLocality) || '',
               currency: editingProject?.currency || (initialValues as any)?.currency || 'USD',
               project_objectives: editingProject?.project_objectives || initialValues?.project_objectives || '',
               intended_beneficiaries: editingProject?.intended_beneficiaries || initialValues?.intended_beneficiaries || '',
               estimated_beneficiaries: editingProject?.estimated_beneficiaries || initialValues?.estimated_beneficiaries || '',
               planned_activities: editingProject?.planned_activities || initialValues?.planned_activities || [],
               estimated_timeframe: editingProject?.estimated_timeframe || initialValues?.estimated_timeframe || '',
               additional_support: editingProject?.additional_support || initialValues?.additional_support || '',
               banking_details: editingProject?.banking_details || initialValues?.banking_details || '',
               programOfficerName: editingProject?.program_officer_name || (initialValues as any)?.programOfficerName || initialValues?.program_officer_name || '',
               programOfficerPhone: editingProject?.program_officer_phone || (initialValues as any)?.programOfficerPhone || initialValues?.program_officer_phone || '',
               reportingOfficerName: editingProject?.reporting_officer_name || (initialValues as any)?.reportingOfficerName || initialValues?.reporting_officer_name || '',
               reportingOfficerPhone: editingProject?.reporting_officer_phone || (initialValues as any)?.reportingOfficerPhone || initialValues?.reporting_officer_phone || '',
               financeOfficerName: editingProject?.finance_officer_name || (initialValues as any)?.financeOfficerName || initialValues?.finance_officer_name || '',
               financeOfficerPhone: editingProject?.finance_officer_phone || (initialValues as any)?.financeOfficerPhone || initialValues?.finance_officer_phone || '',
             }}
             validationSchema={validationSchema}
             onSubmit={handleSubmit}
             enableReinitialize={true}
           >
             {({ isSubmitting, values, setFieldValue, errors, touched, dirty }) => {
               return (
                 <Form className="space-y-2.5">
                   <div className="mb-2">
                     <p className="app-section-label mb-0.5">F1</p>
                     <h2 className="text-lg font-bold text-white">{t('newProjectApplication')}</h2>
                   </div>

                   <div className="grid grid-cols-2 gap-2.5">
                     <div className="min-w-0">
                       <RequiredLabel required>{t('date')}</RequiredLabel>
                       <Field name="date" type="date" className={FIELD} disabled={isLoading} />
                       {touched.date && errors.date && (
                         <div className="text-red-300 text-xs mt-0.5">{String(errors.date)}</div>
                       )}
                     </div>
                     <div className="min-w-0">
                       <RequiredLabel>{t('errId')}</RequiredLabel>
                       <div className={`${FIELD} bg-[#1c2d48] text-[#a8b6cc] truncate`}>
                         {userErrName || roomScope?.room_label || values.err || '—'}
                       </div>
                       <Field name="err" type="hidden" />
                       <Field name="emergency_room_id" type="hidden" />
                       <Field name="grant_segment" type="hidden" />
                       {(values as any).grant_segment && (
                         <p className="text-[11px] text-[#8a97ab] mt-0.5 mb-0 truncate">
                           {(values as any).grant_segment}
                         </p>
                       )}
                     </div>
                   </div>

                   <div>
                     <RequiredLabel required>{t('projectObjectives')}</RequiredLabel>
                     <Field
                       name="project_objectives"
                       as="textarea"
                       rows={2}
                       className={FIELD}
                       disabled={isLoading}
                     />
                     {touched.project_objectives && errors.project_objectives && (
                       <div className="text-red-300 text-xs mt-0.5">{String(errors.project_objectives)}</div>
                     )}
                   </div>

                   <div className="grid grid-cols-2 gap-2.5">
                     <div className="min-w-0">
                       <RequiredLabel required>{t('intendedBeneficiaries')}</RequiredLabel>
                       <Field
                         name="intended_beneficiaries"
                         type="text"
                         className={FIELD}
                         disabled={isLoading}
                       />
                       {touched.intended_beneficiaries && errors.intended_beneficiaries && (
                         <div className="text-red-300 text-xs mt-0.5">{String(errors.intended_beneficiaries)}</div>
                       )}
                     </div>
                     <div className="min-w-0">
                       <RequiredLabel>{t('estimatedBeneficiaries')}</RequiredLabel>
                       <Field
                         name="estimated_beneficiaries"
                         type="number"
                         min="0"
                         className={FIELD}
                         disabled={isLoading}
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-2.5">
                     <div className="min-w-0">
                       <RequiredLabel required>{t('state')}</RequiredLabel>
                       <Field
                         name="state"
                         as="select"
                         className={FIELD}
                         disabled={isLoading}
                         onChange={(e) => {
                           const selectedState = e.target.value;
                           setFieldValue('state', selectedState);
                           setFieldValue('locality', '');
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
                         <div className="text-red-300 text-xs mt-0.5">{String(errors.state)}</div>
                       )}
                     </div>
                     <div className="min-w-0">
                       <RequiredLabel required>{t('locality')}</RequiredLabel>
                       <Field
                         name="locality"
                         as="select"
                         className={FIELD}
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
                         <div className="text-red-300 text-xs mt-0.5">{String(errors.locality)}</div>
                       )}
                     </div>
                   </div>

                   <div className="flex items-center justify-between gap-3 pt-0.5">
                     <RequiredLabel required>{t('currency.label')}</RequiredLabel>
                     <div className="inline-flex rounded-lg border border-white/15 overflow-hidden" role="radiogroup" aria-label={t('currency.label')}>
                       {CURRENCIES.map((code) => (
                         <button
                           key={code}
                           type="button"
                           role="radio"
                           aria-checked={values.currency === code}
                           onClick={() => setFieldValue('currency', code)}
                           className={`px-3 py-1.5 text-xs font-semibold ${values.currency === code ? 'bg-brand-orange text-[#152238]' : 'bg-[#152238] text-[#a8b6cc]'}`}
                         >
                           {code}
                         </button>
                       ))}
                     </div>
                   </div>

                   <NewProjectActivities optionsActivities={optionsActivities} optionsExpenses={optionsExpenses} />

                   {(() => {
                     const totalExpenses = (values.planned_activities || []).reduce((sum: number, activity: any) =>
                       sum + (activity?.expenses || []).reduce((s: number, e: any) => s + (Number(e?.total) || 0), 0), 0);
                     return (
                       <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-brand-orange/20 border border-brand-orange/40">
                         <span className="font-semibold text-sm text-white">{t('totalExpenses')}</span>
                         <span className="font-bold text-brand-orange" dir="ltr">
                           {new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(totalExpenses)} {values.currency}
                         </span>
                       </div>
                     );
                   })()}
                   {touched.planned_activities && errors.planned_activities && (
                     <div className="text-red-300 text-xs mt-0.5">
                       {typeof errors.planned_activities === 'string' 
                         ? errors.planned_activities 
                         : t('validation.required')}
                     </div>
                   )}

                   <div className="grid grid-cols-2 gap-2.5">
                     <div className="min-w-0">
                       <RequiredLabel required>{t('estimatedTimeframe')}</RequiredLabel>
                       <Field
                         as="textarea"
                         rows={2}
                         name="estimated_timeframe"
                         className={FIELD}
                         placeholder={t('enterEstimatedTimeframe')}
                         disabled={isLoading}
                       />
                       {touched.estimated_timeframe && errors.estimated_timeframe && (
                         <div className="text-red-300 text-xs mt-0.5">{String(errors.estimated_timeframe)}</div>
                       )}
                     </div>
                     <div className="min-w-0">
                       <RequiredLabel>{t('additionalSupport')}</RequiredLabel>
                       <Field
                         as="textarea"
                         rows={2}
                         name="additional_support"
                         className={FIELD}
                         placeholder={t('enterAdditionalSupport')}
                         disabled={isLoading}
                       />
                     </div>
                   </div>

                   <div>
                     <RequiredLabel required>{t('bankDetails')}</RequiredLabel>
                     <Field
                       name="banking_details"
                       type="text"
                       className={FIELD}
                       placeholder={t('enterBankDetails')}
                       disabled={isLoading}
                     />
                     {touched.banking_details && errors.banking_details && (
                       <div className="text-red-300 text-xs mt-0.5">{String(errors.banking_details)}</div>
                     )}
                   </div>

                   <div>
                     <RequiredLabel required>{t('errMembers')}</RequiredLabel>
                     <div className="space-y-2">
                       <div className="grid grid-cols-2 gap-2">
                         <Field
                           name="programOfficerName"
                           type="text"
                           placeholder={t('programOfficer.name') + ' *'}
                           className={FIELD}
                         />
                         <Field
                           name="programOfficerPhone"
                           type="tel"
                           placeholder={t('programOfficer.phone') + ' *'}
                           className={FIELD}
                         />
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                         <Field
                           name="reportingOfficerName"
                           type="text"
                           placeholder={t('reportingOfficer.name')}
                           className={FIELD}
                         />
                         <Field
                           name="reportingOfficerPhone"
                           type="tel"
                           placeholder={t('reportingOfficer.phone')}
                           className={FIELD}
                         />
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                         <Field
                           name="financeOfficerName"
                           type="text"
                           placeholder={t('financeOfficer.name')}
                           className={FIELD}
                         />
                         <Field
                           name="financeOfficerPhone"
                           type="tel"
                           placeholder={t('financeOfficer.phone')}
                           className={FIELD}
                         />
                       </div>
                     </div>
                   </div>

                   <div className="pt-2 flex flex-col gap-2">
                     {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
                       <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 w-full">
                         <h3 className="text-sm font-medium text-red-300">
                           {t('validation.pleaseFixErrors')}
                         </h3>
                         <ul className="mt-2 text-sm text-red-200/90 list-disc list-inside space-y-1">
                           {errors.date && touched.date && <li>{t('date')}</li>}
                           {errors.project_objectives && touched.project_objectives && <li>{t('projectObjectives')}</li>}
                           {errors.intended_beneficiaries && touched.intended_beneficiaries && <li>{t('intendedBeneficiaries')}</li>}
                           {errors.state && touched.state && <li>{t('state')}</li>}
                           {errors.locality && touched.locality && <li>{t('locality')}</li>}
                           {errors.planned_activities && touched.planned_activities && <li>{t('activities.header')}</li>}
                           {errors.estimated_timeframe && touched.estimated_timeframe && <li>{t('estimatedTimeframe')}</li>}
                           {errors.banking_details && touched.banking_details && <li>{t('bankDetails')}</li>}
                           {errors.programOfficerName && touched.programOfficerName && <li>{t('programOfficer.name')}</li>}
                           {errors.programOfficerPhone && touched.programOfficerPhone && <li>{t('programOfficer.phone')}</li>}
                         </ul>
                       </div>
                     )}
                     <div className="flex flex-col sm:flex-row gap-3 w-full">
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
                                   funding_cycle_id: _fc,
                                   cycle_state_allocation_id: _ca,
                                   ...otherValues 
                               } = values as any;

                               const roomId =
                                 (otherValues as any).emergency_room_id ||
                                 roomScope?.emergency_room_id ||
                                 err ||
                                 userErrId;
                               const draftData = {
                                   ...Object.entries(otherValues).reduce((acc, [key, value]) => {
                                       if (value !== undefined && value !== null && value !== '') {
                                           acc[key] = value;
                                       }
                                       return acc;
                                   }, {} as Record<string, unknown>),
                                   id: projectToEdit || currentDraftId,
                                   err_id: roomId,
                                   emergency_room_id: roomId,
                                   grant_segment:
                                     (otherValues as any).grant_segment ||
                                     roomScope?.grant_segment ||
                                     null,
                                   funding_cycle_id: null,
                                   cycle_state_allocation_id: null,
                                   grant_call_id: null,
                                   grant_call_state_allocation_id: null,
                                   donor_id: null,
                                   funding_status: 'unassigned',
                                   program_officer_name: programOfficerName || null,
                                   program_officer_phone: programOfficerPhone || null,
                                   reporting_officer_name: reportingOfficerName || null,
                                   reporting_officer_phone: reportingOfficerPhone || null,
                                   finance_officer_name: financeOfficerName || null,
                                   finance_officer_phone: financeOfficerPhone || null,
                                   is_draft: true,
                                   status: 'draft',
                                   created_by: userErrId || roomId
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
                         className={`!m-0 flex-1 !rounded-xl !bg-[#1c2d48] !text-white border border-white/10 ${!dirty ? 'opacity-50 cursor-not-allowed' : ''}`}
                       />
                       <Button
                         type="submit"
                         text={t('actions.submit')}
                         disabled={isSubmitting || isLoading}
                         className="!m-0 flex-1 !rounded-xl !bg-brand-orange !text-[#152238] font-bold hover:!bg-[#ffb88a]"
                       />
                     </div>
                     <button
                       type="button"
                       onClick={onReturnToMenu}
                       className="text-sm font-medium text-[#8a97ab] hover:text-brand-orange py-2 transition-colors"
                     >
                       {t('returnToMenu')}
                     </button>
                   </div>
                 </Form>
               );
             }}
           </Formik>
         </div>
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