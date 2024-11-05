import React, { useState } from "react";
import ScanBubble from "../components/ScanBubble";
import MessageBubble from "../components/MessageBubble";
import PrefilledForm from "../components/PrefilledForm";
import FileUploader from "../components/FileUploader"; // Import FileUploader

const ScanForm: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<any>(null);
  const [showFileUploader, setShowFileUploader] = useState(false); // Add state

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      console.log("File selected:", e.target.files[0].name);
    }
  };

  const handleFormSubmit = () => {
    // Show the FileUploader after form submission
    setShowFileUploader(true);
  };

  const handleUploadComplete = () => {
    // Define actions after file upload, e.g., navigate to menu
    // router.push('/menu');
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
      setStructuredData(data.data);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to scan the form.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {!structuredData && !showFileUploader && (
        <ScanBubble>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Scan Form</h2>
            <input type="file" accept="image/*" onChange={handleFileChange} />
            <button
              onClick={handleUpload}
              className="bg-blue-500 text-white py-2 px-4 rounded"
              disabled={!file || isLoading}
            >
              {isLoading ? "Processing..." : "Upload and Scan"}
            </button>
          </div>
        </ScanBubble>
      )}

      {structuredData && !showFileUploader && (
        <MessageBubble>
          <PrefilledForm data={structuredData} onFormSubmit={handleFormSubmit} />
        </MessageBubble>
      )}

      {showFileUploader && (
        <MessageBubble>
          <FileUploader onUploadComplete={handleUploadComplete} />
        </MessageBubble>
      )}
    </>
  );
};

export default ScanForm;
