// components/FileUploader.tsx

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

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

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const urls: string[] = [];

    try {
      for (const file of files) {
        const { data, error } = await supabase.storage
          .from('expense-reports/scanned-report-files')
          .upload(`${file.name}-${Date.now()}`, file);

        if (error) throw error;

        const { publicUrl } = supabase.storage
          .from('expense-reports/scanned-report-files')
          .getPublicUrl(data.path);

        urls.push(publicUrl);
      }

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
