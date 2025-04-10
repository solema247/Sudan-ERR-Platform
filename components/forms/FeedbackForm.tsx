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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);

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
                setIsSubmitted(true);
            } else {
                throw new Error('Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            alert(t('messages.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMenuReturn = () => {
        console.log('Return to menu clicked');
        onReturnToMenu();
    };

    if (isSubmitted) {
        return (
            <div className="space-y-4 p-4 bg-white rounded">
                <div className="p-3 rounded bg-green-100 text-green-700 text-center mb-4">
                    {t('messages.success')}
                </div>
                <div className="flex justify-center">
                    <Button 
                        text={t('buttons.returnToMenu')} 
                        onClick={handleMenuReturn}
                    />
                </div>
            </div>
        );
    }

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
                    disabled={isSubmitting}
                />
            </div>
            
            <div className="flex flex-col">
                <label className="mb-2 font-semibold">{t('recommendation.label')}</label>
                <select
                    value={recommendation}
                    onChange={(e) => setRecommendation(e.target.value)}
                    className="p-2 border rounded"
                    disabled={isSubmitting}
                >
                    <option value="Yes">{t('recommendation.options.yes')}</option>
                    <option value="No">{t('recommendation.options.no')}</option>
                    <option value="Maybe">{t('recommendation.options.maybe')}</option>
                </select>
            </div>
            
            <div className="flex space-x-2">
                <Button 
                    text={t('buttons.submit')} 
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                />
                <Button 
                    text={t('buttons.returnToMenu')} 
                    onClick={handleMenuReturn}
                    disabled={isSubmitting}
                />
            </div>
        </div>
    );
};

export default FeedbackForm; 