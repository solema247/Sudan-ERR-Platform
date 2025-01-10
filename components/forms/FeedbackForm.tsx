import { useState } from 'react';
import Button from '../ui/Button';
import { useTranslation } from 'react-i18next';

interface FeedbackFormProps {
    onReturnToMenu: () => void;
}

const FeedbackForm = ({ onReturnToMenu }: FeedbackFormProps) => {
    const { t } = useTranslation('feedback');
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
                <label className="mb-2 font-semibold">{t('usabilityRating.label')}</label>
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
                <label className="mb-2 font-semibold">{t('mainChallenges.label')}</label>
                <textarea
                    value={mainChallenges}
                    onChange={(e) => setMainChallenges(e.target.value)}
                    className="p-2 border rounded"
                />
            </div>
            <div className="flex flex-col">
                <label className="mb-2 font-semibold">{t('recommendation.label')}</label>
                <select
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    className="p-2 border rounded"
                >
                    <option value="Yes">{t('recommendation.options.yes')}</option>
                    <option value="No">{t('recommendation.options.no')}</option>
                    <option value="Maybe">{t('recommendation.options.maybe')}</option>
                </select>
            </div>
            <div className="flex space-x-2">
                <Button text={t('buttons.submit')} onClick={handleSubmit} />
                <Button text={t('buttons.returnToMenu')} onClick={onReturnToMenu} />
            </div>
        </div>
    );
};

export default FeedbackForm; 