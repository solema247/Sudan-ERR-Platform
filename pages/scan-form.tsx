// pages/scan-form.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next"; // i18n hook
import ScanBubble from "../components/ui/ScanBubble";
import PrefilledForm from "../components/forms/PrefilledForm";
import FileUploader from "../components/uploads/FileUploader";
import Button from "../components/ui/Button";
import BulkPdfProcessor from "../components/forms/BulkPdfProcessor";
import { supabase } from "../services/supabaseClient";

interface ScanFormProps {
  onReturnToMenu: () => void;
  onSubmitAnotherForm?: () => void;
  project?: any; // Add project as an optional prop
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ScanForm: React.FC<ScanFormProps> = ({ onReturnToMenu, onSubmitAnotherForm, project }) => {
  const { t, i18n } = useTranslation("scanForm"); // Load translations from scan-form.json
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<any>(null);
  const [chatSteps, setChatSteps] = useState<JSX.Element[]>([]);
  const [uploadType, setUploadType] = useState<'image' | 'pdf' | 'bulk-pdf'>('image');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkPdfFile, setBulkPdfFile] = useState<File | null>(null);
  const [bulkPdfProcessing, setBulkPdfProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", i18n.language);

    try {
      const response = await fetch("/api/scan-form", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(t("errors.server_error", { status: response.status }));
      }

      const data = await response.json();

      setStructuredData(data.data);
      setChatSteps((prevSteps) => [
        ...prevSteps,
        <ScanBubble key="prefilledForm">
          <PrefilledForm 
            data={data.data} 
            onFormSubmit={handleFormSubmit} 
            project={project}
          />
        </ScanBubble>
      ]);
    } catch (error) {
      alert(t("errors.scan_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (formData: any, isDraft?: boolean) => {
    if (isDraft) {
        // For drafts, just return to menu
        onReturnToMenu();
        return;
    }

    // For normal submission, show success message
    setChatSteps([
        <ScanBubble key="uploadSuccess">
            <div>
                <p>{t("form_success")}</p>
                <div className="flex space-x-4 mt-2">
                    <Button
                        text={t("scan_another_form")}
                        onClick={() => {
                            setFile(null);
                            setStructuredData(null);
                            setChatSteps([]);
                            if (onSubmitAnotherForm) {
                                onSubmitAnotherForm();
                            }
                        }}
                    />
                    <Button
                        text={t("return_to_menu")}
                        onClick={onReturnToMenu}
                    />
                </div>
            </div>
        </ScanBubble>
    ]);
    
    setStructuredData(null);
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        alert(t('errors.file_too_large', { maxSize: '10MB' }));
        return;
      }
      if (file.type === 'application/pdf') {
        setPdfFile(file);
      } else {
        alert(t("errors.invalid_file_type"));
      }
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) return;

    setPdfProcessing(true);
    try {
      // Upload to Supabase Storage first
      const fileExt = pdfFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `single/${fileName}`; // Put single uploads in their own folder

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pdf-uploads')
        .upload(filePath, pdfFile);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pdf-uploads')
        .getPublicUrl(filePath);

      // Send URL to our API
      const response = await fetch("/api/scan-single-pdf", {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileUrl: publicUrl }),
      });

      const result = await response.json();

      if (result.data) {
        setStructuredData(result.data);
        
        const newChatStep = (
          <ScanBubble key={chatSteps.length}>
            <PrefilledForm 
              data={result.data} 
              onFormSubmit={handleFormSubmit} 
              project={project}
            />
          </ScanBubble>
        );

        setChatSteps(prev => [...prev, newChatStep]);
      }

      // Clean up: Delete the file from storage
      await supabase.storage
        .from('pdf-uploads')
        .remove([filePath]);

    } catch (error) {
      console.error("Failed to scan the form.", error);
      setError(t("errors.scan_failed"));
    } finally {
      setPdfProcessing(false);
      setPdfFile(null);
    }
  };

  const handleBulkPdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        alert(t('errors.file_too_large', { maxSize: '10MB' }));
        return;
      }
      if (file.type === 'application/pdf') {
        setBulkPdfFile(file);
      } else {
        alert(t("errors.invalid_file_type"));
      }
    }
  };

  const handleBulkPdfUpload = async () => {
    if (!bulkPdfFile) return;

    setBulkPdfProcessing(true);
    const formData = new FormData();
    formData.append("file", bulkPdfFile);

    try {
      const response = await fetch("/api/scan-pdf-form", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.data) {
        setStructuredData(result.data);
        
        const newChatStep = (
          <ScanBubble key={chatSteps.length}>
            <PrefilledForm 
              data={result.data} 
              onFormSubmit={handleFormSubmit} 
              project={project}
            />
          </ScanBubble>
        );

        setChatSteps(prev => [...prev, newChatStep]);
      }
    } catch (error) {
      console.error("Failed to scan the form.", error);
      setError(t("errors.server_error"));
    } finally {
      setBulkPdfProcessing(false);
      setBulkPdfFile(null);
    }
  };

  return (
    <>
      {!structuredData && chatSteps.length === 0 && (
        <ScanBubble>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <p className="text-gray-700">{t("instruction")}</p>
            
            <div className="flex space-x-2 rounded-xl bg-blue-900/20 p-1">
              <button
                className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 
                  ${uploadType === 'image' ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
                onClick={() => setUploadType('image')}
              >
                {t("upload_image")}
              </button>
              <button
                className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5
                  ${uploadType === 'pdf' ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
                onClick={() => setUploadType('pdf')}
              >
                {t("upload_pdf")}
              </button>
              <button
                className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5
                  ${uploadType === 'bulk-pdf' ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'}`}
                onClick={() => setUploadType('bulk-pdf')}
              >
                {t("upload_bulk_pdf")}
              </button>
            </div>
            
            <div className="mt-4">
              {uploadType === 'image' ? (
                <div className="flex flex-col items-start space-y-2">
                  <label className="bg-primaryGreen text-white py-2 px-4 rounded-lg cursor-pointer inline-flex items-center justify-center">
                    {t("choose_file")}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>
                  {file && <span className="text-gray-600">{file.name}</span>}
                  <button
                    onClick={handleUpload}
                    className="bg-primaryGreen text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all"
                    disabled={!file || isLoading}
                  >
                    {isLoading ? t("processing") : t("upload_and_scan")}
                  </button>
                </div>
              ) : uploadType === 'pdf' ? (
                <div className="flex flex-col items-start space-y-2">
                  <label className="bg-primaryGreen text-white py-2 px-4 rounded-lg cursor-pointer inline-flex items-center justify-center">
                    {t("choose_pdf")}
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      onChange={handlePdfChange} 
                      className="hidden" 
                    />
                  </label>
                  {pdfFile && <span className="text-gray-600">{pdfFile.name}</span>}
                  <button
                    onClick={handlePdfUpload}
                    className="bg-primaryGreen text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all"
                    disabled={!pdfFile || pdfProcessing}
                  >
                    {pdfProcessing ? t("processing") : t("upload_and_scan")}
                  </button>
                </div>
              ) : (
                <BulkPdfProcessor
                  project={project}
                  onFormSubmit={handleFormSubmit}
                />
              )}
            </div>
          </div>
        </ScanBubble>
      )}

      {/* Render all chat steps sequentially */}
      {chatSteps.map((step, index) => (
        <React.Fragment key={index}>{step}</React.Fragment>
      ))}
    </>
  );
};

export default ScanForm;

