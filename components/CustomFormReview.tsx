//components/CustomFormReview.tsx
import React, { useState, useEffect } from "react";
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
        if (
          value &&
          value !== "" &&
          value !== "غير متوفر" && // Exclude "غير متوفر" as incomplete
          value !== "Not available"
        ) {
          completedFields++;
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
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
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
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting form:", error);
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
      <p className="text-sm text-gray-700 mb-4">{`Completion: ${completionPercentage}%`}</p>

      {/* General Information */}
      <h2 className="text-lg font-semibold mb-4">Review and Edit Form</h2>
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Date</label>
        <input
          type="date"
          name="date"
          value={formData.date || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-2 font-semibold">ERR ID</label>
        <input
          type="text"
          name="err_id"
          value={formData.err_id || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Expenses Section */}
      <h3 className="text-md font-semibold mt-6 mb-2">Expenses</h3>
      {formData.expenses && formData.expenses.length > 0 ? (
        formData.expenses.map((expense, index) => (
          <div key={index} className="mb-4 p-3 border rounded bg-gray-50 space-y-2">
            <label>
              Activity
              <input
                type="text"
                name="activity"
                value={expense.activity || ""}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Description
              <input
                type="text"
                name="description"
                value={expense.description || ""}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Payment Date
              <input
                type="date"
                name="payment_date"
                value={expense.payment_date || ""}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Seller
              <input
                type="text"
                name="seller"
                value={expense.seller || ""}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Payment Method
              <select
                name="payment_method"
                value={expense.payment_method || ""}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              >
                <option value="cash">Cash</option>
                <option value="bank_app">Bank App</option>
              </select>
            </label>
            <label>
              Receipt No.
              <input
                type="text"
                name="receipt_no"
                value={expense.receipt_no || ""}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Amount
              <input
                type="number"
                name="amount"
                value={expense.amount || ""}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
          </div>
        ))
      ) : (
        <p>No expenses available.</p>
      )}

      {/* Financial Summary */}
      <h3 className="text-md font-semibold mt-6 mb-2">Financial Summary</h3>
      <div className="space-y-4">
        <label>Total Expenses</label>
        <input
          type="number"
          name="total_expenses"
          value={formData.financial_summary?.total_expenses || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
        <label>Total Grant Received</label>
        <input
          type="number"
          name="total_grant_received"
          value={formData.financial_summary?.total_grant_received || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
        <label>Total Other Sources</label>
        <input
          type="number"
          name="total_other_sources"
          value={formData.financial_summary?.total_other_sources || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
        <label>Remainder</label>
        <input
          type="number"
          name="remainder"
          value={formData.financial_summary?.remainder || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Additional Questions */}
      <h3 className="text-md font-semibold mt-6 mb-2">Additional Questions</h3>
      <div className="space-y-4">
        <label>Excess Expenses</label>
        <textarea
          name="excess_expenses"
          value={formData.additional_questions?.excess_expenses || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
        <label>Surplus Use</label>
        <textarea
          name="surplus_use"
          value={formData.additional_questions?.surplus_use || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
        <label>Lessons Learned</label>
        <textarea
          name="lessons_learned"
          value={formData.additional_questions?.lessons_learned || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
        <label>Training Needs</label>
        <textarea
          name="training_needs"
          value={formData.additional_questions?.training_needs || ""}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
        />
      </div>

      {/* Unused Text Section */}
      {formData.unused_text && (
        <div className="mt-6">
          <Button
            text={showUnusedText ? "Hide Unused Text" : "Show Unused Text"}
            onClick={() => setShowUnusedText(!showUnusedText)}
          />
          {showUnusedText && (
            <div className="bg-gray-100 p-4 rounded mt-4">
              <h3 className="text-md font-semibold">Unused Text</h3>
              <p>
                <strong>Likely OCR Errors:</strong> {formData.unused_text?.likely_ocr_errors || "None"}
              </p>
              <p>
                <strong>Potentially Useful Information:</strong>{" "}
                {formData.unused_text?.potentially_useful_information || "None"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6">
        <Button
          text={isSubmitting ? "Submitting..." : "Submit"}
          onClick={handleSubmit}
          disabled={isSubmitting}
        />
      </div>
    </div>
  );
};

export default CustomFormReview;



