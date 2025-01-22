import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import Button from '../components/ui/Button';
import Image from 'next/image';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const MainApp = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation('home');
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? 0.5 : 0.8;  // Mobile gets 0.50, desktop gets 0.8
    }
    return 0.6; // Default fall back
  });

  const handleLogin = () => {
    router.push('/login');
  };

  const handleOfflineMode = () => {
    router.push('/offline-mode');
  };

  const handleDownload = () => {
    setShowPDFModal(true);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const handleLogout = () => {
    localStorage.removeItem('isUnlocked');
    router.reload(); // This will reload the page and show the calculator
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <Image src="/icons/icon-512x512.png" alt="App Icon" width={100} height={100} />
        </div>
        <h1 className="text-2xl font-bold text-black">{t('welcomeMessage')}</h1>
      </div>
      <div className="flex flex-col space-y-4 w-full max-w-sm">
        <Button text={t('login')} onClick={handleLogin} />
        <Button text={t('offlineMode')} onClick={handleOfflineMode} />
        <Button 
          text={t('downloadGuide')}
          onClick={handleDownload}
        />
        <div className="flex justify-center space-x-4 mt-4">
          <button onClick={() => changeLanguage('en')} className="mx-2 text-blue-500 underline">
            English
          </button>
          <button onClick={() => changeLanguage('ar')} className="mx-2 text-blue-500 underline">
            العربية
          </button>
        </div>
        <div className="mt-4">
          <button onClick={handleLogout} className="text-red-500 underline">
            {t('logout')}
          </button>
        </div>
      </div>

      {/* PDF Modal with react-pdf */}
      {showPDFModal && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="bg-white p-4 shadow-md flex justify-between items-center">
            <button 
              onClick={() => setShowPDFModal(false)}
              className="flex items-center text-gray-700"
            >
              <svg className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t('backToApp')}
            </button>
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => setScale(prev => Math.max(0.5, prev - 0.1))}
                className="text-gray-700"
              >
                -
              </button>
              <button 
                onClick={() => setScale(prev => Math.min(2, prev + 0.1))}
                className="text-gray-700"
              >
                +
              </button>
              <a 
                href="/guides/user-guide.pdf"
                download="user-guide.pdf"
                className="text-blue-500"
              >
                {t('download')}
              </a>
            </div>
          </div>
          <div className="flex-1 w-full overflow-auto bg-gray-100 flex justify-center">
            <Document
              file="/guides/user-guide.pdf"
              onLoadSuccess={onDocumentLoadSuccess}
              className="max-w-full"
            >
              <Page
                pageNumber={pageNumber}
                scale={scale}
                className="shadow-lg m-4"
                width={window.innerWidth > 768 ? undefined : window.innerWidth - 32}
              />
            </Document>
          </div>
          {numPages && (
            <div className="p-4 flex justify-center items-center space-x-4 bg-white border-t">
              <button 
                onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                disabled={pageNumber <= 1}
                className="text-gray-700 disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {pageNumber} of {numPages}
              </span>
              <button 
                onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
                disabled={pageNumber >= numPages}
                className="text-gray-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MainApp; 