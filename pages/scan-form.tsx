// pages/scan-form.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next"; // i18n hook
import ScanBubble from "../components/ScanBubble";
import MessageBubble from "../components/MessageBubble";
import PrefilledForm from "../components/PrefilledForm";
import ImageUploader from "../components/FileUploader";
import Button from "../components/Button";

interface ScanFormProps {
  onReturnToMenu: () => void;
  onSubmitAnotherForm?: () => void;
  project?: any; // Add project as an optional prop
}

const ScanForm: React.FC<ScanFormProps> = ({ onReturnToMenu, onSubmitAnotherForm }) => {
  const { t, i18n } = useTranslation("scanForm"); // Load translations from scan-form.json
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<any>(null);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [chatSteps, setChatSteps] = useState<JSX.Element[]>([]);

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
          <PrefilledForm data={data.data} onFormSubmit={handleFormSubmit} />
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
        <ImageUploader onUploadComplete={handleUploadComplete} />
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

  return (
    <>
      {/* Display File Input for Scanning as the first chat bubble */}
      {!structuredData && !showFileUploader && chatSteps.length === 0 && (
        <ScanBubble>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            {/* Instruction Text */}
            <p className="text-gray-700">{t("instruction")}</p>
            {/* Stack Choose File and Upload and Scan buttons vertically, aligned to the left */}
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
              {file && <span className="text-gray-600">{file.name}</span>} {/* Display selected file name */}

              <button
                onClick={handleUpload}
                className="bg-primaryGreen text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all"
                disabled={!file || isLoading}
              >
                {isLoading ? t("processing") : t("upload_and_scan")}
              </button>
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

