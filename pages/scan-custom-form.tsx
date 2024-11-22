//pages/scan-custom-form.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import CustomScanBubble from "../components/CustomScanBubble";
import FileUploader from "../components/FileUploader";
import Button from "../components/Button";
import CustomFormReview from "../components/CustomFormReview";

const ScanCustomForm: React.FC = () => {
    const { t, i18n } = useTranslation("scanCustomForm");
    const [file, setFile] = useState<File | null>(null);
    const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [ocrOutput, setOcrOutput] = useState<string | null>(null);
    const [structuredData, setStructuredData] = useState<any>(null);
    const [unusedText, setUnusedText] = useState<any>(null);
    const [showReviewForm, setShowReviewForm] = useState(false);

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setLocalImageUrl(URL.createObjectURL(selectedFile)); // Generate local preview URL
        }
    };

    // Handle file upload and API request
    const handleUpload = async () => {
        if (!file) {
            alert(t("errors.no_file_selected")); // Handle case where no file is selected
            return;
        }

        setIsLoading(true);
        const formData = new FormData();
        formData.append("file", file); // Ensure file is appended with correct name
        formData.append("language", i18n.language);

        try {
            const response = await fetch("/api/scan-custom-form", {
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

            setOcrOutput(data.ocrText);
            setStructuredData(data.structuredData);
            setUnusedText(data.structuredData?.unused_text);
            setShowReviewForm(true);
        } catch (error) {
            console.error(t("errors.scan_failed"), error);
            alert(t("errors.scan_failed"));
        } finally {
            setIsLoading(false);
        }
    };

    // Render UI
    return (
        <>
            {/* File upload UI */}
            {!structuredData && !showReviewForm && (
                <CustomScanBubble>
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">{t("title")}</h2>
                        <p className="text-gray-700">{t("instruction")}</p>
                        <div className="flex flex-col items-start space-y-2">
                            <label className="bg-primaryGreen text-white py-2 px-4 rounded-lg cursor-pointer inline-flex items-center justify-center">
                                {t("choose_file")}
                                <input
                                    type="file"
                                    name="file" // Added name attribute to match the backend expectation
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
                    </div>
                </CustomScanBubble>
            )}

            {/* Display uploaded image and OCR results */}
            {structuredData && localImageUrl && showReviewForm && (
                <CustomScanBubble>
                    <div>
                        <h2 className="text-lg font-semibold">{t("ocr_results")}</h2>
                        <div className="mb-4">
                            <img
                                src={localImageUrl}
                                alt={t("uploaded_image_alt")}
                                className="w-full rounded-lg shadow"
                            />
                        </div>
                        <div>
                            <h3 className="text-md font-semibold">{t("ocr_output_title")}</h3>
                            <div className="bg-gray-100 p-2 rounded max-h-40 overflow-y-scroll border border-gray-300">
                                <pre className="whitespace-pre-wrap">{ocrOutput}</pre>
                            </div>
                        </div>
                    </div>
                </CustomScanBubble>
            )}

            {/* Render editable form */}
            {structuredData && showReviewForm && (
                <CustomFormReview
                    data={structuredData}
                    onSubmit={(updatedData) => {
                        console.log("Updated Data:", updatedData);
                        // Handle form submission logic here
                    }}
                />
            )}
        </>
    );
};

export default ScanCustomForm;


