// components/PrefilledForm.tsx

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next"; // Import i18n
import Button from "../ui/Button";
// import ReceiptUploader from '../uploads/ReceiptUploader';  // Comment this out
import { v4 as uuidv4 } from 'uuid';
import { cleanFormData } from '../../utils/numberFormatting';
import { newSupabase } from '../../services/newSupabaseClient';
import { Pencil, Trash2, Check } from "lucide-react";
import { UploadChooserSupporting, reportUploadType } from '../forms/ReportForm/upload/UploadChooserSupporting';
import { FileWithProgress } from '../forms/ReportForm/upload/UploadInterfaces';

interface ExpenseEntry {
  id?: string;  // Make it optional since some existing data might not have it
  activity: string;
  description: string;
  payment_date: string;
  seller: string;
  payment_method: string;
  receipt_no: string;
  amount: string | number;
  receipt_upload?: string;
}

interface PrefilledFormProps {
  data: {
    date: string;
    err_id: string;
    expenses: ExpenseEntry[];
    financial_summary: {
      total_expenses: number;
      total_grant_received: number;
      total_other_sources: number;
      remainder: number;
    };
    additional_questions: {
      excess_expenses: string;
      surplus_use: string;
      lessons_learned: string;
      training_needs: string;
    };
  };
  onFormSubmit: (formData?: any, isDraft?: boolean) => void;
  project?: any;
}

// Add this helper component for required field labels
const RequiredLabel: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center">
    {text} <span className="text-red-500 ml-1">*</span>
  </div>
);

