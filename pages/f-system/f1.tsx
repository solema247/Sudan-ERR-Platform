import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import AppShell from '../../components/layout/AppShell';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import ProjectStatus from '../project-status';
import ProjectApplication, {
  F1RoomScope,
} from '../../components/forms/NewProjectForm/NewProjectForm';
import ProjectDrafts from '../../components/forms/NewProjectForm/ProjectDrafts';
import F1CreateChooser from '../../components/forms/NewProjectForm/F1CreateChooser';
import F1OcrUpload from '../../components/forms/NewProjectForm/F1OcrUpload';
import F1OcrReview from '../../components/forms/NewProjectForm/F1OcrReview';
import { HomeCard } from '../../components/home/HomeSection';
import { WorkPlanScene, ApprovalsScene } from '../../components/home/illustrations';
import { newSupabase } from '../../services/newSupabaseClient';
import type { F1ScopeValue } from '../../components/forms/NewProjectForm/F1ScopeFields';
import type { F1OcrReviewPayload } from '../../lib/f1/mapReviewTypes';

type View =
  | 'menu'
  | 'application'
  | 'status'
  | 'create-method'
  | 'ocr-upload'
  | 'ocr-review'
  | 'form';

export default function F1WorkPlansPage() {
  const { ready } = useRequireAuth();
  const { t } = useTranslation('menu');
  const [view, setView] = useState<View>('menu');
  const [drafts, setDrafts] = useState<any[]>([]);
  const [currentDraft, setCurrentDraft] = useState<any>(null);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);
  const [roomScope, setRoomScope] = useState<F1RoomScope | null>(null);
  const [ocrReviewPayload, setOcrReviewPayload] = useState<F1OcrReviewPayload | null>(null);

  const fetchDrafts = async () => {
    const {
      data: { session },
    } = await newSupabase.auth.getSession();
    if (!session) return;
    const res = await fetch('/api/project-drafts', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setDrafts(data.drafts || data.projects || []);
    }
  };

  const openApplication = async () => {
    await fetchDrafts();
    setCurrentDraft(null);
    setProjectToEdit(null);
    setRoomScope(null);
    setView('application');
  };

  const scopeFromChooser = (scope: F1ScopeValue): F1RoomScope => ({
    emergency_room_id: scope.emergency_room_id,
    grant_segment: scope.grant_segment,
    state_name: scope.state_name,
    locality: scope.locality,
    room_label: scope.room_label,
  });

  if (!ready) {
    return (
      <AppShell title="F1 Work Plans">
        <p className="text-[#a8b6cc] text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="F1 Work Plans">
      {view === 'menu' && (
        <div>
          <div className="mb-6">
            <p className="app-section-label mb-1">F1 · Work Plans</p>
            <h2 className="text-xl font-bold text-white leading-snug mb-1">
              What do you want to do?
            </h2>
            <p className="text-sm text-[#a8b6cc] mb-0">
              {t(
                'projectsInstructions',
                'Apply for a project linked to your room, or review project status.'
              )}
            </p>
          </div>

          <section className="mb-6">
            <div className="flex items-center gap-1.5 mb-3 px-0.5">
              <h3 className="text-lg font-bold text-white leading-tight">Actions</h3>
            </div>
            <div className="-mx-4 overflow-x-auto pb-2 scrollbar-none">
              <div className="flex w-max min-w-full gap-3 px-4 snap-x snap-mandatory items-stretch">
                <HomeCard
                  onClick={openApplication}
                  code="Apply"
                  title="F1 - Project Application"
                  subtitle="New work plan for your room"
                  illustration={WorkPlanScene}
                  wash="bg-brand-orangeSoft"
                  size="md"
                />
                <HomeCard
                  onClick={() => setView('status')}
                  code="Status"
                  title="F1 - Application Status"
                  subtitle="Track submitted plans"
                  illustration={ApprovalsScene}
                  wash="bg-[#7B96C4]"
                  size="md"
                />
              </div>
            </div>
          </section>

          <Link
            href="/f-system"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#8a97ab] hover:text-brand-orange transition-colors"
          >
            <span className="rtl:rotate-180 inline-flex">
              <ChevronRight className="h-4 w-4 rotate-180" />
            </span>
            Back to F-System
          </Link>
        </div>
      )}

      {view === 'application' && (
        <ProjectDrafts
          drafts={drafts.map((d) => ({
            ...d,
            last_modified: d.last_modified || new Date().toISOString(),
          }))}
          onEditDraft={(draftId) => {
            const draft = drafts.find((d) => d.id === draftId);
            setCurrentDraft(draft);
            setRoomScope(
              draft?.emergency_room_id
                ? {
                    emergency_room_id: draft.emergency_room_id,
                    grant_segment: draft.grant_segment || '',
                    state_name: draft.state || '',
                    locality: draft.locality || '',
                    room_label: '',
                  }
                : null
            );
            setView('form');
          }}
          onDeleteDraft={(draftId) => setDrafts(drafts.filter((d) => d.id !== draftId))}
          onNewProject={() => {
            setCurrentDraft(null);
            setProjectToEdit(null);
            setRoomScope(null);
            setView('create-method');
          }}
          onReturnToMenu={() => setView('menu')}
        />
      )}

      {view === 'create-method' && (
        <F1CreateChooser
          onBack={() => setView('application')}
          onChooseOcr={() => setView('ocr-upload')}
          onChooseManual={(scope) => {
            setRoomScope(scopeFromChooser(scope));
            setCurrentDraft(null);
            setView('form');
          }}
        />
      )}

      {view === 'ocr-upload' && (
        <F1OcrUpload
          onBack={() => setView('create-method')}
          onOcrComplete={(payload) => {
            setOcrReviewPayload(payload);
            setView('ocr-review');
          }}
        />
      )}

      {view === 'ocr-review' && ocrReviewPayload && (
        <F1OcrReview
          payload={ocrReviewPayload}
          onBack={() => {
            setOcrReviewPayload(null);
            setView('ocr-upload');
          }}
          onSubmitted={() => {
            setOcrReviewPayload(null);
            setView('application');
            fetchDrafts();
          }}
        />
      )}

      {view === 'form' && (
        <ProjectApplication
          onReturnToMenu={() => {
            if (projectToEdit) {
              setView('status');
              setProjectToEdit(null);
            } else {
              setView('application');
              fetchDrafts();
            }
          }}
          initialValues={currentDraft}
          projectToEdit={projectToEdit}
          roomScope={roomScope}
          onDraftSubmitted={() => {
            setProjectToEdit(null);
            setView('application');
            fetchDrafts();
          }}
        />
      )}

      {view === 'status' && (
        <ProjectStatus
          onReturnToMenu={() => setView('menu')}
          onEditProject={(projectId) => {
            setProjectToEdit(projectId);
            setView('form');
          }}
        />
      )}
    </AppShell>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'ar', [
        'menu',
        'project-application',
        'project-status',
      ])),
    },
  };
}
