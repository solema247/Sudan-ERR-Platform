// pages/fill-form.tsx
import React, { useState } from 'react';
import FormBubble from '../components/FormBubble';
import MessageBubble from '../components/MessageBubble'; 
import Button from '../components/Button';


const FillForm: React.FC<{ onReturnToMenu: () => void; onSubmitAnotherForm: () => void }> = ({ onReturnToMenu, onSubmitAnotherForm }) => {
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
            alert('Please fill in all required summary fields.');
            return;
        }

        const completedExpenses = expenses.filter(isExpenseComplete);

        const fileContent = file ? await file.arrayBuffer() : null;
        const submissionData = {
            ...formData,
            expenses: completedExpenses,
            file: file ? { name: file.name, type: file.type, content: Buffer.from(fileContent!).toString('base64') } : null
        };

        const response = await fetch('/api/fill-form', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submissionData)
        });

        if (response.ok) {
            setFormSubmitted(true);
        } else {
            alert('Failed to submit the form');
        }
    };

    return (
        <>
            {!formSubmitted ? (
                <FormBubble>
                    <form onSubmit={handleSubmit} className="space-y-3 bg-white p-2 rounded-lg">
                        <label>
                            ERR ID (required)
                            <input type="text" name="err_id" onChange={handleInputChange} value={formData.err_id} required className="w-full p-2 border rounded" placeholder="ERR ID" />
                        </label>
                        <label>
                            Date (required)
                            <input type="date" name="date" onChange={handleInputChange} value={formData.date} required className="w-full p-2 border rounded" placeholder="Date" />
                        </label>

                        <div className="swipeable-cards flex overflow-x-auto space-x-2">
                            {expenses.map((expense, index) => (
                                <div key={index} className="min-w-[200px] p-4 rounded bg-gray-50">
                                    <h4>Expense Entry {index + 1}</h4>
                                    <label>Activity
                                        <input type="text" name="activity" value={expense.activity} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" placeholder="Activity" />
                                    </label>
                                    <label>Description
                                        <input type="text" name="description" value={expense.description} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" placeholder="Description" />
                                    </label>
                                    <label>Payment Date
                                        <input type="date" name="payment_date" value={expense.payment_date} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" />
                                    </label>
                                    <label>Seller
                                        <input type="text" name="seller" value={expense.seller} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" placeholder="Seller" />
                                    </label>
                                    <label>Payment Method
                                        <select name="payment_method" value={expense.payment_method} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded">
                                            <option value="cash">Cash</option>
                                            <option value="bank app">Bank App</option>
                                        </select>
                                    </label>
                                    <label>Receipt No.
                                        <input type="text" name="receipt_no" value={expense.receipt_no} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" placeholder="Receipt No." />
                                    </label>
                                    <label>Amount
                                        <input type="number" name="amount" value={expense.amount} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" placeholder="Amount" />
                                    </label>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addExpenseCard} className="bg-green-500 text-white py-2 px-4 rounded">Add Expense</button>
                        <div className="w-full mt-4"> 
                            <input type="number" name="total_grant" onChange={handleInputChange} value={formData.total_grant} required className="w-full p-2 border rounded" placeholder="Total Grant (required)" />
                        </div>    
                        <input type="number" name="total_other_sources" onChange={handleInputChange} value={formData.total_other_sources} required className="w-full p-2 border rounded" placeholder="Total Other Sources (required)" />
                        <textarea name="additional_excess_expenses" onChange={handleInputChange} value={formData.additional_excess_expenses} className="w-full p-2 border rounded" placeholder="How did you cover excess expenses?" />
                        <textarea name="additional_surplus_use" onChange={handleInputChange} value={formData.additional_surplus_use} className="w-full p-2 border rounded" placeholder="How would you spend the surplus?" />
                        <textarea name="additional_training_needs" onChange={handleInputChange} value={formData.additional_training_needs} className="w-full p-2 border rounded" placeholder="Additional training needs" />
                        <textarea name="lessons" onChange={handleInputChange} value={formData.lessons} className="w-full p-2 border rounded" placeholder="Lessons learned in budget planning" />

                        <label>File Upload
                            <input type="file" onChange={handleFileChange} className="w-full p-2 border rounded" />
                        </label>
                        <button type="submit" className="bg-green-500 text-white py-2 px-4 rounded">Submit</button>
                    </form>
                </FormBubble>
            ) : (
                <>
                    <MessageBubble>
                        Form submitted successfully!
                    </MessageBubble>

                    <div className="flex justify-center space-x-4 mt-2">
                        <Button text="Submit Another Form" onClick={onSubmitAnotherForm} />
                        <Button text="Return to Main Menu" onClick={onReturnToMenu} />
                    </div>
                </>
            )}
        </>
    );
};

export default FillForm;
