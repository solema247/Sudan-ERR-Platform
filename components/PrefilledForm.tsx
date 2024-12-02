// components/PrefilledForm.tsx

import React, { useState } from "react";
import { useTranslation } from "react-i18next"; // Import i18n
import Button from "../components/Button";

interface ExpenseEntry {
  activity: string;
  description: string;
  payment_date: string;
  seller: string;
  payment_method: string;
  receipt_no: string;
  amount: string;
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
}

const PrefilledForm: React.FC<PrefilledFormProps> = ({ data, onFormSubmit }) => {
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

  const handleSubmit = async () => {
    setIsSubmitting(true); // Start processing
    try {
      const response = await fetch("/api/submit-prefilled-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error(t("errors.submit_failed"));
      const result = await response.json();
      console.log(t("form_submit_success"), result.message);

      setIsSubmitted(true); // Mark as submitted
      onFormSubmit(formData);// Trigger callback
    } catch (error) {
      console.error(t("errors.submit_failed"), error);
      alert(t("errors.submit_failed"));
    } finally {
      setIsSubmitting(false); // Stop processing
    }
  };

  return (
    <div className="w-full space-y-4 bg-white rounded-lg">
      <label>
        {t("field_labels.err_id")}
        <input
          type="text"
          name="err_id"
          onChange={handleInputChange}
          value={formData.err_id}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>
        {t("field_labels.date")}
        <input
          type="date"
          name="date"
          onChange={handleInputChange}
          value={formData.date}
          className="w-full p-2 border rounded"
        />
      </label>

      <div className="space-y-2">
        {formData.expenses.map((expense, index) => (
          <div key={index} className="border p-2 rounded bg-gray-100">
            <h4>{t("expense_entry", { index: index + 1 })}</h4>
            <label>
              {t("field_labels.activity")}
              <input
                type="text"
                name="activity"
                value={expense.activity}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              {t("field_labels.description")}
              <input
                type="text"
                name="description"
                value={expense.description}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              {t("field_labels.payment_date")}
              <input
                type="date"
                name="payment_date"
                value={expense.payment_date}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <div className="mb-1">
              <label className="block">
                {t("field_labels.seller")}
              </label>
              <input
                type="text"
                name="seller"
                value={expense.seller}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </div>
            <label>
              {t("field_labels.payment_method")}
              <select
                name="payment_method"
                value={expense.payment_method}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              >
                <option value="cash">{t("payment_methods.cash")}</option>
                <option value="bank app">{t("payment_methods.bank_app")}</option>
              </select>
            </label>
            <label>
              {t("field_labels.receipt_no")}
              <input
                type="text"
                name="receipt_no"
                value={expense.receipt_no}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              {t("field_labels.amount")}
              <input
                type="number"
                name="amount"
                value={expense.amount}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
          </div>
        ))}
      </div>

      <label>
        {t("field_labels.total_grant")}
        <input
          type="number"
          name="total_grant"
          onChange={handleInputChange}
          value={formData.total_grant}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>
        {t("field_labels.total_other_sources")}
        <input
          type="number"
          name="total_other_sources"
          onChange={handleInputChange}
          value={formData.total_other_sources}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>
        {t("field_labels.additional_excess_expenses")}
        <textarea
          name="additional_excess_expenses"
          onChange={handleInputChange}
          value={formData.additional_excess_expenses}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>
        {t("field_labels.additional_surplus_use")}
        <textarea
          name="additional_surplus_use"
          onChange={handleInputChange}
          value={formData.additional_surplus_use}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>
        {t("field_labels.additional_training_needs")}
        <textarea
          name="additional_training_needs"
          onChange={handleInputChange}
          value={formData.additional_training_needs}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>
        {t("field_labels.lessons_learned")}
        <textarea
          name="lessons_learned"
          onChange={handleInputChange}
          value={formData.lessons_learned}
          className="w-full p-2 border rounded"
        />
      </label>
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


