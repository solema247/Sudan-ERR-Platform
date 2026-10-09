import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
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
  /** Where selecting a project navigates (reporting flow) */
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
          // Derive room filters from first page
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
      router.push(`/reporting/${project.id}`);
    }
  };

  const labelFor = useMemo(
    () => (p: ProjectRow) => {
      const roomBit =
        !p.is_own_room && p.room
          ? ` — ${(locale === 'ar' ? p.room.name_ar || p.room.name : p.room.name || p.room.name_ar) || p.room.err_code}`
          : '';
      const locality = p.locality ? ` (${p.locality})` : '';
      return `${p.project_objectives || 'Untitled'}${roomBit}${locality}`;
    },
    [locale]
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 rtl:left-auto rtl:right-3" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects, locality, room…"
          className="w-full rounded-lg border border-green-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue rtl:pl-3 rtl:pr-10"
        />
      </div>

      {rooms.length > 1 && (
        <select
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
          className="w-full rounded-lg border border-green-200 bg-white py-2 px-3 text-sm"
        >
          <option value="">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      )}

      <p className="text-xs text-gray-500">
        {total} project{total === 1 ? '' : 's'}
        {debouncedQ ? ` matching “${debouncedQ}”` : ''}
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>
      )}

      <div ref={listRef} className="space-y-2">
        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full text-start rounded-xl bg-white border border-green-100 px-4 py-3 shadow-sm hover:border-brand-blue transition-colors"
            >
              <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-3">
                {p.project_objectives || 'Untitled'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {[p.locality, p.state].filter(Boolean).join(' · ')}
                {!p.is_own_room && p.room
                  ? ` · ${(locale === 'ar' ? p.room.name_ar || p.room.name : p.room.name) || p.room.err_code}`
                  : ''}
              </p>
            </button>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-green-100 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-green-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Objectives</th>
                <th className="px-4 py-3 font-medium">Locality</th>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium w-28"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-green-50 hover:bg-green-50/50">
                  <td className="px-4 py-3 max-w-md">
                    <span className="line-clamp-2">{p.project_objectives || 'Untitled'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.locality || '—'}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {(locale === 'ar' ? p.room?.name_ar || p.room?.name : p.room?.name || p.room?.name_ar) ||
                      p.room?.err_code ||
                      '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleSelect(p)}
                      className="text-brand-deep font-medium hover:underline"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="flex justify-center py-6 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}

        {!loading && projects.length === 0 && (
          <p className="text-center text-gray-500 py-8 text-sm">No projects found.</p>
        )}

        {hasMore && !loading && (
          <button
            type="button"
            onClick={() => fetchPage(offset, false)}
            className="w-full rounded-lg border border-green-200 bg-white py-2.5 text-sm font-medium text-brand-deep hover:bg-green-50"
          >
            Load more
          </button>
        )}
      </div>
    </div>
  );
};

export default ProjectIndex;
