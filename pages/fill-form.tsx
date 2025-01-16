import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FormBubble from '../components/ui/FormBubble';
import Button from '../components/ui/Button';
import i18n from '../services/i18n';
import { uploadImageAndInsertRecord, ImageCategory } from '../services/uploadImageAndInsertRecord';
import { createClient } from '@supabase/supabase-js'; // Import Supabase client
import { FormLabel } from '../components/ui/FormBubble';
import ReceiptUploader from '../components/uploads/ReceiptUploader';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

/**
 *  Fill form
 * 
 * Submits an F4 (reporting) form, uploads accompanying images with image records
 * 
 * TODO: Better dynamic activity form
 * TODO: Convert to Formik for easier management and for consistency with the F1 form. https://formik.org
 */

interface FillFormProps {
    project: any | null; 
    onReturnToMenu: () => void; 
    onSubmitAnotherForm: () => void; 
}

// Add this interface for form errors
interface FormErrors {
    err_id?: string;
    date?: string;
    total_grant?: string;
    total_other_sources?: string;
    expenses: {
        [key: number]: {
            activity?: string;
            description?: string;
            payment_date?: string;
            seller?: string;
            payment_method?: string;
            receipt_no?: string;
            amount?: string;
        };
    };
}

const FillForm: React.FC<FillFormProps> = ({ project, onReturnToMenu, onSubmitAnotherForm }) => {
    const { t } = useTranslation('fillForm');
    const [expenses, setExpenses] = useState([
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
        lessons: '',
        phone_number: '',
        banking_details: ''
    });
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [categories, setCategories] = useState<{ id: string, name: string, language: string }[]>([]);
    const currentLanguage = i18n.language;
    const [errors, setErrors] = useState<FormErrors>({
        expenses: {}
    });
    const [receiptUploads, setReceiptUploads] = useState<{ [key: number]: string }>({});
    const [receiptFiles, setReceiptFiles] = useState<{ [key: number]: File }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    // Add validation function
    const validateField = (name: string, value: string) => {
        let fieldError = '';
        
        switch (name) {
            case 'err_id':
                if (!value) fieldError = t('errorMessages.required');
                break;
            case 'date':
                if (!value) fieldError = t('errorMessages.required');
                break;
            case 'total_grant':
                if (!value) fieldError = t('errorMessages.required');
                else if (isNaN(Number(value)) || Number(value) < 0) 
                    fieldError = t('errorMessages.invalidNumber');
                break;
            case 'total_other_sources':
                if (!value) fieldError = t('errorMessages.required');
                else if (isNaN(Number(value)) || Number(value) < 0) 
                    fieldError = t('errorMessages.invalidNumber');
                break;
        }
        
        return fieldError;
    };

    // Update handleInputChange to include validation
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        
        const fieldError = validateField(name, value);
        setErrors(prev => ({
            ...prev,
            [name]: fieldError
        }));
    };

    // Add validation for expense fields
    const validateExpenseField = (name: string, value: string) => {
        let fieldError = '';
        
        switch (name) {
            case 'activity':
            case 'description':
            case 'payment_date':
            case 'seller':
            case 'payment_method':
            case 'receipt_no':
                if (!value) fieldError = t('errorMessages.required');
                break;
            case 'amount':
                if (!value) fieldError = t('errorMessages.required');
                else if (isNaN(Number(value)) || Number(value) < 0) 
                    fieldError = t('errorMessages.invalidNumber');
                break;
        }
        
        return fieldError;
    };

    // Update handleExpenseChange to include validation
    const handleExpenseChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newExpenses = [...expenses];
        newExpenses[index] = { ...newExpenses[index], [name]: value };
        setExpenses(newExpenses);

        // Add validation
        const fieldError = validateExpenseField(name, value);
        setErrors(prev => ({
            ...prev,
            expenses: {
                ...prev.expenses,
                [index]: {
                    ...prev.expenses[index],
                    [name]: fieldError
                }
            }
        }));
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

    const isExpenseComplete = (expense: any, index: number) => {
        return (
            expense.activity && 
            expense.description && 
            expense.payment_date && 
            expense.seller &&
            expense.receipt_no && 
            expense.amount && 
            expense.payment_method &&
            receiptFiles[index] // Check if file exists for this expense
        );
    };

    const handleFileSelect = (index: number, file: File) => {
        setReceiptFiles(prev => ({
            ...prev,
            [index]: file
        }));
        // Still update receiptUploads for UI feedback
        setReceiptUploads(prev => ({
            ...prev,
            [index]: file.name
        }));
    };

    const handleReceiptError = (error: string) => {
        alert(error);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (!project?.id) {
                throw new Error('No project ID available');
            }

            if (!formData.err_id || !formData.date || !formData.total_grant || !formData.total_other_sources) {
                alert(t('requiredFieldsAlert'));
                return;
            }

            const completedExpenses = expenses.filter(isExpenseComplete);
            let projectId = project.id;
            if (!projectId) {
                throw new Error('Trouble finding a projectId to file the image under');
            }

            if (file != null) {
                let uploadImageResult = await uploadImageAndInsertRecord(file, ImageCategory.FORM_FILLED, projectId, t)
            }

            // Submit form data 
            const submissionData = {
                ...formData,
                expenses: completedExpenses.map((expense, index) => ({
                    ...expense,
                    receipt_upload: receiptMap[index]
                })),
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
            alert(error.message === 'Receipt upload failed' 
                ? t('receiptUploadFailed') 
                : t('formSubmitFailed')
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {!formSubmitted ? (
                <FormBubble 
                    title={t('formTitle')} 
                    showRequiredLegend={true}
                >
                    <form onSubmit={handleSubmit} className="space-y-3 bg-white p-2 rounded-lg">
                        <div>
                            <FormLabel htmlFor="err_id" required error={errors.err_id}>
                                {t('errId')}
                            </FormLabel>
                            <input
                                id="err_id"
                                type="text"
                                name="err_id"
                                onChange={handleInputChange}
                                value={formData.err_id}
                                className={`w-full p-2 border rounded ${
                                    errors.err_id ? 'border-red-500' : 'border-gray-300'
                                } focus:outline-none focus:ring-2 focus:ring-primaryGreen`}
                                placeholder={t('errId')}
                            />
                        </div>

                        <div>
                            <FormLabel htmlFor="date" required error={errors.date}>
                                {t('date')}
                            </FormLabel>
                            <input
                                id="date"
                                type="date"
                                name="date"
                                onChange={handleInputChange}
                                value={formData.date}
                                className={`w-full p-2 border rounded ${
                                    errors.date ? 'border-red-500' : 'border-gray-300'
                                } focus:outline-none focus:ring-2 focus:ring-primaryGreen`}
                            />
                        </div>

                        <div className="swipeable-cards flex overflow-x-auto space-x-2 max-w-full">
                            {expenses.map((expense, index) => (
                                <div key={index} className="min-w-[300px] p-4 rounded bg-gray-50">
                                    <h4>{t('expenseEntry', { index: index + 1 })}</h4>
                                    
                                    <div>
                                        <FormLabel htmlFor={`activity-${index}`} required>
                                            {t('activity')}
                                        </FormLabel>
                                        <select
                                            id={`activity-${index}`}
                                            name="activity"
                                            value={expense.activity}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className={`w-full p-2 border rounded ${
                                                errors.expenses[index]?.activity ? 'border-red-500' : 'border-gray-300'
                                            } focus:outline-none focus:ring-2 focus:ring-primaryGreen`}
                                        >
                                            <option value="">{t('pleaseSelect')}</option>
                                            {categories.map(category => (
                                                <option key={category.id} value={category.name}>
                                                    {t(`categories.${category.name}`)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <FormLabel htmlFor={`description-${index}`} required>
                                            {t('description')}
                                        </FormLabel>
                                        <input
                                            id={`description-${index}`}
                                            type="text"
                                            name="description"
                                            value={expense.description}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                            placeholder={t('description')}
                                        />
                                    </div>

                                    <div>
                                        <FormLabel htmlFor={`payment_date-${index}`} required>
                                            {t('paymentDate')}
                                        </FormLabel>
                                        <input
                                            id={`payment_date-${index}`}
                                            type="date"
                                            name="payment_date"
                                            value={expense.payment_date}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                        />
                                    </div>

                                    <div>
                                        <FormLabel htmlFor={`seller-${index}`} required>
                                            {t('seller')}
                                        </FormLabel>
                                        <input
                                            id={`seller-${index}`}
                                            type="text"
                                            name="seller"
                                            value={expense.seller}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                            placeholder={t('seller')}
                                        />
                                    </div>

                                    <div>
                                        <FormLabel htmlFor={`payment_method-${index}`} required>
                                            {t('paymentMethod')}
                                        </FormLabel>
                                        <select
                                            id={`payment_method-${index}`}
                                            name="payment_method"
                                            value={expense.payment_method}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                        >
                                            <option value="cash">{t('cash')}</option>
                                            <option value="bank app">{t('bankApp')}</option>
                                        </select>
                                    </div>

                                    <div>
                                        <FormLabel htmlFor={`receipt_no-${index}`} required>
                                            {t('receiptNo')}
                                        </FormLabel>
                                        <input
                                            id={`receipt_no-${index}`}
                                            type="text"
                                            name="receipt_no"
                                            value={expense.receipt_no}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className="w-full p-2 border rounded"
                                            placeholder={t('receiptNo')}
                                        />
                                    </div>

                                    <div>
                                        <FormLabel htmlFor={`amount-${index}`} required>
                                            {t('amount')}
                                        </FormLabel>
                                        <input
                                            id={`amount-${index}`}
                                            type="number"
                                            min="0"
                                            name="amount"
                                            value={expense.amount}
                                            onChange={(e) => handleExpenseChange(index, e)}
                                            className={`w-full p-2 border rounded ${
                                                errors.expenses[index]?.amount ? 'border-red-500' : 'border-gray-300'
                                            } focus:outline-none focus:ring-2 focus:ring-primaryGreen`}
                                            placeholder={t('amount')}
                                        />
                                    </div>

                                    <ReceiptUploader
                                        expenseId={project?.id ? `${project.id}-${index}` : ''}
                                        projectId={project?.id || ''}
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
                            ))}
                        </div>
                        <Button 
                            text={expenses.length === 1 ? t('addExpense') : t('addAnotherExpense')} 
                            onClick={addExpenseCard} 
                        />
                        <div className="w-full mt-4">
                            <FormLabel htmlFor="total_grant" required error={errors.total_grant}>
                                {t('totalGrant')}
                            </FormLabel>
                            <input
                                id="total_grant"
                                type="number"
                                min="0"
                                name="total_grant"
                                onChange={handleInputChange}
                                value={formData.total_grant}
                                className={`w-full p-2 border rounded ${
                                    errors.total_grant ? 'border-red-500' : 'border-gray-300'
                                } focus:outline-none focus:ring-2 focus:ring-primaryGreen`}
                                placeholder={t('totalGrant')}
                            />
                        </div>
                        <input
                            type="number"
                            min="0"
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
                        <textarea
                            name="phone_number"
                            onChange={handleInputChange}
                            value={formData.phone_number}
                            className="w-full p-2 border rounded"
                            placeholder={t('phoneNumber')}
                        />
                        <textarea
                            name="banking_details"
                            onChange={handleInputChange}
                            value={formData.banking_details}
                            className="w-full p-2 border rounded"
                            placeholder={t('bankingDetails')}
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

                        <Button 
                            text={t('submit')}
                            type="submit"
                            disabled={isSubmitting}
                            className={isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                        />
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

export const getServerSideProps = async () => {
    return {
        props: {}
    };
};

export default FillForm;


