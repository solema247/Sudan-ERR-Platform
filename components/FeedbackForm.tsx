import { useState } from 'react';
import Button from './Button';

interface FeedbackFormProps {
    onReturnToMenu: () => void;
}

const FeedbackForm = ({ onReturnToMenu }: FeedbackFormProps) => {
    const [taskUsabilityRating, setTaskUsabilityRating] = useState(3);
    const [mainChallenges, setMainChallenges] = useState('');
    const [recommendation, setRecommendation] = useState('Maybe');

    const handleSubmit = async () => {
        const feedbackData = {
            taskUsabilityRating,
            mainChallenges,
            recommendation,
        };

        try {
            const response = await fetch('/api/submit-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(feedbackData),
            });

            if (response.ok) {
                alert('Feedback submitted successfully!');
                onReturnToMenu();
            } else {
                alert('Failed to submit feedback.');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert('An error occurred while submitting feedback.');
        }
    };

    return (
        <div className="space-y-4 p-4 bg-white rounded">
            <div className="flex flex-col">
                <label className="mb-2 font-semibold">How easy was it to complete your task in the app? (1-5)</label>
                <input
                    type="range"
                    min="1"
                    max="5"
                    value={taskUsabilityRating}
                    onChange={(e) => setTaskUsabilityRating(Number(e.target.value))}
                    className="p-2"
                />
                <div className="text-center">{taskUsabilityRating}</div>
            </div>
            <div className="flex flex-col">
                <label className="mb-2 font-semibold">What was the biggest challenge you faced while using the app?</label>
                <textarea
                    value={mainChallenges}
                    onChange={(e) => setMainChallenges(e.target.value)}
                    className="p-2 border rounded"
                />
            </div>
            <div className="flex flex-col">
                <label className="mb-2 font-semibold">Would you recommend this app to other volunteers?</label>
                <select
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    className="p-2 border rounded"
                >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Maybe">Maybe</option>
                </select>
            </div>
            <div className="flex space-x-2">
                <Button text="Submit Feedback" onClick={handleSubmit} />
                <Button text="Return to Menu" onClick={onReturnToMenu} />
            </div>
        </div>
    );
};

export default FeedbackForm; 