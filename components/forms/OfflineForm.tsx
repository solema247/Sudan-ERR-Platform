// components/OfflineForm.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addFormToSessionQueue } from '../../services/sessionUtils';
import { supabase } from '../../services/supabaseClient';

interface OfflineFormProps {
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const OfflineForm: React.FC<OfflineFormProps> = ({ onClose, onSubmitSuccess }) => {
  const { t, i18n } = useTranslation('offlineMode');
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
      console.log('File selected:', e.target.files[0].name);
    }
  };

  const validateFormData = () => {
    if (!formData.err_id || !formData.date) {
      alert(t('form_validation_error'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateFormData()) return;

    const offlineData = {
      formData: { ...formData, expenses: undefined },
      expenses: formData.expenses,
      file: file ? {
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        // Store file as object URL for offline storage
        objectUrl: URL.createObjectURL(file)
      } : null
    };

    if (navigator.onLine) {
      console.log('Submitting form online:', offlineData);

      fetch('/api/offline-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offlineData),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.message === t('form_submit_success')) {
            alert(t('form_submit_success'));
            onSubmitSuccess();
          } else {
            alert(t('submission_failed'));
          }
        })
        .catch((error) => {
          console.error('Error during submission:', error);
          alert(t('error_during_submission'));
        });
    } else {
      console.log('Saving form offline:', offlineData);

      addFormToSessionQueue(offlineData);
      alert(t('form_saved_offline'));
      onClose();
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex justify-center items-start">
      <div className="bg-white p-4 rounded-lg shadow-lg w-full max-w-lg overflow-y-auto max-h-screen">
        <h2 className="text-xl font-semibold mb-1">{t('offline_form_title')}</h2>
        <div className="flex justify-center space-x-4 mb-4">
          <button onClick={() => changeLanguage('en')} className="mx-2 text-blue-500 underline">
            English
          </button>
          <button onClick={() => changeLanguage('ar')} className="mx-2 text-blue-500 underline">
            العربية
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <input
            type="text"
            name="err_id"
            onChange={handleInputChange}
            value={formData.err_id}
            placeholder={t('placeholders.err_id')}
            required
            className="w-full p-1 border rounded mb-2"
          />
          <label className="block mb-1">{t('labels.date')}</label>
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
              <h4 className="text-lg font-medium mb-1">{t('expense_entry', { index: index + 1 })}</h4>
              <input
                type="text"
                name="activity"
                value={expense.activity}
                onChange={(e) => handleExpenseChange(index, e)}
                placeholder={t('placeholders.activity')}
                className="w-full p-1 border rounded mb-1"
              />
              <input
                type="text"
                name="description"
                value={expense.description}
                onChange={(e) => handleExpenseChange(index, e)}
                placeholder={t('placeholders.description')}
                className="w-full p-1 border rounded mb-1"
              />
              <label className="block mb-1">{t('labels.payment_date')}</label>
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
                placeholder={t('placeholders.seller')}
                className="w-full p-1 border rounded mb-1"
              />
              <select
                name="payment_method"
                value={expense.payment_method}
                onChange={(e) => handleExpenseChange(index, e)}
                className="w-full p-1 border rounded mb-1"
              >
                <option value="cash">{t('payment_methods.cash')}</option>
                <option value="bank app">{t('payment_methods.bank_app')}</option>
              </select>
              <input
                type="text"
                name="receipt_no"
                value={expense.receipt_no}
                onChange={(e) => handleExpenseChange(index, e)}
                placeholder={t('placeholders.receipt_no')}
                className="w-full p-1 border rounded mb-1"
              />
              <input
                type="number"
                name="amount"
                value={expense.amount}
                onChange={(e) => handleExpenseChange(index, e)}
                placeholder={t('placeholders.amount')}
                className="w-full p-1 border rounded mb-1"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={addExpenseCard}
            className="bg-primaryGreen text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all mb-2"
          >
            {t('add_expense')}
          </button>
          <input
            type="number"
            name="total_grant"
            onChange={handleInputChange}
            value={formData.total_grant}
            placeholder={t('placeholders.total_grant')}
            className="w-full p-1 border rounded mb-2"
          />
          <input
            type="number"
            name="total_other_sources"
            onChange={handleInputChange}
            value={formData.total_other_sources}
            placeholder={t('placeholders.total_other_sources')}
            className="w-full p-1 border rounded mb-2"
          />
          <textarea
            name="additional_excess_expenses"
            onChange={handleInputChange}
            value={formData.additional_excess_expenses}
            placeholder={t('placeholders.additional_excess_expenses')}
            className="w-full p-1 border rounded mb-2"
          />
          <textarea
            name="additional_surplus_use"
            onChange={handleInputChange}
            value={formData.additional_surplus_use}
            placeholder={t('placeholders.additional_surplus_use')}
            className="w-full p-1 border rounded mb-2"
          />
          <textarea
            name="additional_training_needs"
            onChange={handleInputChange}
            value={formData.additional_training_needs}
            placeholder={t('placeholders.additional_training_needs')}
            className="w-full p-1 border rounded mb-2"
          />
          <textarea
            name="lessons"
            onChange={handleInputChange}
            value={formData.lessons}
            placeholder={t('placeholders.lessons')}
            className="w-full p-1 border rounded mb-2"
          />
          <label className="bg-primaryGreen text-white py-2 px-4 rounded-lg cursor-pointer hover:bg-green-700 transition-all inline-flex items-center mb-2">
            {t('choose_file')}
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <span className="text-gray-600 ml-2">{file ? file.name : t('no_file_chosen')}</span>
          <div className="flex justify-end space-x-4 mt-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-primaryGreen text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all"
            >
              {t('close')}
            </button>
            <button
              type="submit"
              className="bg-primaryGreen text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all"
            >
              {t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OfflineForm;

