import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FormBubble from '../components/ui/FormBubble';
import Button from '../components/ui/Button';
import i18n from '../lib/i18n';
import { uploadImageAndInsertRecord, ImageCategory } from '../lib/uploadImageAndInsertRecord';
import { createClient } from '@supabase/supabase-js'; // Import Supabase client

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 *  Fill form
 * 
 * Submits an F4 form, uploads accompanying images with image records
 * 
 * TODO: Sturdier bucket paths, using presets and enums to ease future development
 * TODO: Better dynamic activity form
 */

interface FillFormProps {
    project: any | null; 
    onReturnToMenu: () => void; 
    onSubmitAnotherForm: () => void; 
}

const FillForm: React.FC<FillFormProps> = ({ project, onReturnToMenu, onSubmitAnotherForm }) => {
    const { t } = useTranslation('fillForm');
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
    const [categories, setCategories] = useState<{ id: string, name: string, language: string }[]>([]);
    const currentLanguage = i18n.language;

    useEffect(() => {
        const fetchCategories = async () => {
            const { data, error } = await supabase
                .from('expense_categories')
                .select('id, name, language')
                .eq('language', 'en');

            if (error) {
                console.error('Error fetching categories:', error);
            } else {
                console.log('Fetched categories:', data);
                setCategories(data);
            }
        };

        fetchCategories();
    }, []);

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
            const selectedFile = e.target.files[0];
            if (selectedFile.size > MAX_FILE_SIZE) {
                alert(t('fileTooBig', { size: '10MB' }));
                e.target.value = ''; // Reset the input
                return;
            }
            setFile(selectedFile);
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

        try {
            if (!formData.err_id || !formData.date || !formData.total_grant || !formData.total_other_sources) {
                alert(t('requiredFieldsAlert'));
                return;
            }

            const completedExpenses = expenses.filter(isExpenseComplete);
            let projectId = project.id;
            if (!projectId) {
                throw new Error('Trouble finding a projectId to file the image under');
            }

            let uploadImageResult = await uploadImageAndInsertRecord(file, ImageCategory.FORM_FILLED, projectId, "Filled expense form.")

            // Submit form data 
            const submissionData = {
                ...formData,
                expenses: completedExpenses,
                language: currentLanguage
            };

            const response = await fetch('/api/fill-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });

            if (!response.ok) {
                throw new Error('Submission failed');
            }

            setFormSubmitted(true);
        } catch (error) {
            console.error('Error submitting form:', error);
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
                                        <select
                                            name="activity"
                                            value={expense.activity}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                        >
                                            <option value="">{t('pleaseSelect')}</option>
                                            {categories.map(category => (
                                                <option key={category.id} value={category.name}>
                                                    {t(`categories.${category.name}`)}
                                                </option>
                                            ))}
                                        </select>
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


