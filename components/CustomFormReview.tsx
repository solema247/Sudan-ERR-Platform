//components/CustomFormReview.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Button from "./Button";

interface ExpenseEntry {
  activity: string;
  description: string;
  payment_date: string;
  seller: string;
  payment_method: string;
  receipt_no: string;
  amount: string;
}

interface CustomFormReviewProps {
  data: {
    date?: string;
    err_id?: string;
    expenses?: ExpenseEntry[];
    financial_summary?: {
      total_expenses?: string;
      total_grant_received?: string;
      total_other_sources?: string;
      remainder?: string;
    };
    additional_questions?: {
      excess_expenses?: string;
      surplus_use?: string;
      lessons_learned?: string;
      training_needs?: string;
    };
    unused_text?: {
      likely_ocr_errors?: string;
      potentially_useful_information?: string;
    };
  };
  onSubmit: (formData: any) => void;
}

const CustomFormReview: React.FC<CustomFormReviewProps> = ({ data, onSubmit }) => {
  const { t } = useTranslation("customScanForm");
  const [formData, setFormData] = useState(data);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [showUnusedText, setShowUnusedText] = useState(false);

  // Calculate completion percentage
  const calculateCompletion = () => {
    let totalFields = 0;
    let completedFields = 0;

    const checkFields = (obj: any) => {
      Object.keys(obj).forEach((key) => {
        totalFields++;
        const value = obj[key];
        // Check if the field is not empty
        if (
          value &&
          value !== "" &&
          value !== "غير متوفر" && // Explicitly check raw Arabic value
          value !== "Not available" // Explicitly check raw English value
        ) {
          // Check for valid date format (only for date fields)
          if (key.includes("date")) {
            const isValidDate = !isNaN(Date.parse(value)); // Ensure value is a valid date
            if (isValidDate) completedFields++;
          } else {
            completedFields++;
          }
        }
      });
    };

    // Check general fields
    checkFields({ date: formData.date, err_id: formData.err_id });

    // Check financial summary
    if (formData.financial_summary) checkFields(formData.financial_summary);

    // Check additional questions
    if (formData.additional_questions) checkFields(formData.additional_questions);

    // Check expenses
    if (formData.expenses && formData.expenses.length > 0) {
      formData.expenses.forEach((expense) => checkFields(expense));
    } else {
      totalFields++; // Account for an empty expenses array
    }

    return Math.round((completedFields / totalFields) * 100);
  };

  useEffect(() => {
    setCompletionPercentage(calculateCompletion());
  }, [formData]);

  // Handle general field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Check if the field belongs to financial_summary
    if (name in (formData.financial_summary || {})) {
      setFormData((prevState) => ({
        ...prevState,
        financial_summary: {
          ...prevState.financial_summary,
          [name]: value, // Update the specific field in financial_summary
        },
      }));
    } else {
      // Update top-level fields
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  // Handle changes for expense fields
  const handleExpenseChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedExpenses = [...(formData.expenses || [])];
    updatedExpenses[index] = { ...updatedExpenses[index], [name]: value };
    setFormData((prevState) => ({
      ...prevState,
      expenses: updatedExpenses,
    }));
  };

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Make the API call to submit the form data
      const response = await fetch("/api/submit-custom-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData), // Send the updated formData to the backend
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error submitting the form:", errorText);
        alert(t("errors.submit_failed")); // Display error message to the user
        return;
      }

      const result = await response.json();
      console.log("Form submitted successfully:", result);
      alert(t("messages.form_submission_success")); // Show success message to the user
    } catch (error) {
      console.error("Error during form submission:", error);
      alert(t("errors.internal_server_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
        <div
          className="bg-green-500 h-4 rounded-full transition-all"
          style={{ width: `${completionPercentage}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-700 mb-4">{t("completion", { completion: completionPercentage })}</p>

      {/* General Information */}
      <h2 className="text-lg font-semibold mb-4">{t("review_and_edit")}</h2>
      <div className="mb-4">
        <label className="block mb-2 font-semibold">{t("general.date")}</label>
        <input
          type="date"
          name="date"
          value={formData.date || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">{t("general.err_id")}</label>
        <input
          type="text"
          name="err_id"
          value={formData.err_id || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Expenses Section */}
      <h3 className="text-md font-semibold mt-6 mb-2">{t("expenses.title")}</h3>
      {formData.expenses && formData.expenses.length > 0 ? (
        formData.expenses.map((expense, index) => (
          <div key={index} className="mb-4 p-3 border rounded bg-gray-50 space-y-2">
            {Object.keys(expense).map((key) => (
              <label key={key}>
                {t(`expenses.${key}`)}
                <input
                  type={key === "payment_date" ? "date" : "text"} // Render calendar picker for payment_date
                  name={key}
                  value={expense[key] || ""}
                  onChange={(e) => handleExpenseChange(index, e)}
                  className="w-full p-2 border rounded"
                />
              </label>
            ))}
          </div>
        ))
      ) : (
        <p>{t("expenses.no_expenses")}</p>
      )}

      {/* Financial Summary */}
      <h3 className="text-md font-semibold mt-6 mb-2">{t("financial_summary.title")}</h3>
      <div className="space-y-4">
        {Object.keys(formData.financial_summary || {}).map((key) => (
          <label key={key}>
            {t(`financial_summary.${key}`)}
            <input
              type="text"
              name={key}
              value={formData.financial_summary?.[key] || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </label>
        ))}
      </div>

      {/* Additional Questions */}
      <h3 className="text-md font-semibold mt-6 mb-2">{t("additional_questions.title")}</h3>
      <div className="space-y-4">
        {Object.keys(formData.additional_questions || {}).map((key) => (
          <label key={key}>
            {t(`additional_questions.${key}`)}
            <textarea
              name={key}
              value={formData.additional_questions?.[key] || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </label>
        ))}
      </div>

      {/* Unused Text Section */}
      {formData.unused_text && (
        <div className="mt-6">
          <Button
            text={t(showUnusedText ? "buttons.hide_unused_text" : "buttons.show_unused_text")}
            onClick={() => setShowUnusedText(!showUnusedText)}
          />
          {showUnusedText && (
            <div className="bg-gray-100 p-4 rounded mt-4">
              <h3 className="text-md font-semibold">{t("unused_text_title")}</h3>
              <p>
                <strong>{t("likely_ocr_errors")}:</strong> {formData.unused_text?.likely_ocr_errors || t("no_data_available")}
              </p>
              <p>
                <strong>{t("potentially_useful_information")}:</strong> {formData.unused_text?.potentially_useful_information || t("no_data_available")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6">
        <Button
          text={isSubmitting ? t("buttons.submitting") : t("buttons.submit")}
          onClick={handleSubmit}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
};

export default CustomFormReview;




