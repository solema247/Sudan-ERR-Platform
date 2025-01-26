// pages/scan-prefill-form.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next"; // i18n hook
import PrefilledForm from "../components/forms/PrefilledForm";
import FileUploader from "../components/uploads/FileUploader";
import MessageBubble from "../components/ui/MessageBubble";
import Button from "../components/ui/Button";

const ScanPrefillForm: React.FC<{ project?: any }> = ({ project }) => {
  const { t } = useTranslation("scan-form"); // Load translations from scan-form.json
  const [structuredData, setStructuredData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showCompletionOptions, setShowCompletionOptions] = useState(false);
  const [formData, setFormData] = useState<any>(null);  // Store submitted form data

  useEffect(() => {
    const data = localStorage.getItem("prefillData");
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        if (parsedData && parsedData.date && parsedData.expenses) {
          setStructuredData(parsedData);
        } else {
          console.error(t("errors.invalid_data"));
        }
      } catch (error) {
        console.error(t("errors.failed_to_parse_data"), error);
      }
    } else {
      console.error(t("errors.no_data_found"));
    }
    setLoading(false);
  }, [t]);

  const handleFormSubmit = async (formData: any) => {
    try {
      const response = await fetch("/api/submit-prefilled-form", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(t("errors.submit_failed"));
      }

      const result = await response.json();
      console.log(t("form_submit_success"), result);

      setFormData(formData);  // Store the submitted form data
      setShowFileUploader(true);
    } catch (error) {
      console.error(t("errors.submit_failed"), error);
      alert(t("errors.submit_failed"));
    }
  };

  const handleUploadComplete = (urls: string[]) => {
    alert(t("upload_success"));
    setShowFileUploader(false);
    setShowCompletionOptions(true);
  };

  if (loading) {
    return <div>{t("loading")}</div>;
  }

  if (!structuredData) {
    return <div>{t("no_data_available")}</div>;
  }

  return (
    <div className="p-4">
      {!showFileUploader && !showCompletionOptions ? (
        <>
          <h2 className="text-lg font-semibold mb-4">{t("prefilled_form_title")}</h2>
          <PrefilledForm 
            data={structuredData} 
            onFormSubmit={handleFormSubmit}
            project={project}
          />
        </>
      ) : showFileUploader ? (
        <>
          <h2 className="text-lg font-semibold mb-4">{t("upload_photos_title")}</h2>
          {formData?.project_id ? (
            <FileUploader 
              projectId={formData.project_id} 
              onUploadComplete={handleUploadComplete} 
            />
          ) : (
            <div className="text-red-500">
              {t("errors.missing_project_id")}
            </div>
          )}
        </>
      ) : (
        <>
          <MessageBubble>
            <p>{t("form_success")}</p>
          </MessageBubble>
          <MessageBubble>
            <div className="flex space-x-4 mt-2">
              <Button
                text={t("scan_another_form")}
                onClick={() => {
                  setShowFileUploader(false); // Reset to allow new scan
                  setShowCompletionOptions(false); // Hide completion options
                  setStructuredData(null); // Reset structured data if needed
                }}
              />
              <Button
                text={t("return_to_menu")}
                onClick={() => (window.location.href = "/menu")}
              />
            </div>
          </MessageBubble>
        </>
      )}
    </div>
  );
};

export default ScanPrefillForm;

