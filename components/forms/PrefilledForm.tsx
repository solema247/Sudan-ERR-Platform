// components/PrefilledForm.tsx

import React, { useState } from "react";
import { useTranslation } from "react-i18next"; // Import i18n
import Button from "../ui/Button";
import ReceiptUploader from '../uploads/ReceiptUploader';
import { v4 as uuidv4 } from 'uuid';

interface ExpenseEntry {
  activity: string;
  description: string;
  payment_date: string;
  seller: string;
  payment_method: string;
  receipt_no: string;
  amount: number;
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
  onFormSubmit: (formData?: any) => void;
  project?: any;
}

// Add this helper component for required field labels
const RequiredLabel: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center">
    {text} <span className="text-red-500 ml-1">*</span>
  </div>
);

const PrefilledForm: React.FC<PrefilledFormProps> = ({ data, onFormSubmit, project }) => {
  const { t } = useTranslation("scanForm");  // Access translations
  const [formData, setFormData] = useState({
    date: data.date || "",
    err_id: data.err_id || "",
    expenses: data.expenses || [],
    total_grant: data.financial_summary?.total_grant_received || "",
    total_other_sources: data.financial_summary?.total_other_sources || "",
    total_expenses: data.financial_summary?.total_expenses || "",
    remainder: data.financial_summary?.remainder || "",
    additional_excess_expenses: data.additional_questions?.excess_expenses || "",
    additional_surplus_use: data.additional_questions?.surplus_use || "",
    lessons_learned: data.additional_questions?.lessons_learned || "",
    additional_training_needs: data.additional_questions?.training_needs || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [receiptUploads, setReceiptUploads] = useState<{ [key: number]: string }>({});
  const [receiptFiles, setReceiptFiles] = useState<{ [key: number]: File }>({});
  const [errors, setErrors] = useState<{
    err_id?: string;
    date?: string;
    expenses?: { [key: number]: { [field: string]: string } };
    total_grant?: string;
    total_other_sources?: string;
    additional_excess_expenses?: string;
    additional_surplus_use?: string;
    additional_training_needs?: string;
    lessons_learned?: string;
  }>({});

  // Add check at the start of component
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
    setFormData({ ...formData, [name]: value });
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

  const addNewExpense = () => {
    const newExpense: ExpenseEntry = {
      activity: '',
      description: '',
      payment_date: '',
      seller: '',
      payment_method: 'cash',
      receipt_no: '',
      amount: 0,
    };

    setFormData(prev => ({
      ...prev,
      expenses: [...prev.expenses, newExpense]
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
    if (!formData.total_grant) {
      newErrors.total_grant = t('field_labels.total_grant');
    }
    if (!formData.total_other_sources) {
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

  const handleSubmit = async () => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setIsSubmitting(true);
    try {
      // Format date properly for database
      const submissionData = {
        ...formData,
        date: formData.date ? new Date(formData.date).toISOString().split('T')[0] : null,
        expenses: await Promise.all(
          formData.expenses.map(async (expense, index) => {
            const receiptFile = receiptFiles[index];
            if (!receiptFile) {
              return expense;
            }

            const uploadFormData = new FormData();
            uploadFormData.append('file', receiptFile);
            uploadFormData.append('expenseId', uuidv4());
            uploadFormData.append('projectId', project.id);
            uploadFormData.append('reportId', formData.err_id);

            const uploadResponse = await fetch('/api/upload-receipt', {
              method: 'POST',
              body: uploadFormData
            });

            if (!uploadResponse.ok) {
              const errorData = await uploadResponse.json();
              throw new Error(errorData.message || 'Receipt upload failed');
            }

            const uploadResult = await uploadResponse.json();

            return {
              ...expense,
              receipt_upload: uploadResult.filename
            };
          })
        ),
        projectId: project.id
      };

      const response = await fetch("/api/submit-prefilled-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) throw new Error(t("errors.submit_failed"));
      const result = await response.json();
      console.log(t("form_submit_success"), result.message);

      setIsSubmitted(true);
      onFormSubmit(submissionData);
    } catch (error) {
      console.error('Submit error:', error);
      setErrors(prev => ({
        ...prev,
        submit: error.message || t("errors.submit_failed")
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
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
        {formData.expenses.map((expense, index) => (
          <div key={index} className={`border p-2 rounded ${errors.expenses?.[index] ? 'border-red-500 bg-red-50' : 'bg-gray-100'}`}>
            {errors.expenses?.[index] && (
              <p className="text-red-500 text-sm mb-2">
                {t('validation.expense_errors', { index: index + 1 })}
              </p>
            )}
            <div className="flex justify-between items-center mb-2">
              <h4>{t("expense_entry", { index: index + 1 })}</h4>
              <button
                onClick={() => removeExpense(index)}
                className="text-red-600 hover:text-red-800 p-1"
                title={t("buttons.remove_expense")}
              >
                ✕
              </button>
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
            <ReceiptUploader
              expenseId={uuidv4()}
              projectId={project.id}
              reportId={formData.err_id}
              onFileSelect={(file) => handleReceiptUpload(index, file)}
              onError={(error) => setErrors({ ...errors, [`receipt_${index}`]: error })}
            />
          </div>
        ))}
      </div>

      {/* Financial Summary Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">{t("field_labels.financial_summary")}</h3>
        
        <label>
          <RequiredLabel text={t("field_labels.total_expenses")} />
          <input
            type="text"
            name="total_expenses"
            value={formData.total_expenses}
            onChange={handleInputChange}
            className="form-input w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.total_grant")} />
          <input
            type="text"
            name="total_grant"
            value={formData.total_grant}
            onChange={handleInputChange}
            className="form-input w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.total_other_sources")} />
          <input
            type="text"
            name="total_other_sources"
            value={formData.total_other_sources}
            onChange={handleInputChange}
            className="form-input w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.remainder")} />
          <input
            type="text"
            name="remainder"
            value={formData.remainder}
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
            name="additional_excess_expenses"
            value={formData.additional_excess_expenses}
            onChange={handleInputChange}
            className="form-textarea w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.surplus_use_q")} />
          <textarea
            name="additional_surplus_use"
            value={formData.additional_surplus_use}
            onChange={handleInputChange}
            className="form-textarea w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.lessons_learned_q")} />
          <textarea
            name="lessons_learned"
            value={formData.lessons_learned}
            onChange={handleInputChange}
            className="form-textarea w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>

        <label>
          <RequiredLabel text={t("field_labels.training_needs_q")} />
          <textarea
            name="additional_training_needs"
            value={formData.additional_training_needs}
            onChange={handleInputChange}
            className="form-textarea w-full border-2 border-gray-300 rounded-md focus:border-green-500 focus:ring-2 focus:ring-green-200"
          />
        </label>
      </div>

      <Button 
        onClick={handleSubmit} 
        disabled={isSubmitting}
        text={isSubmitting ? t("buttons.submitting") : t("buttons.submit")}
        className="w-full py-2 px-4 bg-primaryGreen text-white rounded hover:bg-green-700"
      />
    </div>
  );
};

export default PrefilledForm;