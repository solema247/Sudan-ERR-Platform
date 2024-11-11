// components/OfflineForm.tsx
import React, { useState, useEffect } from 'react';
import { Buffer } from 'buffer'; 

interface OfflineFormProps {
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const OfflineForm: React.FC<OfflineFormProps> = ({ onClose, onSubmitSuccess }) => {
  const [formData, setFormData] = useState({
    err_id: '',
    date: '',
    total_grant: '',
    total_other_sources: '',
    additional_excess_expenses: '',
    additional_surplus_use: '',
    additional_training_needs: '',
    lessons: '',
    expenses: [
      { activity: '', description: '', payment_date: '', seller: '', payment_method: 'cash', receipt_no: '', amount: '' },
    ],
  });

  const [file, setFile] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleExpenseChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedExpenses = [...formData.expenses];
    updatedExpenses[index] = { ...updatedExpenses[index], [name]: value };
    setFormData({ ...formData, expenses: updatedExpenses });
  };

  const addExpenseCard = () => {
    setFormData({
      ...formData,
      expenses: [
        ...formData.expenses,
        { activity: '', description: '', payment_date: '', seller: '', payment_method: 'cash', receipt_no: '', amount: '' },
      ],
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  // Add the handleSubmit function
  const handleSubmit = async () => {
    // Encode the file if it exists
    const fileContent = file ? await file.arrayBuffer() : null;
    const encodedFile = file
      ? {
          name: file.name,
          type: file.type,
          content: Buffer.from(fileContent!).toString('base64'),
        }
      : null;

    const offlineData = {
      formData: { ...formData, expenses: undefined }, 
      expenses: formData.expenses,
      file: encodedFile,
    };

    if (navigator.onLine) {
      // Attempt immediate submission if online
      fetch('/api/offline-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offlineData),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.message === 'Form submitted successfully!') { 
            alert('Form submitted successfully!');
            onSubmitSuccess();
          } else {
            alert('Submission failed, please try again later.');
          }
        })
        .catch(() => {
          alert('Error occurred during submission.');
        });
    } else {
      // Queue data if offline
      const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
      offlineQueue.push(offlineData);
      localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
      alert('Form saved offline and will be submitted when you are back online.');
      onClose();
    }
  };


  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-start">
      <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-lg overflow-y-auto max-h-screen">
        <h2 className="text-xl font-semibold mb-1">Offline Form</h2>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <input 
            type="text" 
            name="err_id" 
            onChange={handleInputChange} 
            value={formData.err_id} 
            placeholder="ERR ID (required)" 
            required 
            className="w-full p-1 border rounded mb-2" 
          />
          <label className="block mb-1">Date (required)</label>
          <input 
            type="date" 
            name="date" 
            onChange={handleInputChange} 
            value={formData.date} 
            required 
            className="w-full p-1 border rounded mb-2" 
          />
          {formData.expenses.map((expense, index) => (
            <div key={index} className="mb-2 p-2 bg-gray-50 rounded">
              <h4 className="text-lg font-medium mb-1">Expense Entry {index + 1}</h4>
              <input 
                type="text" 
                name="activity" 
                value={expense.activity} 
                onChange={(e) => handleExpenseChange(index, e)} 
                placeholder="Activity" 
                className="w-full p-1 border rounded mb-1" 
              />
              <input 
                type="text" 
                name="description" 
                value={expense.description} 
                onChange={(e) => handleExpenseChange(index, e)} 
                placeholder="Description" 
                className="w-full p-1 border rounded mb-1" 
              />
              <label className="block mb-1">Payment Date</label>
              <input 
                type="date" 
                name="payment_date" 
                value={expense.payment_date} 
                onChange={(e) => handleExpenseChange(index, e)} 
                className="w-full p-1 border rounded mb-1" 
              />
              <input 
                type="text" 
                name="seller" 
                value={expense.seller} 
                onChange={(e) => handleExpenseChange(index, e)} 
                placeholder="Seller" 
                className="w-full p-1 border rounded mb-1" 
              />
              <select 
                name="payment_method" 
                value={expense.payment_method} 
                onChange={(e) => handleExpenseChange(index, e)} 
                className="w-full p-1 border rounded mb-1"
              >
                <option value="cash">Cash</option>
                <option value="bank app">Bank App</option>
              </select>
              <input 
                type="text" 
                name="receipt_no" 
                value={expense.receipt_no} 
                onChange={(e) => handleExpenseChange(index, e)} 
                placeholder="Receipt No." 
                className="w-full p-1 border rounded mb-1" 
              />
              <input 
                type="number" 
                name="amount" 
                value={expense.amount} 
                onChange={(e) => handleExpenseChange(index, e)} 
                placeholder="Amount" 
                className="w-full p-1 border rounded mb-1" 
              />
            </div>
          ))}
          <button type="button" onClick={addExpenseCard} className="bg-blue-500 text-white py-1 px-3 rounded mb-2">Add Expense</button>
          <input 
            type="number" 
            name="total_grant" 
            onChange={handleInputChange} 
            value={formData.total_grant} 
            placeholder="Total Grant" 
            className="w-full p-1 border rounded mb-2" 
          />
          <input 
            type="number" 
            name="total_other_sources" 
            onChange={handleInputChange} 
            value={formData.total_other_sources} 
            placeholder="Total Other Sources" 
            className="w-full p-1 border rounded mb-2" 
          />
          <textarea 
            name="additional_excess_expenses" 
            onChange={handleInputChange} 
            value={formData.additional_excess_expenses} 
            placeholder="How did you cover excess expenses?" 
            className="w-full p-1 border rounded mb-2" 
          />
          <textarea 
            name="additional_surplus_use" 
            onChange={handleInputChange} 
            value={formData.additional_surplus_use} 
            placeholder="How would you spend the surplus?" 
            className="w-full p-1 border rounded mb-2" 
          />
          <textarea 
            name="additional_training_needs" 
            onChange={handleInputChange} 
            value={formData.additional_training_needs} 
            placeholder="Additional training needs" 
            className="w-full p-1 border rounded mb-2" 
          />
          <textarea 
            name="lessons" 
            onChange={handleInputChange} 
            value={formData.lessons} 
            placeholder="Lessons learned in budget planning" 
            className="w-full p-1 border rounded mb-2" 
          />
          <input 
            type="file" 
            onChange={handleFileChange} 
            className="w-full p-1 border rounded mb-2" 
          />
          <div className="flex justify-end space-x-2 mt-3">
            <button type="button" onClick={onClose} className="bg-gray-400 text-white py-1 px-3 rounded">Close</button>
            <button type="submit" className="bg-green-500 text-white py-1 px-3 rounded">Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfflineForm;
