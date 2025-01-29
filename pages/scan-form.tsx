// pages/scan-form.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next"; // i18n hook
import ScanBubble from "../components/ui/ScanBubble";
import PrefilledForm from "../components/forms/PrefilledForm";
import FileUploader from "../components/uploads/FileUploader";
import Button from "../components/ui/Button";

interface ScanFormProps {
  onReturnToMenu: () => void;
  onSubmitAnotherForm?: () => void;
  project?: any; // Add project as an optional prop
}

const ScanForm: React.FC<ScanFormProps> = ({ onReturnToMenu, onSubmitAnotherForm, project }) => {
  const { t, i18n } = useTranslation("scanForm"); // Load translations from scan-form.json
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<any>(null);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [chatSteps, setChatSteps] = useState<JSX.Element[]>([]);
  const [uploadType, setUploadType] = useState<'image' | 'pdf'>('image');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfProcessing, setPdfProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      console.log(t("file_selected", { fileName: e.target.files[0].name }));
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", i18n.language); // Add app language for backend processing

    try {
      const response = await fetch("/api/scan-form", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(t("errors.scan_failed"), errorText);
        throw new Error(t("errors.server_error", { status: response.status }));
      }

      const data = await response.json();
      console.log(t("scan_success"), data);

      // Add PrefilledForm as a new chat step
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
      console.error(t("errors.scan_failed"), error);
      alert(t("errors.scan_failed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = () => {
    // Add FileUploader as a new chat step after form submission
    setShowFileUploader(true);
    setChatSteps((prevSteps) => [
      ...prevSteps,
      <ScanBubble key="fileUploader">
        <div className="space-y-4">
          <p className="text-gray-600">
            {t("upload_instructions")}
          </p>
          <FileUploader projectId={project.id} onUploadComplete={handleUploadComplete} />
        </div>
      </ScanBubble>
    ]);
  };

  const handleUploadComplete = () => {
    setShowFileUploader(false);
    setStructuredData(null);

    // Append the success message and options to the chatSteps
    setChatSteps((prevSteps) => [
      ...prevSteps,
      <ScanBubble key="uploadSuccess">
        <div>
          <p>{t("form_success")}</p>
          <div className="flex space-x-4 mt-2">
            <Button
              text={t("scan_another_form")}
              onClick={() => {
                setFile(null);
                setStructuredData(null);
                setShowFileUploader(false);
                setChatSteps([]); // Reset chat steps to restart scan form flow
                if (onSubmitAnotherForm) {
                  onSubmitAnotherForm();
                }
              }}
            />
            <Button
              text={t("return_to_menu")}
              onClick={onReturnToMenu} // Use the callback prop here
            />
          </div>
        </div>
      </ScanBubble>
    ]);
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        setPdfFile(file);
        console.log(t("pdf_selected", { fileName: file.name }));
      } else {
        alert(t("errors.invalid_file_type"));
      }
    }
  };

  const handlePdfUpload = async () => {
    if (!pdfFile) return;

    setPdfProcessing(true);
    const formData = new FormData();
    formData.append("file", pdfFile);

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

      if (onSubmitAnotherForm) {
        onSubmitAnotherForm();
      }
    } catch (error) {
      console.error("Failed to scan the form.", error);
      setError(t("errors.server_error"));
    } finally {
      setPdfProcessing(false);
      setPdfFile(null);
    }
  };

  return (
    <>
      {!structuredData && !showFileUploader && chatSteps.length === 0 && (
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
              ) : (
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

