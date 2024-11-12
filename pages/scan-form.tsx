// pages/scan-form.tsx
import React, { useState } from "react";
import ScanBubble from "../components/ScanBubble";
import MessageBubble from "../components/MessageBubble";
import PrefilledForm from "../components/PrefilledForm";
import FileUploader from "../components/FileUploader";
import Button from "../components/Button";

interface ScanFormProps {
  onReturnToMenu: () => void;
  onSubmitAnotherForm?: () => void;
}

const ScanForm: React.FC<ScanFormProps> = ({ onReturnToMenu, onSubmitAnotherForm }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<any>(null);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [chatSteps, setChatSteps] = useState<JSX.Element[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      console.log("File selected:", e.target.files[0].name);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/scan-form", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server responded with an error:", response.statusText, errorText);
        throw new Error(`Server Error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Scan successful, displaying prefilled form in chat", data);

      // Add PrefilledForm as a new chat step
      setStructuredData(data.data);
      setChatSteps((prevSteps) => [
        ...prevSteps,
        <MessageBubble key="prefilledForm">
          <PrefilledForm data={data.data} onFormSubmit={handleFormSubmit} />
        </MessageBubble>
      ]);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to scan the form.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = () => {
    // Add FileUploader as a new chat step after form submission
    setShowFileUploader(true);
    setChatSteps((prevSteps) => [
      ...prevSteps,
      <MessageBubble key="fileUploader">
        <FileUploader onUploadComplete={handleUploadComplete} />
      </MessageBubble>
    ]);
  };

  const handleUploadComplete = () => {
    setShowFileUploader(false);
    setStructuredData(null);

    // Append the success message and options to the chatSteps
    setChatSteps((prevSteps) => [
      ...prevSteps,
      <MessageBubble key="uploadSuccess">
        <div>
          <p>Form and photos uploaded successfully!</p>
          <div className="flex space-x-4 mt-2">
            <Button
              text="Scan Another Form"
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
              text="Return to Menu"
              onClick={onReturnToMenu} // Use the callback prop here
            />
          </div>
        </div>
      </MessageBubble>
    ]);
  };

  return (
    <>
      {/* Display File Input for Scanning as the first chat bubble */}
      {!structuredData && !showFileUploader && chatSteps.length === 0 && (
        <ScanBubble>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Scan Form</h2>
            <label className="bg-primaryGreen text-white py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-all cursor-pointer inline-flex items-center justify-center">
              Choose File
              <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
              />
            </label>
            {file && <span className="text-gray-600 ml-2">{file.name}</span>} {/* Display selected file name */}

            <button
              onClick={handleUpload}
              className="bg-primaryGreen text-white py-2 px-4 rounded-lg shadow-md hover:bg-green-700 transition-all"
              disabled={!file || isLoading}
            >
              {isLoading ? "Processing..." : "Upload and Scan"}
            </button>
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
