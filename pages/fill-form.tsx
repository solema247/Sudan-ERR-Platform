// pages/fill-form.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FormBubble from '../components/FormBubble';
import MessageBubble from '../components/MessageBubble';
import Button from '../components/Button';
import i18n from '../lib/i18n'; // Ensure this is properly imported

const FillForm: React.FC<{ 
    project: any | null; 
    onReturnToMenu: () => void; 
    onSubmitAnotherForm: () => void; 
}> = ({ project, onReturnToMenu, onSubmitAnotherForm }) => {
    const { t } = useTranslation('fillForm'); // Use translations for the "fill-form" namespace
    const [expenses, setExpenses] = useState([
        { activity: '', description: '', payment_date: '', seller: '', payment_method: 'cash', receipt_no: '', amount: '' },
        { activity: '', description: '', payment_date: '', seller: '', payment_method: 'cash', receipt_no: '', amount: '' },
        { activity: '', description: '', payment_date: '', seller: '', payment_method: 'cash', receipt_no: '', amount: '' }
    ]);
    const [file, setFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        date: '',
        err_id: '',
        total_grant: '',
        total_other_sources: '',
        additional_excess_expenses: '',
        additional_surplus_use: '',
        additional_training_needs: '',
        lessons: ''
    });
    const [formSubmitted, setFormSubmitted] = useState(false);

    // Get the current language
    const currentLanguage = i18n.language;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleExpenseChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newExpenses = [...expenses];
        newExpenses[index] = { ...newExpenses[index], [name]: value };
        setExpenses(newExpenses);
    };

    const addExpenseCard = () => {
        setExpenses([...expenses, { activity: '', description: '', payment_date: '', seller: '', payment_method: 'cash', receipt_no: '', amount: '' }]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
        }
    };

    const isExpenseComplete = (expense: any) => {
        return (
            expense.activity && expense.description && expense.payment_date && expense.seller &&
            expense.receipt_no && expense.amount && expense.payment_method
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.err_id || !formData.date || !formData.total_grant || !formData.total_other_sources) {
            alert(t('requiredFieldsAlert'));
            return;
        }

        const completedExpenses = expenses.filter(isExpenseComplete);

        const fileContent = file ? await file.arrayBuffer() : null;
        const submissionData = {
            ...formData,
            expenses: completedExpenses,
            file: file ? { name: file.name, type: file.type, content: Buffer.from(fileContent!).toString('base64') } : null,
            language: currentLanguage // Include the current language dynamically
        };

        const response = await fetch('/api/fill-form', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData)
        });

        if (response.ok) {
            setFormSubmitted(true);
        } else {
            alert(t('submissionFailed'));
        }
    };

    return (
        <>
            {!formSubmitted ? (
                <FormBubble>
                    <form onSubmit={handleSubmit} className="space-y-3 bg-white p-2 rounded-lg">
                        <label>
                            {t('errId')}
                            <input
                                type="text"
                                name="err_id"
                                onChange={handleInputChange}
                                value={formData.err_id}
                                required
                                className="w-full p-2 border rounded"
                                placeholder={t('errId')}
                            />
                        </label>
                        <label>
                            {t('date')}
                            <input
                                type="date"
                                name="date"
                                onChange={handleInputChange}
                                value={formData.date}
                                required
                                className="w-full p-2 border rounded"
                            />
                        </label>

                        <div className="swipeable-cards flex overflow-x-auto space-x-2 max-w-full">
                            {expenses.map((expense, index) => (
                                <div key={index} className="min-w-[200px] p-4 rounded bg-gray-50">
                                    <h4>{t('expenseEntry', { index: index + 1 })}</h4>
                                    <label>{t('activity')}
                                        <input
                                            type="text"
                                            name="activity"
                                            value={expense.activity}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                            placeholder={t('activity')}
                                        />
                                    </label>
                                    <label>{t('description')}
                                        <input
                                            type="text"
                                            name="description"
                                            value={expense.description}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                            placeholder={t('description')}
                                        />
                                    </label>
                                    <label>{t('paymentDate')}
                                        <input
                                            type="date"
                                            name="payment_date"
                                            value={expense.payment_date}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                        />
                                    </label>
                                    <div className="mb-2">
                                        <label>{t('seller')}</label>
                                        <input
                                            type="text"
                                            name="seller"
                                            value={expense.seller}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                            placeholder={t('seller')}
                                        />
                                    </div>
                                    <label>{t('paymentMethod')}
                                        <select
                                            name="payment_method"
                                            value={expense.payment_method}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                        >
                                            <option value="cash">{t('cash')}</option>
                                            <option value="bank app">{t('bankApp')}</option>
                                        </select>
                                    </label>
                                    <label>{t('receiptNo')}
                                        <input
                                            type="text"
                                            name="receipt_no"
                                            value={expense.receipt_no}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                            placeholder={t('receiptNo')}
                                        />
                                    </label>
                                    <label>{t('amount')}
                                        <input
                                            type="number"
                                            name="amount"
                                            value={expense.amount}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                            placeholder={t('amount')}
                                        />
                                    </label>
                                </div>
                            ))}
                        </div>
                        <Button text={t('addExpense')} onClick={addExpenseCard} />
                        <div className="w-full mt-4">
                            <input
                                type="number"
                                name="total_grant"
                                onChange={handleInputChange}
                                value={formData.total_grant}
                                required
                                className="w-full p-2 border rounded"
                                placeholder={t('totalGrant')}
                            />
                        </div>
                        <input
                            type="number"
                            name="total_other_sources"
                            onChange={handleInputChange}
                            value={formData.total_other_sources}
                            required
                            className="w-full p-2 border rounded"
                            placeholder={t('totalOtherSources')}
                        />
                        <textarea
                            name="additional_excess_expenses"
                            onChange={handleInputChange}
                            value={formData.additional_excess_expenses}
                            className="w-full p-2 border rounded"
                            placeholder={t('excessExpenses')}
                        />
                        <textarea
                            name="additional_surplus_use"
                            onChange={handleInputChange}
                            value={formData.additional_surplus_use}
                            className="w-full p-2 border rounded"
                            placeholder={t('surplusUse')}
                        />
                        <textarea
                            name="additional_training_needs"
                            onChange={handleInputChange}
                            value={formData.additional_training_needs}
                            className="w-full p-2 border rounded"
                            placeholder={t('trainingNeeds')}
                        />
                        <textarea
                            name="lessons"
                            onChange={handleInputChange}
                            value={formData.lessons}
                            className="w-full p-2 border rounded"
                            placeholder={t('lessonsLearned')}
                        />

                        <div className="flex flex-col space-y-2">
                            <label className="bg-primaryGreen text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all cursor-pointer inline-flex items-center justify-center">
                                {t('chooseFile')}
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            {file && <span className="text-gray-600">{file.name}</span>}
                        </div>

                        <Button text={t('submit')} type="submit" />
                    </form>
                </FormBubble>
            ) : (
                <>
                    <div>
                        {t('formSuccess')}
                    </div>

                    <div className="flex justify-center space-x-4 mt-2">
                        <Button text={t('submitAnother')} onClick={onSubmitAnotherForm} />
                        <Button text={t('returnToMenu')} onClick={onReturnToMenu} />
                    </div>
                </>
            )}
        </>
    );
};

export default FillForm;


