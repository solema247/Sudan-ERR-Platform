// components/PrefilledForm.tsx

import React, { useState } from 'react';
import { useRouter } from 'next/router';

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
  onFormSubmit: () => void; // New callback prop for form submission
}

const PrefilledForm: React.FC<PrefilledFormProps> = ({ data, onFormSubmit }) => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    date: data.date || '',
    err_id: data.err_id || '',
    expenses: data.expenses || [],
    total_grant: data.total_grant || '',
    total_other_sources: data.total_other_sources || '',
    total_expenses: data.total_expenses || '',
    remainder: data.remainder || '',
    additional_excess_expenses: data.additional_excess_expenses || '',
    additional_surplus_use: data.additional_surplus_use || '',
    lessons_learned: data.lessons_learned || '',
    additional_training_needs: data.additional_training_needs || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleExpenseChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newExpenses = [...formData.expenses];
    newExpenses[index] = { ...newExpenses[index], [name]: value };
    setFormData({ ...formData, expenses: newExpenses });
  };

  //Components/PreFilledForm.tsx
  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/submit-prefilled-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Server Error: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Form submitted successfully:', result.message);

      // Call the onFormSubmit callback to trigger the next step
      onFormSubmit();

    } catch (error) {
      console.error('Failed to submit form:', error);
      alert('An error occurred while submitting the form.');
    }
  };


  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow-md">
      <label>
        ERR ID
        <input
          type="text"
          name="err_id"
          onChange={handleInputChange}
          value={formData.err_id}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>
        Date
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
            <h4>Expense Entry {index + 1}</h4>
            <label>
              Activity
              <input
                type="text"
                name="activity"
                value={expense.activity}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Description
              <input
                type="text"
                name="description"
                value={expense.description}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Payment Date
              <input
                type="date"
                name="payment_date"
                value={expense.payment_date}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Seller
              <input
                type="text"
                name="seller"
                value={expense.seller}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Payment Method
              <select
                name="payment_method"
                value={expense.payment_method}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              >
                <option value="cash">Cash</option>
                <option value="bank app">Bank App</option>
              </select>
            </label>
            <label>
              Receipt No.
              <input
                type="text"
                name="receipt_no"
                value={expense.receipt_no}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-2 border rounded"
              />
            </label>
            <label>
              Amount
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

      <label>Total Grant
        <input
          type="number"
          name="total_grant"
          onChange={handleInputChange}
          value={formData.total_grant}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>Total Other Sources
        <input
          type="number"
          name="total_other_sources"
          onChange={handleInputChange}
          value={formData.total_other_sources}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>How did you cover excess expenses?
        <textarea
          name="additional_excess_expenses"
          onChange={handleInputChange}
          value={formData.additional_excess_expenses}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>How would you spend the surplus?
        <textarea
          name="additional_surplus_use"
          onChange={handleInputChange}
          value={formData.additional_surplus_use}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>Additional training needs
        <textarea
          name="additional_training_needs"
          onChange={handleInputChange}
          value={formData.additional_training_needs}
          className="w-full p-2 border rounded"
        />
      </label>
      <label>Lessons learned in budget planning
        <textarea
          name="lessons_learned"
          onChange={handleInputChange}
          value={formData.lessons_learned}
          className="w-full p-2 border rounded"
        />
      </label>

      <button
        onClick={handleSubmit}
        className="bg-blue-500 text-white py-2 px-4 rounded"
      >
        Submit Form
      </button>
    </div>
  );
};

export default PrefilledForm;

