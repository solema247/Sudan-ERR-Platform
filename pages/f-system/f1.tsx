import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AppShell from '../../components/layout/AppShell';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import ProjectStatus from '../project-status';
import ProjectApplication from '../../components/forms/NewProjectForm/NewProjectForm';
import ProjectDrafts from '../../components/forms/NewProjectForm/ProjectDrafts';
import FundingCycleSelection from '../../components/forms/NewProjectForm/FundingCycleSelection';
import { newSupabase } from '../../services/newSupabaseClient';

type View = 'menu' | 'application' | 'status' | 'funding' | 'drafts';

export default function F1WorkPlansPage() {
  const { ready } = useRequireAuth();
  const { t } = useTranslation('menu');
  const router = useRouter();
  const [view, setView] = useState<View>('menu');
  const [drafts, setDrafts] = useState<any[]>([]);
  const [currentDraft, setCurrentDraft] = useState<any>(null);
  const [selectedFundingCycle, setSelectedFundingCycle] = useState<any>(null);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);
  const [showDraftList, setShowDraftList] = useState(true);

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
    setView('funding');
  };

  if (!ready) {
    return (
      <AppShell title="F1 Work Plans">
        <p className="text-ink-muted text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="F1 Work Plans">
      {view === 'menu' && (
        <div className="space-y-3">
          <div className="mb-1">
            <p className="app-section-label mb-1">F1 · Work Plans</p>
            <p className="text-sm text-ink-muted mb-0">
              {t('projectsInstructions', 'Apply for a project or review project status.')}
            </p>
          </div>
          <button type="button" onClick={openApplication} className="app-action-primary">
            {t('projectApplication', 'Project application')}
          </button>
          <button type="button" onClick={() => setView('status')} className="app-action">
            {t('projectStatus', 'Project status')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/f-system')}
            className="text-sm font-medium text-ink-muted hover:text-brand-deep px-1 py-2"
          >
            Back to F-System
          </button>
        </div>
      )}

      {view === 'funding' && (
        <div className="app-panel p-4">
          <FundingCycleSelection
            onReturnToMenu={() => {
              setView('application');
              setShowDraftList(true);
            }}
          />
          <button
            type="button"
            className="mt-4 text-sm text-brand-deep underline"
            onClick={() => setView('menu')}
          >
            Back
          </button>
        </div>
      )}

      {view === 'application' && (
        <div className="app-panel p-4">
          {showDraftList && !projectToEdit ? (
            <ProjectDrafts
              drafts={drafts.map((d) => ({
                ...d,
                last_modified: d.last_modified || new Date().toISOString(),
              }))}
              onEditDraft={(draftId) => {
                setCurrentDraft(drafts.find((d) => d.id === draftId));
                setShowDraftList(false);
              }}
              onDeleteDraft={(draftId) => setDrafts(drafts.filter((d) => d.id !== draftId))}
              onNewProject={() => {
                setCurrentDraft(null);
                setShowDraftList(false);
              }}
              onReturnToMenu={() => setView('menu')}
            />
          ) : (
            <ProjectApplication
              onReturnToMenu={() => {
                if (projectToEdit) {
                  setView('status');
                  setProjectToEdit(null);
                } else {
                  setShowDraftList(true);
                }
              }}
              initialValues={currentDraft}
              projectToEdit={projectToEdit}
              selectedFundingCycle={selectedFundingCycle}
              onDraftSubmitted={() => {
                setShowDraftList(true);
                setProjectToEdit(null);
                fetchDrafts();
              }}
            />
          )}
        </div>
      )}

      {view === 'status' && (
        <div className="app-panel p-4">
          <ProjectStatus
            onReturnToMenu={() => setView('menu')}
            onEditProject={(projectId) => {
              setProjectToEdit(projectId);
              setView('application');
              setShowDraftList(false);
            }}
          />
        </div>
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
