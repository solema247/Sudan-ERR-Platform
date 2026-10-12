import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronRight } from 'lucide-react';
import F1ScopeFields, { emptyF1Scope, F1ScopeValue, scopeIsReady } from './F1ScopeFields';
import { newSupabase } from '../../../services/newSupabaseClient';
import type { F1OcrReviewPayload, MapExtractedData } from '../../../lib/f1/mapReviewTypes';

const MAX_FILE_SIZE = 40 * 1024 * 1024;
const DEFAULT_SDG_RATE = 2700;

type F1OcrUploadProps = {
  onBack: () => void;
  onOcrComplete: (payload: F1OcrReviewPayload) => void;
};

export default function F1OcrUpload({ onBack, onOcrComplete }: F1OcrUploadProps) {
  const router = useRouter();
  const locale = router.locale || 'en';
  const [scope, setScope] = useState<F1ScopeValue>(emptyF1Scope);
  const [currency, setCurrency] = useState<'USD' | 'SDG'>('SDG');
  /** Keep as string while editing so empty/partial values don't snap back to default */
  const [exchangeRateInput, setExchangeRateInput] = useState(String(DEFAULT_SDG_RATE));
  const [file, setFile] = useState<File | null>(null);
  const [tempFileKey, setTempFileKey] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    scopeIsReady(scope, { requireOrganization: true }) && !!file && !!tempFileKey;

  const uploadTemp = async (selected: File) => {
    setUploadingFile(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await newSupabase.auth.getSession();
      if (!session) throw new Error('Not signed in');

      // Upload to Prod Storage via API (not staging)
      const body = new FormData();
      body.append('file', selected);
      const res = await fetch('/api/f1/temp-upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body,
      });
      const result = await res.json();
      if (!res.ok || !result.success || !result.temp_file_key) {
        throw new Error(result.message || 'Failed to upload file to Prod');
      }
      setFile(selected);
      setTempFileKey(result.temp_file_key);
    } catch (e: any) {
      setFile(null);
      setTempFileKey(null);
      setError(e.message || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  };

  const parsedExchangeRate = (() => {
    const n = parseFloat(exchangeRateInput);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_SDG_RATE;
  })();

  const runOcr = async () => {
    if (!ready || !file || !tempFileKey) return;
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await newSupabase.auth.getSession();
      if (!session) throw new Error('Not signed in');

      const rate = currency === 'SDG' ? parsedExchangeRate : 1;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('form_type', 'F1');
      formData.append('currency', currency);
      formData.append('exchange_rate', String(rate));
      formData.append('err_id', scope.emergency_room_id);

      const res = await fetch('/api/ocr/process', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || 'OCR failed');
      }

      const extracted = result.data as MapExtractedData;
      // State/locality come from the room selected before upload (app locale),
      // not from OCR — Arabic forms would otherwise overwrite EN labels.
      onOcrComplete({
        extracted: {
          ...extracted,
          form_currency: extracted.form_currency || currency,
          exchange_rate: extracted.exchange_rate ?? rate,
          state: scope.state_name || extracted.state || null,
          locality: scope.locality || extracted.locality || null,
        },
        emergency_room_id: scope.emergency_room_id,
        grant_segment: scope.grant_segment,
        organization_id: scope.organization_id,
        organization_label: scope.organization_label,
        state_name: scope.state_name,
        locality: scope.locality,
        room_label: scope.room_label,
        temp_file_key: tempFileKey,
        form_currency: currency,
        exchange_rate: rate,
        file,
        file_name: file.name,
        file_type: file.type,
      });
    } catch (e: any) {
      setError(e.message || 'OCR failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <p className="app-section-label mb-0.5">F1 · Upload with AI</p>
        <h2 className="text-lg font-bold text-white leading-snug">Upload F1 work plan</h2>
      </div>

      <div className="grid gap-2.5 mb-4">
        <F1ScopeFields
          value={scope}
          onChange={setScope}
          locale={locale}
          compact
          showOrganization
        />

        <div className="grid grid-cols-[1fr_auto] gap-2.5 items-end">
          <div className="min-w-0">
            <label className="font-semibold block text-xs text-[#a8b6cc] mb-1">
              F1 file (PDF or Word)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="app-input !py-2 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-brand-orange file:text-[#152238] file:font-semibold file:px-2.5 file:py-1 file:text-xs"
              disabled={uploadingFile || loading}
              onChange={(e) => {
                setError(null);
                const f = e.target.files?.[0] || null;
                setFile(null);
                setTempFileKey(null);
                if (!f) return;
                if (f.size > MAX_FILE_SIZE) {
                  setError('File too large (max 40MB)');
                  return;
                }
                void uploadTemp(f);
              }}
            />
          </div>
          <div>
            <label className="font-semibold block text-xs text-[#a8b6cc] mb-1">Currency</label>
            <div className="inline-flex rounded-lg border border-white/15 overflow-hidden">
              {(['SDG', 'USD'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setCurrency(code)}
                  className={`px-3 py-2 text-xs font-semibold ${
                    currency === code
                      ? 'bg-brand-orange text-[#152238]'
                      : 'bg-[#152238] text-[#a8b6cc]'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>

        {currency === 'SDG' && (
          <div>
            <label className="font-semibold block text-xs text-[#a8b6cc] mb-1">
              Exchange rate (USD → SDG)
            </label>
            <input
              type="number"
              min={1}
              inputMode="decimal"
              className="app-input !py-2 text-sm"
              value={exchangeRateInput}
              onChange={(e) => setExchangeRateInput(e.target.value)}
              onBlur={() => {
                const n = parseFloat(exchangeRateInput);
                if (!Number.isFinite(n) || n <= 0) {
                  setExchangeRateInput(String(DEFAULT_SDG_RATE));
                } else {
                  setExchangeRateInput(String(n));
                }
              }}
            />
          </div>
        )}

        {file && (
          <p className="text-[11px] text-[#8a97ab] -mt-1 mb-0 truncate">
            {uploadingFile ? 'Uploading…' : file.name}
            {tempFileKey && !uploadingFile ? ' · ready' : ''}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!ready || loading || uploadingFile}
        onClick={runOcr}
        className="app-action-primary !py-3 disabled:opacity-50"
      >
        {loading ? 'Extracting…' : 'Extract & review'}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={loading}
        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#8a97ab] hover:text-brand-orange"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        Back
      </button>
    </div>
  );
}
