// pages/scan-form.tsx — Gemini OCR (MAP F4 pipeline)
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PrefilledForm from '../components/forms/PrefilledForm';
import Button from '../components/ui/Button';
import { newSupabase } from '../services/newSupabaseClient';

interface ScanFormProps {
  onReturnToMenu: () => void;
  onSubmitAnotherForm?: () => void;
  project?: any;
}

const MAX_FILE_SIZE = 40 * 1024 * 1024;

const ScanForm: React.FC<ScanFormProps> = ({ onReturnToMenu, onSubmitAnotherForm, project }) => {
  const { t } = useTranslation('scanForm');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      if (f.size > MAX_FILE_SIZE) {
        setError(t('errors.file_too_large', { maxSize: '40MB' }));
        return;
      }
      setFile(f);
    }
  };

  const runOcr = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('form_type', 'F4');
    if (project?.err_id) formData.append('err_id', String(project.err_id));

    try {
      const {
        data: { session },
      } = await newSupabase.auth.getSession();
      if (!session) throw new Error('Not signed in');

      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || t('errors.scan_failed'));
      }
      setStructuredData(result.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || t('errors.scan_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (formData: any, isDraft?: boolean) => {
    if (isDraft) {
      onReturnToMenu();
      return;
    }
    setDone(true);
    setStructuredData(null);
  };

  const reset = () => {
    setFile(null);
    setStructuredData(null);
    setDone(false);
    setError(null);
    if (onSubmitAnotherForm) onSubmitAnotherForm();
  };

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-green-700 font-medium">{t('form_success', 'Form submitted successfully.')}</p>
        <div className="flex flex-wrap gap-2">
          <Button text={t('scan_another_form', 'Scan another')} onClick={reset} />
          <Button text={t('return_to_menu', 'Back')} onClick={onReturnToMenu} />
        </div>
      </div>
    );
  }

  if (structuredData) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Review the extracted F4 fields, correct anything needed, then submit.
        </p>
        <PrefilledForm data={structuredData} onFormSubmit={handleFormSubmit} project={project} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{t('title', 'Scan financial report')}</h2>
      <p className="text-sm text-gray-600">
        {t(
          'instruction',
          'Upload a photo or PDF of an F4 financial report. We extract the fields for you to review.'
        )}
      </p>

      <label className="inline-flex items-center justify-center bg-brand-deep text-white py-2.5 px-4 rounded-lg cursor-pointer text-sm font-medium">
        {t('choose_file', 'Choose file')}
        <input
          type="file"
          accept="image/*,application/pdf,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
      {file && <p className="text-sm text-gray-600">{file.name}</p>}

      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <button
        type="button"
        onClick={runOcr}
        disabled={!file || isLoading}
        className="w-full sm:w-auto bg-brand-deep disabled:opacity-50 text-white py-2.5 px-6 rounded-lg font-medium"
      >
        {isLoading ? t('processing', 'Processing…') : t('upload_and_scan', 'Upload & scan')}
      </button>

      <button type="button" onClick={onReturnToMenu} className="block text-sm text-gray-500 underline">
        {t('return_to_menu', 'Back')}
      </button>
    </div>
  );
};

export default ScanForm;
