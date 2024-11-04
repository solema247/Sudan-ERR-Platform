// pages/fill-form.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';

const FillForm: React.FC = () => {
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
    const router = useRouter();

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

        // Validate required summary fields
        if (!formData.err_id || !formData.date || !formData.total_grant || !formData.total_other_sources) {
            alert('Please fill in all required summary fields.');
            return;
        }

        // Filter fully completed expense cards
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
            alert('Form submitted successfully!');
            router.push('/');
        } else {
            alert('Failed to submit the form');
        }
    };

    return (
        <div className="chat-bubble bg-white shadow p-4 mb-4 rounded-lg">
            <h1 className="text-lg font-semibold mb-4">Report Fill Form</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="err_id" onChange={handleInputChange} value={formData.err_id} required className="w-full p-2 border rounded" placeholder="ERR ID" />
                <input type="date" name="date" onChange={handleInputChange} value={formData.date} required className="w-full p-2 border rounded" placeholder="Date" />

                <div className="swipeable-cards flex overflow-x-auto space-x-4">
                    {expenses.map((expense, index) => (
                        <div key={index} className="min-w-[200px] p-4 border rounded bg-gray-100">
                            <h4>Expense Entry {index + 1}</h4>
                            <input type="text" name="activity" value={expense.activity} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" placeholder="Activity" />
                            <input type="text" name="description" value={expense.description} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" placeholder="Description" />
                            <input type="date" name="payment_date" value={expense.payment_date} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" />
                            <input type="text" name="seller" value={expense.seller} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" placeholder="Seller" />
                            <select name="payment_method" value={expense.payment_method} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded">
                                <option value="cash">Cash</option>
                                <option value="bank app">Bank App</option>
                            </select>
                            <input type="text" name="receipt_no" value={expense.receipt_no} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" placeholder="Receipt No." />
                            <input type="number" name="amount" value={expense.amount} onChange={(e) => handleExpenseChange(index, e)} className="w-full p-2 border rounded" placeholder="Amount" />
                        </div>
                    ))}
                </div>
                <button type="button" onClick={addExpenseCard} className="bg-blue-500 text-white py-2 px-4 rounded">Add Expense</button>

                <input type="number" name="total_grant" onChange={handleInputChange} value={formData.total_grant} className="w-full p-2 border rounded" placeholder="Total Grant" />
                <input type="number" name="total_other_sources" onChange={handleInputChange} value={formData.total_other_sources} className="w-full p-2 border rounded" placeholder="Total Other Sources" />
                <textarea name="additional_excess_expenses" onChange={handleInputChange} value={formData.additional_excess_expenses} className="w-full p-2 border rounded" placeholder="How did you cover excess expenses?" />
                <textarea name="additional_surplus_use" onChange={handleInputChange} value={formData.additional_surplus_use} className="w-full p-2 border rounded" placeholder="How would you spend the surplus?" />
                <textarea name="additional_training_needs" onChange={handleInputChange} value={formData.additional_training_needs} className="w-full p-2 border rounded" placeholder="Additional training needs" />
                <textarea name="lessons" onChange={handleInputChange} value={formData.lessons} className="w-full p-2 border rounded" placeholder="Lessons learned in budget planning" />

                <input type="file" onChange={handleFileChange} className="w-full p-2 border rounded" />
                <button type="submit" className="bg-green-500 text-white py-2 px-4 rounded">Submit</button>
            </form>
        </div>
    );
};

export default FillForm;
