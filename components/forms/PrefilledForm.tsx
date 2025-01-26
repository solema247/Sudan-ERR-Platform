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
  amount: string;
  receipt_upload?: string;
}

interface PrefilledFormProps {
  data: {
    date?: string;
    err_id?: string;
    expenses?: ExpenseEntry[];
    total_grant?: string;
    total_other_sources?: string;
    total_expenses?: string;
    remainder?: string;
    additional_excess_expenses?: string;
    additional_surplus_use?: string;
    lessons_learned?: string;
    additional_training_needs?: string;
  };
  onFormSubmit: (formData: any) => void;
  project: {
    id: string;
  };
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
    total_grant: data.total_grant || "",
    total_other_sources: data.total_other_sources || "",
    total_expenses: data.total_expenses || "",
    remainder: data.remainder || "",
    additional_excess_expenses: data.additional_excess_expenses || "",
    additional_surplus_use: data.additional_surplus_use || "",
    lessons_learned: data.lessons_learned || "",
    additional_training_needs: data.additional_training_needs || "",
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

  const handleFileSelect = (index: number, file: File) => {
    setReceiptFiles(prev => ({
      ...prev,
      [index]: file
    }));
    setReceiptUploads(prev => ({
      ...prev,
      [index]: file.name
    }));
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
      amount: '',
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
      } else if (isNaN(parseFloat(expense.amount))) {
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
    <div className="w-full space-y-4 bg-white rounded-lg">
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
              <RequiredLabel text={t("field_labels.activity")} />
              <input
                type="text"
                name="activity"
                value={expense.activity}
                onChange={(e) => handleExpenseChange(index, e)}
                className={`w-full p-2 border rounded ${errors.expenses?.[index]?.activity ? 'border-red-500' : ''}`}
              />
              {errors.expenses?.[index]?.activity && (
                <p className="text-red-500 text-sm mt-1">{errors.expenses?.[index]?.activity}</p>
              )}
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
              {errors.expenses?.[index]?.description && (
                <p className="text-red-500 text-sm mt-1">{errors.expenses?.[index]?.description}</p>
              )}
            </label>
            <label>
              <RequiredLabel text={t("field_labels.payment_date")} />
              <input
                type="date"
                name="payment_date"
                value={expense.payment_date}
                onChange={(e) => handleExpenseChange(index, e)}
                className={`w-full p-2 border rounded ${errors.expenses?.[index]?.payment_date ? 'border-red-500' : ''}`}
              />
              {errors.expenses?.[index]?.payment_date && (
                <p className="text-red-500 text-sm mt-1">{errors.expenses?.[index]?.payment_date}</p>
              )}
            </label>
            <div className="mb-1">
              <label className="block">
                <RequiredLabel text={t("field_labels.seller")} />
              </label>
              <input
                type="text"
                name="seller"
                value={expense.seller}
                onChange={(e) => handleExpenseChange(index, e)}
                className={`w-full p-2 border rounded ${errors.expenses?.[index]?.seller ? 'border-red-500' : ''}`}
              />
              {errors.expenses?.[index]?.seller && (
                <p className="text-red-500 text-sm mt-1">{errors.expenses?.[index]?.seller}</p>
              )}
            </div>
            <label>
              <RequiredLabel text={t("field_labels.payment_method")} />
              <select
                name="payment_method"
                value={expense.payment_method}
                onChange={(e) => handleExpenseChange(index, e)}
                className={`w-full p-2 border rounded ${errors.expenses?.[index]?.payment_method ? 'border-red-500' : ''}`}
              >
                <option value="cash">{t("payment_methods.cash")}</option>
                <option value="bank app">{t("payment_methods.bank_app")}</option>
              </select>
              {errors.expenses?.[index]?.payment_method && (
                <p className="text-red-500 text-sm mt-1">{errors.expenses?.[index]?.payment_method}</p>
              )}
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
              {errors.expenses?.[index]?.receipt_no && (
                <p className="text-red-500 text-sm mt-1">{errors.expenses?.[index]?.receipt_no}</p>
              )}
            </label>
            <label>
              <RequiredLabel text={t("field_labels.amount")} />
              <input
                type="number"
                name="amount"
                value={expense.amount}
                onChange={(e) => handleExpenseChange(index, e)}
                className={`w-full p-2 border rounded ${errors.expenses?.[index]?.amount ? 'border-red-500' : ''}`}
              />
              {errors.expenses?.[index]?.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.expenses?.[index]?.amount}</p>
              )}
            </label>
            <div className="mt-2">
              <ReceiptUploader
                expenseId={uuidv4()}
                projectId={project.id}
                reportId={formData.err_id}
                onFileSelect={(file) => handleFileSelect(index, file)}
                onError={handleReceiptError}
              />
              {receiptUploads[index] && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {receiptUploads[index]}
                </p>
              )}
            </div>
          </div>
        ))}
        
        <Button
          text={t("buttons.add_expense")}
          onClick={addNewExpense}
          className="mt-8 mb-8 bg-green-600 hover:bg-green-700 text-white"
        />
      </div>

      <label>
        <RequiredLabel text={t("field_labels.total_grant")} />
        <input
          type="number"
          name="total_grant"
          onChange={handleInputChange}
          value={formData.total_grant}
          className={`w-full p-2 border rounded ${errors.total_grant ? 'border-red-500' : ''}`}
        />
        {errors.total_grant && (
          <p className="text-red-500 text-sm mt-1">{errors.total_grant}</p>
        )}
      </label>
      <label>
        <RequiredLabel text={t("field_labels.total_other_sources")} />
        <input
          type="number"
          name="total_other_sources"
          onChange={handleInputChange}
          value={formData.total_other_sources}
          className={`w-full p-2 border rounded ${errors.total_other_sources ? 'border-red-500' : ''}`}
        />
        {errors.total_other_sources && (
          <p className="text-red-500 text-sm mt-1">{errors.total_other_sources}</p>
        )}
      </label>
      <label>
        <RequiredLabel text={t("field_labels.additional_excess_expenses")} />
        <textarea
          name="additional_excess_expenses"
          onChange={handleInputChange}
          value={formData.additional_excess_expenses}
          className={`w-full p-2 border rounded ${errors.additional_excess_expenses ? 'border-red-500' : ''}`}
        />
        {errors.additional_excess_expenses && (
          <p className="text-red-500 text-sm mt-1">{errors.additional_excess_expenses}</p>
        )}
      </label>
      <label>
        <RequiredLabel text={t("field_labels.additional_surplus_use")} />
        <textarea
          name="additional_surplus_use"
          onChange={handleInputChange}
          value={formData.additional_surplus_use}
          className={`w-full p-2 border rounded ${errors.additional_surplus_use ? 'border-red-500' : ''}`}
        />
        {errors.additional_surplus_use && (
          <p className="text-red-500 text-sm mt-1">{errors.additional_surplus_use}</p>
        )}
      </label>
      <label>
        <RequiredLabel text={t("field_labels.additional_training_needs")} />
        <textarea
          name="additional_training_needs"
          onChange={handleInputChange}
          value={formData.additional_training_needs}
          className={`w-full p-2 border rounded ${errors.additional_training_needs ? 'border-red-500' : ''}`}
        />
        {errors.additional_training_needs && (
          <p className="text-red-500 text-sm mt-1">{errors.additional_training_needs}</p>
        )}
      </label>
      <label>
        <RequiredLabel text={t("field_labels.lessons_learned")} />
        <textarea
          name="lessons_learned"
          onChange={handleInputChange}
          value={formData.lessons_learned}
          className={`w-full p-2 border rounded ${errors.lessons_learned ? 'border-red-500' : ''}`}
        />
        {errors.lessons_learned && (
          <p className="text-red-500 text-sm mt-1">{errors.lessons_learned}</p>
        )}
      </label>

      {/* Add error summary just before the submit button */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {t('validation.fill_required_fields')}
              </p>
            </div>
          </div>
        </div>
      )}

      <Button
        text={
          isSubmitting
            ? t("button_text.processing")
            : isSubmitted
            ? t("button_text.submitted")
            : t("button_text.submit")
        }
        onClick={handleSubmit}
        type="button"
        disabled={isSubmitting || isSubmitted} // Disable button during processing or after submission
        className="bg-primaryGreen text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all"
      />
    </div>
  );
};

export default PrefilledForm;


