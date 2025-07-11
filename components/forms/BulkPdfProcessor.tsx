import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PrefilledForm from './PrefilledForm';
import { supabase } from '../../services/supabaseClient';

interface FormPreview {
  err_id: string;
  date: string;
  expenses: any[];
  financial_summary: {
    total_expenses: number;
    total_grant_received: number;
    total_other_sources: number;
    remainder: number;
  };
  additional_questions: any;
  selected?: boolean;
}

interface BulkPdfProcessorProps {
  project?: any;
  onFormSubmit: (formData: any, isBulkProcessing?: boolean) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

const BulkPdfProcessor: React.FC<BulkPdfProcessorProps> = ({ project, onFormSubmit }) => {
  const { t } = useTranslation('scanForm');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedForms, setDetectedForms] = useState<FormPreview[]>([]);
  const [selectedFormIndex, setSelectedFormIndex] = useState<number | null>(null);
  const [processedForms, setProcessedForms] = useState<number[]>([]);
  const [totalSelectedForms, setTotalSelectedForms] = useState(0);
  const [currentFormNumber, setCurrentFormNumber] = useState(0);
  const [formKey, setFormKey] = useState(0);
  const [processedFormData, setProcessedFormData] = useState<any[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE) {
        alert(t('errors.file_too_large', { maxSize: '10MB' }));
        return;
      }
      setFile(selectedFile);
      setDetectedForms([]);
      setSelectedFormIndex(null);
      setProcessedForms([]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `${project.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdf-uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pdf-uploads')
        .getPublicUrl(filePath);

      // Send URL to our API
      const response = await fetch('/api/scan-pdf-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl: publicUrl }),
      });

      if (!response.ok) {
        throw new Error(t('errors.scan_failed'));
      }

      const data = await response.json();
      
      if (!data.forms || !Array.isArray(data.forms) || data.forms.length === 0) {
        throw new Error('No forms detected in the PDF');
      }

      setDetectedForms(data.forms.map((form: any) => ({
        ...form,
        selected: false
      })));

      // Clean up: Delete the file from storage
      await supabase.storage
        .from('pdf-uploads')
        .remove([filePath]);

    } catch (error) {
      console.error('Upload error:', error);
      alert(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleFormSelection = (index: number) => {
    setDetectedForms(prev => prev.map((form, i) => 
      i === index ? { ...form, selected: !form.selected } : form
    ));
  };

  const selectAllForms = () => {
    setDetectedForms(prev => prev.map(form => ({ ...form, selected: true })));
  };

  const processSelectedForms = () => {
    const selectedIndices = detectedForms
      .map((form, index) => form.selected ? index : -1)
      .filter(index => index !== -1);

    if (selectedIndices.length > 0) {
      setTotalSelectedForms(selectedIndices.length);
      setCurrentFormNumber(1);
      setSelectedFormIndex(selectedIndices[0]);
    }
  };

  const handleFormProcessed = async () => {
    if (selectedFormIndex === null) return;

    const currentFormData = detectedForms[selectedFormIndex];
    
    // Add to processed forms list
    const newProcessedForms = [...processedForms, selectedFormIndex];
    setProcessedForms(newProcessedForms);
    
    // Find the next unprocessed form that was selected
    const nextForm = detectedForms.findIndex((form, index) => 
      form.selected && !newProcessedForms.includes(index)
    );

    if (nextForm !== -1) {
      // Move to next form - increment key to force PrefilledForm to re-render
      setFormKey(prev => prev + 1);
      setSelectedFormIndex(nextForm);
      setCurrentFormNumber(prev => prev + 1);
      setProcessedFormData(prev => [...prev, currentFormData]);
    } else {
      // All forms are processed - call parent with completion signal
      setProcessedFormData(prev => [...prev, currentFormData]);
      
      // Call parent onFormSubmit to show completion
      onFormSubmit(currentFormData, false);
      
      // Reset state
      setFile(null);
      setDetectedForms([]);
      setSelectedFormIndex(null);
      setProcessedForms([]);
      setTotalSelectedForms(0);
      setCurrentFormNumber(0);
      setProcessedFormData([]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      {!detectedForms.length && (
        <div className="flex flex-col items-start space-y-2">
          <label className="bg-primaryGreen text-white py-2 px-4 rounded-lg cursor-pointer">
            {t('choose_pdf')}
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          {file && <span className="text-gray-600">{file.name}</span>}
          <button
            onClick={handleUpload}
            disabled={!file || isProcessing}
            className="bg-primaryGreen text-white py-2 px-4 rounded-lg disabled:opacity-50"
          >
            {isProcessing ? t('processing') : t('upload_and_scan')}
          </button>
        </div>
      )}

      {/* Form Selection Grid */}
      {detectedForms.length > 0 && selectedFormIndex === null && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{t('multiple_forms.title')}</h2>
            <button
              onClick={selectAllForms}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              {t('multiple_forms.select_all')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {detectedForms.map((form, index) => (
              <div
                key={`${form.err_id}-${form.date}-${index}`}
                className={`relative border rounded-lg p-4 ${
                  form.selected ? 'ring-2 ring-green-500' : ''
                } ${processedForms.includes(index) ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={form.selected}
                  onChange={() => toggleFormSelection(index)}
                  className="absolute top-2 right-2"
                  disabled={processedForms.includes(index)}
                />
                <h3 className="font-semibold">{form.err_id}</h3>
                <p className="text-gray-600">{form.date}</p>
                <p className="text-lg font-medium">
                  {form.financial_summary?.total_expenses?.toLocaleString()} SDG
                </p>
              </div>
            ))}
          </div>

          <button
            onClick={processSelectedForms}
            disabled={!detectedForms.some(form => form.selected)}
            className="w-full bg-primaryGreen text-white py-2 px-4 rounded disabled:opacity-50"
          >
            {t('multiple_forms.process_selected')}
          </button>
        </div>
      )}

      {/* Form Processing */}
      {selectedFormIndex !== null && (
        <div className="space-y-4">
          {/* PrefilledForm */}
          <PrefilledForm
            key={`form-${selectedFormIndex}-${formKey}`}
            data={detectedForms[selectedFormIndex]}
            onFormSubmit={handleFormProcessed}
            project={project}
            showProgressBar={true}
            currentFormNumber={currentFormNumber}
            totalSelectedForms={totalSelectedForms}
            formId={detectedForms[selectedFormIndex].err_id}
            formDate={detectedForms[selectedFormIndex].date}
          />
        </div>
      )}
    </div>
  );
};

export default BulkPdfProcessor; 