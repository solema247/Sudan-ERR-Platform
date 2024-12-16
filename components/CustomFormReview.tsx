//components/CustomFormReview.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Button from "./ui/Button";

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
    project?: {
      id: string;
      project_objectives: string;
      locality: string;
    };
  };
  onSubmit: (formData: any) => void;
}

const CustomFormReview: React.FC<CustomFormReviewProps> = ({ data, onSubmit }) => {
  const { t } = useTranslation("customScanForm");
  const [formData, setFormData] = useState(data);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
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
        if (
          value &&
          value !== "" &&
          value !== "غير متوفر" &&
          value !== "Not available"
        ) {
          if (key.includes("date")) {
            const isValidDate = !isNaN(Date.parse(value));
            if (isValidDate) completedFields++;
          } else {
            completedFields++;
          }
        }
      });
    };

    checkFields({ date: formData.date, err_id: formData.err_id });

    if (formData.financial_summary) checkFields(formData.financial_summary);

    if (formData.additional_questions) checkFields(formData.additional_questions);

    if (formData.expenses && formData.expenses.length > 0) {
      formData.expenses.forEach((expense) => checkFields(expense));
    } else {
      totalFields++;
    }

    return Math.round((completedFields / totalFields) * 100);
  };

  useEffect(() => {
    setCompletionPercentage(calculateCompletion());
  }, [formData]);

  // Handle general field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name in (formData.financial_summary || {})) {
      setFormData((prevState) => ({
        ...prevState,
        financial_summary: {
          ...prevState.financial_summary,
          [name]: value,
        },
      }));
    } else {
      setFormData((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    }
  };

  // Handle expense field changes
  const handleExpenseChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
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
      const response = await fetch("/api/submit-custom-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error submitting the form:", errorText);
        alert(t("errors.submit_failed"));
        return;
      }

      const result = await response.json();
      console.log("Form submitted successfully:", result);

      setFormSubmitted(true);
      onSubmit(formData);
    } catch (error) {
      console.error("Error during form submission:", error);
      alert(t("errors.internal_server_error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded">
      {/* Project Information */}
      {formData.project && (
        <div className="mb-4 p-3 border rounded bg-gray-50">
          <h3 className="text-md font-semibold">{t("project_details.title")}</h3>
          <p>
            <strong>{t("project_details.objectives")}:</strong>{" "}
            {formData.project.project_objectives}
          </p>
          <p>
            <strong>{t("project_details.locality")}:</strong>{" "}
            {formData.project.locality}
          </p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
        <div
          className="bg-green-500 h-4 rounded-full transition-all"
          style={{ width: `${completionPercentage}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-700 mb-4">
        {t("completion", { completion: completionPercentage })}
      </p>

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
                  type={key === "payment_date" ? "date" : "text"}
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
            text={t(
              showUnusedText ? "buttons.hide_unused_text" : "buttons.show_unused_text"
            )}
            onClick={() => setShowUnusedText(!showUnusedText)}
          />
          {showUnusedText && (
            <div className="bg-gray-100 p-4 rounded mt-4">
              <h3 className="text-md font-semibold">{t("unused_text_title")}</h3>
              <p>
                <strong>{t("likely_ocr_errors")}:</strong>{" "}
                {formData.unused_text?.likely_ocr_errors || t("no_data_available")}
              </p>
              <p>
                <strong>{t("potentially_useful_information")}:</strong>{" "}
                {formData.unused_text?.potentially_useful_information || t("no_data_available")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6">
        <Button
          text={
            formSubmitted
              ? t("buttons.submitted")
              : isSubmitting
              ? t("buttons.submitting")
              : t("buttons.submit")
          }
          onClick={handleSubmit}
          disabled={isSubmitting || formSubmitted}
        />
      </div>
    </div>
  );
};

export default CustomFormReview;