const PrefilledForm: React.FC<PrefilledFormProps> = ({ data, onFormSubmit, project }) => {
  const { t } = useTranslation("scanForm");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [receiptUploads, setReceiptUploads] = useState<{ [key: number]: string }>({});
  const [receiptFiles, setReceiptFiles] = useState<{ [key: number]: File }>({});
  const [errors, setErrors] = useState<any>({});
  const [collapsedExpenses, setCollapsedExpenses] = useState<{ [key: number]: boolean }>({});
  const [fileUploads, setFileUploads] = useState<{ [key: number]: FileWithProgress }>({});

  // Initialize form data with default values
  const [formData, setFormData] = useState({
    err_id: project?.err_id || '',  // Use project's err_id field
    date: data?.date || '',
    expenses: data?.expenses?.map(expense => ({
      id: uuidv4(), // Add unique id for each expense
      activity: expense?.activity || '',
      description: expense?.description || '',
      payment_date: expense?.payment_date || '',
      seller: expense?.seller || '',
      payment_method: expense?.payment_method || '',
      receipt_no: expense?.receipt_no || '',
      amount: expense?.amount || 0,
    })) || [],
    financial_summary: {
      total_expenses: data?.financial_summary?.total_expenses || 0,
      total_grant_received: data?.financial_summary?.total_grant_received || 0,
      total_other_sources: data?.financial_summary?.total_other_sources || 0,
      remainder: data?.financial_summary?.remainder || 0
    },
    additional_questions: {
      excess_expenses: data?.additional_questions?.excess_expenses || '',
      surplus_use: data?.additional_questions?.surplus_use || '',
      lessons_learned: data?.additional_questions?.lessons_learned || '',
      training_needs: data?.additional_questions?.training_needs || ''
    }
  });

  // Move useEffect before any conditionals
  useEffect(() => {
    // Calculate total from all expense amounts
    const total = formData.expenses.reduce((sum, expense) => {
      // Convert amount to string before parsing
      const amount = parseFloat(expense.amount.toString()) || 0;
      return sum + amount;
    }, 0);

    setFormData(prev => ({
      ...prev,
      financial_summary: {
        ...prev.financial_summary,
        total_expenses: total
      }
    }));
  }, [formData.expenses]);

  // Project check can come after hooks
  if (!project?.id) {
    return (
      <div className="text-red-500">
        {t("errors.missing_project")}
      </div>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Handle nested fields
    if (name.includes('financial_summary.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        financial_summary: {
          ...formData.financial_summary,
          [field]: value
        }
      });
    } else if (name.includes('additional_questions.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        additional_questions: {
          ...formData.additional_questions,
          [field]: value
        }
      });
    } else {
      // Handle top-level fields
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleExpenseChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    const newExpenses = [...formData.expenses];
    newExpenses[index] = { ...newExpenses[index], [name]: value };
    setFormData({ ...formData, expenses: newExpenses });
  };

  const handleReceiptUpload = (index: number, file: File) => {
    setReceiptFiles(prev => ({ ...prev, [index]: file }));
  };

  const handleReceiptError = (error: string) => {
    alert(error);
  };

  const toggleExpenseCollapse = (index: number) => {
    setCollapsedExpenses(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const addNewExpense = () => {
    setFormData(prev => ({
      ...prev,
      expenses: [...prev.expenses, {
        id: uuidv4(), // Add unique id for new expenses
        activity: '',
        description: '',
        payment_date: '',
        seller: '',
        payment_method: '',
        receipt_no: '',
        amount: 0,
      }]
    }));
  };

  const removeExpense = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      expenses: prev.expenses.filter((_, index) => index !== indexToRemove)
    }));
    
    // Clean up the receipt states for this expense
    setReceiptFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[indexToRemove];
      return newFiles;
    });
    
    setReceiptUploads(prev => {
      const newUploads = { ...prev };
      delete newUploads[indexToRemove];
      return newUploads;
    });
  };

  const handleFileUpload = (index: number, fileWithProgress: FileWithProgress) => {
    console.log('Setting file value for expense index:', index);
    setFileUploads(prev => ({
      ...prev,
      [index]: fileWithProgress
    }));
  };

  const validateForm = () => {
    const newErrors: any = {};
    
    // Validate main fields
    if (!formData.err_id) {
      newErrors.err_id = t('field_labels.err_id');
    }
    if (!formData.date) {
      newErrors.date = t('field_labels.date');
    }

    // Validate expenses
    const expenseErrors: { [key: number]: { [field: string]: string } } = {};
    formData.expenses.forEach((expense, index) => {
      const expenseError: { [field: string]: string } = {};
      
      if (!expense.activity) {
        expenseError.activity = t('field_labels.activity');
      }
      if (!expense.description) {
        expenseError.description = t('field_labels.description');
      }
      if (!expense.payment_date) {
        expenseError.payment_date = t('field_labels.payment_date');
      }
      if (!expense.seller) {
        expenseError.seller = t('field_labels.seller');
      }
      if (!expense.receipt_no) {
        expenseError.receipt_no = t('field_labels.receipt_no');
      }
      if (!expense.amount) {
        expenseError.amount = t('field_labels.amount');
      } else if (isNaN(parseFloat(expense.amount.toString()))) {
        expenseError.amount = t('validation.amount_invalid');
      }

      if (Object.keys(expenseError).length > 0) {
        expenseErrors[index] = expenseError;
      }
    });

    if (Object.keys(expenseErrors).length > 0) {
      newErrors.expenses = expenseErrors;
    }

    // Validate totals
    if (!formData.financial_summary.total_grant_received) {
      newErrors.total_grant = t('field_labels.total_grant');
    }
    if (!formData.financial_summary.total_other_sources) {
      newErrors.total_other_sources = t('field_labels.total_other_sources');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getErrorSummary = () => {
    if (Object.keys(errors).length > 0) {
      return [t('validation.fill_required_fields')];
    }
    return [];
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      // Structure the summary data
      const summaryDataToInsert = {
        err_id: formData.err_id,
        project_id: project.id,
        report_date: formData.date,
        total_expenses: formData.financial_summary.total_expenses,
        total_grant: formData.financial_summary.total_grant_received,
        total_other_sources: formData.financial_summary.total_other_sources,
        remainder: formData.financial_summary.remainder,
        excess_expenses: formData.additional_questions.excess_expenses,
        surplus_use: formData.additional_questions.surplus_use,
        lessons: formData.additional_questions.lessons_learned,
        training: formData.additional_questions.training_needs,
        language: formData.language || 'en',
        beneficiaries: formData.beneficiaries || '',
        project_name: project.project_name,
        project_objectives: project.project_objectives
      };

      // Submit summary
      const { data: summaryData, error: summaryError } = await newSupabase
        .from('err_summary')
        .insert([summaryDataToInsert])
        .select()
        .single();

      if (summaryError) throw summaryError;

      // Submit expenses with their associated files
      const expensePromises = formData.expenses.map(async (expense: any, index: number) => {
        const expenseToInsert = {
          project_id: project.id,
          expense_activity: expense.activity,
          expense_description: expense.description,
          expense_amount: expense.amount,
          payment_date: expense.payment_date,
          payment_method: expense.payment_method,
          receipt_no: expense.receipt_no,
          seller: expense.seller,
          language: formData.language || 'en'
        };

        // Insert expense record
        const { data: expenseData, error: expenseError } = await newSupabase
          .from('err_expense')
          .insert([expenseToInsert])
          .select()
          .single();

        if (expenseError) throw expenseError;

        // If there's a file upload for this expense, create receipt record
        if (fileUploads[index]?.uploadedUrl) {
          const { error: receiptError } = await newSupabase
            .from('receipts')
            .insert([{
              expense_id: expenseData.expense_id,
              image_url: fileUploads[index].uploadedUrl,
              created_at: new Date().toISOString()
            }]);

          if (receiptError) throw receiptError;
        }
      });

      await Promise.all(expensePromises);
      onFormSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Failed to submit form');
    }
  };

  // Modify handleSaveDraft function
  const handleSaveDraft = async (formData: any) => {
    try {
        // Get current session
        const { data: { session } } = await newSupabase.auth.getSession();
        
        if (!session) {
            throw new Error('No active session');
        }

        const response = await fetch('/api/financial-report-drafts', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            credentials: 'include',
            body: JSON.stringify({
                project_id: project.id,
                summary: {
                    err_id: formData.err_id,
                    report_date: formData.date,
                    total_grant: formData.financial_summary.total_grant_received,
                    total_other_sources: formData.financial_summary.total_other_sources,
                    excess_expenses: formData.additional_questions.excess_expenses,
                    surplus_use: formData.additional_questions.surplus_use,
                    lessons: formData.additional_questions.lessons_learned,
                    training: formData.additional_questions.training_needs,
                    total_expenses: formData.financial_summary.total_expenses
                },
                expenses: formData.expenses.map(expense => ({
                    activity: expense.activity,
                    description: expense.description,
                    amount: expense.amount,
                    payment_date: expense.payment_date,
                    payment_method: expense.payment_method,
                    receipt_no: expense.receipt_no,
                    seller: expense.seller
                }))
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save draft');
        }

        alert(t('drafts.draftSaved'));
        onFormSubmit(undefined, true); // Pass true to indicate this is a draft save
    } catch (error) {
        console.error('Error saving draft:', error);
        alert(t('drafts.saveError'));
    }
  };

  return (
    <div className="space-y-6">
      <label>
        <RequiredLabel text={t("field_labels.err_id")} />
        <input
          type="text"
          name="err_id"
          onChange={handleInputChange}
          value={formData.err_id}
          className={`w-full p-2 border rounded ${errors.err_id ? 'border-red-500' : ''}`}
        />
        {errors.err_id && (
          <p className="text-red-500 text-sm mt-1">{errors.err_id}</p>
        )}
      </label>
      <label>
        <RequiredLabel text={t("field_labels.date")} />
        <input
          type="date"
          name="date"
          onChange={handleInputChange}
          value={formData.date}
          className={`w-full p-2 border rounded ${errors.date ? 'border-red-500' : ''}`}
        />
        {errors.date && (
          <p className="text-red-500 text-sm mt-1">{errors.date}</p>
        )}
      </label>

      <div className="space-y-2">
        {(formData.expenses || []).map((expense, index) => (
          <div key={index} className={`border p-2 rounded ${errors.expenses?.[index] ? 'border-red-500 bg-red-50' : 'bg-gray-100'}`}>
            {!collapsedExpenses[index] ? (
              <div>
                {errors.expenses?.[index] && (
                  <p className="text-red-500 text-sm mb-2">
                    {t('validation.expense_errors', { index: index + 1 })}
                  </p>
                )}
                <div className="flex justify-between items-center mb-2">
                  <h4>{t("expense_entry", { index: index + 1 })}</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleExpenseCollapse(index)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title={t("buttons.collapse")}
                    >
                      <Check />
                    </button>
                    <button
                      onClick={() => removeExpense(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title={t("buttons.remove_expense")}
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
                <label>
                  <RequiredLabel text={t("field_labels.payment_date")} />
                  <input
                    type="date"
                    name="payment_date"
                    value={expense.payment_date}
                    onChange={(e) => handleExpenseChange(index, e)}
                    className={`w-full p-2 border rounded ${errors.expenses?.[index]?.payment_date ? 'border-red-500' : ''}`}
                  />
                </label>
                <label>
                  <RequiredLabel text={t("field_labels.activity")} />
                  <input
                    type="text"
                    name="activity"
                    value={expense.activity}
                    onChange={(e) => handleExpenseChange(index, e)}
                    className={`w-full p-2 border rounded ${errors.expenses?.[index]?.activity ? 'border-red-500' : ''}`}
                  />
                </label>
                <label>
                  <RequiredLabel text={t("field_labels.description")} />
                  <input
                    type="text"
                    name="description"
                    value={expense.description}
                    onChange={(e) => handleExpenseChange(index, e)}
                    className={`w-full p-2 border rounded ${errors.expenses?.[index]?.description ? 'border-red-500' : ''}`}
                  />
                </label>
                <label>
                  <RequiredLabel text={t("field_labels.seller")} />
                  <input
                    type="text"
                    name="seller"
                    value={expense.seller}
                    onChange={(e) => handleExpenseChange(index, e)}
                    className={`w-full p-2 border rounded ${errors.expenses?.[index]?.seller ? 'border-red-500' : ''}`}
                  />
                </label>
                <label>
                  <RequiredLabel text={t("field_labels.payment_method")} />
                  <input
                    type="text"
                    name="payment_method"
                    value={expense.payment_method}
                    onChange={(e) => handleExpenseChange(index, e)}
                    className={`w-full p-2 border rounded ${errors.expenses?.[index]?.payment_method ? 'border-red-500' : ''}`}
                  />
                </label>
                <label>
                  <RequiredLabel text={t("field_labels.receipt_no")} />
                  <input
                    type="text"
                    name="receipt_no"
                    value={expense.receipt_no}
                    onChange={(e) => handleExpenseChange(index, e)}
                    className={`w-full p-2 border rounded ${errors.expenses?.[index]?.receipt_no ? 'border-red-500' : ''}`}
                  />
                </label>
                <label>
                  <RequiredLabel text={t("field_labels.amount")} />
                  <input
                    type="text"
                    name="amount"
                    value={expense.amount.toString()}
                    onChange={(e) => handleExpenseChange(index, e)}
                    className={`w-full p-2 border rounded ${errors.expenses?.[index]?.amount ? 'border-red-500' : ''}`}
                  />
                </label>
                <div className="mt-4">
                  <p className="font-medium mb-2">{t("field_labels.receipt_upload")}</p>
                  <UploadChooserSupporting
                    id={`expense-${index}-${expense.id || index}`}
                    uploadType={reportUploadType.RECEIPT}
                    projectId={project.id}
                    reportId={formData.err_id}
                    onChange={(file) => handleFileUpload(index, file)}
                    expenseIndex={index}
                  />
                  {fileUploads[index]?.uploadedUrl && (
                    <p className="text-green-600 text-sm mt-1">
                      {t("upload.file_uploaded")}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-row justify-between items-center p-2">
                <div>
                  <p><span className="font-bold">{t('activity')}:&nbsp;</span>{expense.activity}</p>
                  <p><span className="font-bold">{t('amount')}:&nbsp;</span>{expense.amount}</p>
                  {fileUploads[index]?.uploadedUrl && (
                    <p><span className="font-bold">{t('receipt')}:&nbsp;</span>✓</p>
                  )}
                </div>
                <button
                  onClick={() => toggleExpenseCollapse(index)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Pencil />
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add New Expense Button */}
        <button
          type="button"
          onClick={addNewExpense}
          className="w-full mt-4 py-2 px-4 bg-green-100 text-primaryGreen rounded-lg hover:bg-green-200 transition-colors flex items-center justify-center gap-2"
        >
          <span>+</span> {t("buttons.add_expense")}
        </button>
      </div>

      {/* Financial Summary Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("field_labels.financial_summary")}</h3>
        
        <label>
          <RequiredLabel text={t("field_labels.total_expenses")} />
          <input
            type="number"
            name="financial_summary.total_expenses"
            value={formData.financial_summary.total_expenses}
            readOnly
            className="form-input w-full border-2 border-gray-300 rounded-md bg-gray-50"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.total_grant")} />
          <input
            type="number"
            name="financial_summary.total_grant_received"
            value={formData.financial_summary.total_grant_received}
            onChange={handleInputChange}
            className="form-input w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.total_other_sources")} />
          <input
            type="text"
            name="financial_summary.total_other_sources"
            value={formData.financial_summary.total_other_sources.toString()}
            onChange={handleInputChange}
            className="form-input w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.remainder")} />
          <input
            type="text"
            name="financial_summary.remainder"
            value={formData.financial_summary.remainder.toString()}
            onChange={handleInputChange}
            className="form-input w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>
      </div>

      {/* Additional Questions Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("field_labels.additional_questions")}</h3>
        
        <label>
          <RequiredLabel text={t("field_labels.excess_expenses_q")} />
          <textarea
            name="additional_questions.excess_expenses"
            value={formData.additional_questions.excess_expenses}
            onChange={handleInputChange}
            className="form-textarea w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.surplus_use_q")} />
          <textarea
            name="additional_questions.surplus_use"
            value={formData.additional_questions.surplus_use}
            onChange={handleInputChange}
            className="form-textarea w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.lessons_learned_q")} />
          <textarea
            name="additional_questions.lessons_learned"
            value={formData.additional_questions.lessons_learned}
            onChange={handleInputChange}
            className="form-textarea w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.training_needs_q")} />
          <textarea
            name="additional_questions.training_needs"
            value={formData.additional_questions.training_needs}
            onChange={handleInputChange}
            className="form-textarea w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>
      </div>

      <div className="flex justify-between gap-4 mt-6">
        <Button
            onClick={() => handleSaveDraft(formData)}
            disabled={isSubmitting}
            text={t("saveDraft")}
            className="w-full bg-gray-100 hover:bg-gray-200"
        />
        <Button
            onClick={async (e) => {
                e.preventDefault();
                await handleFormSubmit(formData);
            }}
            disabled={isSubmitting}
            text={isSubmitting ? t("buttons.submitting") : t("buttons.submit")}
            className="w-full"
        />
      </div>
    </div>
  );
};

export default PrefilledForm;