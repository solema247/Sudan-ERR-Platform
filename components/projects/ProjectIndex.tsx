import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Loader2, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/router';

export type ProjectRow = {
  id: string;
  project_objectives: string;
  state?: string;
  locality?: string;
  err_id?: string;
  status?: string;
  is_own_room?: boolean;
  room?: { name?: string; name_ar?: string; err_code?: string } | null;
};

type ProjectIndexProps = {
  token: string;
  mode?: 'reporting' | 'browse';
  onSelect?: (project: ProjectRow) => void;
  locale?: string;
};

const PAGE_SIZE = 40;

const ProjectIndex: React.FC<ProjectIndexProps> = ({
  token,
  mode = 'reporting',
  onSelect,
  locale = 'en',
}) => {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [roomFilter, setRoomFilter] = useState('');
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<{ id: string; label: string }[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const fetchPage = useCallback(
    async (nextOffset: number, replace: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(nextOffset),
        });
        if (debouncedQ) params.set('q', debouncedQ);
        if (roomFilter) params.set('room_id', roomFilter);

        const res = await fetch(`/api/get-projects?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load projects');
        const data = await res.json();
        const list: ProjectRow[] = data.projects || [];
        setTotal(data.total ?? list.length);
        setOffset(nextOffset + list.length);
        setProjects((prev) => (replace ? list : [...prev, ...list]));

        if (replace && data.roomOptions) {
          setRooms(data.roomOptions);
        } else if (replace) {
          const map = new Map<string, string>();
          list.forEach((p) => {
            if (!p.err_id) return;
            const label =
              (locale === 'ar'
                ? p.room?.name_ar || p.room?.name
                : p.room?.name || p.room?.name_ar) ||
              p.room?.err_code ||
              p.err_id;
            map.set(String(p.err_id), label);
          });
          setRooms(Array.from(map.entries()).map(([id, label]) => ({ id, label })));
        }
      } catch (e: any) {
        setError(e.message || 'Error loading projects');
      } finally {
        setLoading(false);
      }
    },
    [token, debouncedQ, roomFilter, locale]
  );

  useEffect(() => {
    setProjects([]);
    setOffset(0);
    fetchPage(0, true);
  }, [fetchPage]);

  const hasMore = projects.length < total;

  const handleSelect = (project: ProjectRow) => {
    if (onSelect) {
      onSelect(project);
      return;
    }
    if (mode === 'reporting') {
      router.push(`/f-system/f4-f5/${project.id}`);
    }
  };

  const roomLabel = (p: ProjectRow) =>
    (locale === 'ar' ? p.room?.name_ar || p.room?.name : p.room?.name || p.room?.name_ar) ||
    p.room?.err_code ||
    null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a97ab] rtl:left-auto rtl:right-3" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects, locality, room…"
            className="w-full rounded-xl border border-white/10 bg-[#122038] pl-10 pr-3 rtl:pl-3 rtl:pr-10 py-2.5 text-sm text-white placeholder:text-[#6b7a94] outline-none focus:border-brand-orange/50"
          />
        </div>
        {rooms.length > 1 && (
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="sm:w-48 rounded-xl border border-white/10 bg-[#122038] px-3 py-2.5 text-sm text-white outline-none focus:border-brand-orange/50"
          >
            <option value="">All rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-xs font-semibold text-[#8a97ab] mb-0">
          {total} project{total === 1 ? '' : 's'}
          {debouncedQ ? ` matching “${debouncedQ}”` : ''}
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 text-red-300 text-sm px-3 py-2 border border-red-400/30">
          {error}
        </div>
      )}

      <div ref={listRef} className="space-y-2">
        <div className="md:hidden space-y-2">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full text-start rounded-xl border border-white/10 bg-[#122038]/80 px-4 py-3 flex items-start gap-3 hover:border-brand-orange/40 transition-all"
            >
              <span className="mt-0.5 h-2 w-2 rounded-full bg-brand-orange shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-white text-sm leading-snug line-clamp-3 block">
                  {p.project_objectives || 'Untitled'}
                </span>
                <span className="mt-1 text-xs text-[#8a97ab] block">
                  {[p.locality, p.state, !p.is_own_room ? roomLabel(p) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-[#6b7a94] shrink-0 mt-1 rtl:rotate-180" />
            </button>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto rounded-xl border border-white/10 bg-[#122038]/60">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[#8a97ab]">
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Objectives
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  Locality
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Room</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide w-28" />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                  onClick={() => handleSelect(p)}
                >
                  <td className="px-4 py-3 max-w-md font-medium text-white">
                    <span className="line-clamp-2">{p.project_objectives || 'Untitled'}</span>
                  </td>
                  <td className="px-4 py-3 text-[#a8b6cc] whitespace-nowrap">
                    {p.locality || '—'}
                  </td>
                  <td className="px-4 py-3 text-[#a8b6cc] whitespace-nowrap">
                    {roomLabel(p) || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-brand-orange font-semibold text-sm">
                      Open
                      <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="flex justify-center py-8 text-[#8a97ab]">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-[#122038]/60 px-4 py-10 text-center">
            <p className="text-sm text-[#a8b6cc] mb-0">No projects found.</p>
          </div>
        )}

        {hasMore && !loading && (
          <button
            type="button"
            onClick={() => fetchPage(offset, false)}
            className="w-full rounded-xl border border-white/10 bg-[#1c2d48] py-2.5 text-sm font-semibold text-[#a8b6cc] hover:text-white hover:border-brand-orange/40 transition-colors"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
};

export default ProjectIndex;
