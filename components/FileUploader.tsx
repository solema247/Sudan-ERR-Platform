//Components/FileUploader.tsx
import React, { useState, useEffect } from 'react';

interface FileUploaderProps {
  onUploadComplete: (urls: string[]) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUploadComplete }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  // Automatically trigger upload when files are selected
  useEffect(() => {
    if (files.length > 0) {
      handleUpload();
    }
  }, [files]);

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const urls: string[] = [];

    try {
      for (const file of files) {
        const base64Content = await convertToBase64(file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: `${file.name}-${Date.now()}`,
            fileContent: base64Content,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to upload file');
        }

        const result = await response.json();
        urls.push(result.url);
      }

      // Notify parent component of completion
      onUploadComplete(urls);
      setFiles([]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" multiple onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={uploading || files.length === 0}>
        {uploading ? 'Uploading...' : 'Upload Photos'}
      </button>
    </div>
  );
};

export default FileUploader;
