import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { ChevronRight } from 'lucide-react';
import { HomeCard } from '../../home/HomeSection';
import { WorkPlanScene, ReportingScene } from '../../home/illustrations';
import F1ScopeFields, { F1ScopeValue, scopeIsReady } from './F1ScopeFields';

type F1CreateChooserProps = {
  onBack: () => void;
  onChooseManual: (scope: F1ScopeValue) => void;
  onChooseOcr: () => void;
};

export default function F1CreateChooser({
  onBack,
  onChooseManual,
  onChooseOcr,
}: F1CreateChooserProps) {
  const router = useRouter();
  const [step, setStep] = useState<'method' | 'manual-scope'>('method');
  const [scope, setScope] = useState<F1ScopeValue>({
    emergency_room_id: '',
    grant_segment: '',
    state_name: '',
    locality: '',
    room_label: '',
  });
  const [scopeError, setScopeError] = useState<string | null>(null);

  if (step === 'manual-scope') {
    return (
      <div>
        <div className="mb-6">
          <p className="app-section-label mb-1">F1 · Manual entry</p>
          <h2 className="text-xl font-bold text-white leading-snug mb-1">Scope</h2>
          <p className="text-sm text-[#a8b6cc] mb-0">
            Choose grant segment{scope.emergency_room_id ? '' : ', state and ERR'}, then continue to the form.
          </p>
        </div>

        <div className="mb-6">
          <F1ScopeFields value={scope} onChange={setScope} locale={router.locale || 'en'} compact />
        </div>

        {scopeError && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-sm">
            {scopeError}
          </div>
        )}

        <button
          type="button"
          className="app-action-primary"
          onClick={() => {
            if (!scopeIsReady(scope)) {
              setScopeError('Select grant segment and ERR room to continue.');
              return;
            }
            setScopeError(null);
            onChooseManual(scope);
          }}
        >
          Continue to form
        </button>

        <button
          type="button"
          onClick={() => setStep('method')}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#8a97ab] hover:text-brand-orange"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="app-section-label mb-1">F1 · Work Plans</p>
        <h2 className="text-xl font-bold text-white leading-snug mb-1">Create an F1</h2>
        <p className="text-sm text-[#a8b6cc] mb-0">
          Upload a completed form or fill it in yourself.
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto pb-2 scrollbar-none mb-4">
        <div className="flex w-max min-w-full gap-3 px-4 snap-x snap-mandatory items-stretch">
          <HomeCard
            onClick={onChooseOcr}
            code="AI"
            title="Upload with AI"
            subtitle="PDF or Word form"
            illustration={ReportingScene}
            wash="bg-[#7B96C4]"
            size="md"
          />
          <HomeCard
            onClick={() => setStep('manual-scope')}
            code="Manual"
            title="Manual entry"
            subtitle="Fill the F1 form yourself"
            illustration={WorkPlanScene}
            wash="bg-brand-orangeSoft"
            size="md"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-medium text-[#8a97ab] hover:text-brand-orange"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        Back to drafts
      </button>
    </div>
  );
}
