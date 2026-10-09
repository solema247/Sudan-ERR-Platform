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

export default function ProjectsPage() {
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
      <AppShell title="Projects">
        <p className="text-gray-500 text-sm">Loading…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title={t('projects', 'Projects')}>
      {view === 'menu' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-2">
            {t('projectsInstructions', 'Manage project applications and status.')}
          </p>
          <button
            type="button"
            onClick={openApplication}
            className="w-full rounded-xl bg-brand-deep text-white py-3 px-4 font-medium text-start"
          >
            {t('projectApplication', 'Project application')}
          </button>
          <button
            type="button"
            onClick={() => setView('status')}
            className="w-full rounded-xl bg-white border border-green-200 py-3 px-4 font-medium text-start text-gray-900"
          >
            {t('projectStatus', 'Project status')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="w-full rounded-xl bg-white border border-green-100 py-3 px-4 text-sm text-gray-600"
          >
            {t('returnToMainMenu', 'Back to home')}
          </button>
        </div>
      )}

      {view === 'funding' && (
        <div className="bg-white rounded-xl border border-green-100 p-4">
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
        <div className="bg-white rounded-xl border border-green-100 p-4">
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
        <div className="bg-white rounded-xl border border-green-100 p-4">
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
      ...(await serverSideTranslations(locale || 'ar', ['menu', 'project-application', 'project-status'])),
    },
  };
}
