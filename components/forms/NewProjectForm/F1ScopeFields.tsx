import React, { useEffect, useMemo, useState } from 'react';
import { newSupabase } from '../../../services/newSupabaseClient';

export type F1ScopeValue = {
  emergency_room_id: string;
  grant_segment: string;
  state_name: string;
  locality: string;
  room_label: string;
  /** Canvas org that will own the F1 (Prod organization_id) */
  organization_id: string;
  organization_label: string;
};

type GrantSegment = {
  id: string;
  code: string;
  label_en: string;
  label_ar: string | null;
};

type RoomRow = {
  id: string;
  name: string | null;
  name_ar: string | null;
  err_code: string | null;
  states?: {
    state_name?: string | null;
    state_name_ar?: string | null;
    locality?: string | null;
    locality_ar?: string | null;
  } | null;
};

type OrgOption = {
  id: string;
  slug: string;
  name: string;
  org_type: string;
  is_default_owner?: boolean;
};

type F1ScopeFieldsProps = {
  value: F1ScopeValue;
  onChange: (next: F1ScopeValue) => void;
  locale?: string;
  /** Tighter labels + 2-column rows on upload screens */
  compact?: boolean;
  /** Show + require canvas org (OCR upload — includes LCC coordinator) */
  showOrganization?: boolean;
};

const selectClass = 'app-input !py-2 text-sm';
const labelClass = 'font-semibold block text-xs text-[#a8b6cc] mb-1';

export default function F1ScopeFields({
  value,
  onChange,
  locale = 'en',
  compact = false,
  showOrganization = false,
}: F1ScopeFieldsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsRoomPicker, setNeedsRoomPicker] = useState(false);
  const [segments, setSegments] = useState<GrantSegment[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await newSupabase.auth.getSession();
        if (!session) throw new Error('Not signed in');

        const headers = { Authorization: `Bearer ${session.access_token}` };
        const [scopeRes, orgRes] = await Promise.all([
          fetch('/api/f1/scope-options', { headers }),
          showOrganization
            ? fetch('/api/f1/org-options', { headers })
            : Promise.resolve(null),
        ]);

        const data = await scopeRes.json();
        if (!scopeRes.ok || !data.success) {
          throw new Error(data.message || 'Failed to load options');
        }
        if (cancelled) return;

        setNeedsRoomPicker(!!data.needsRoomPicker);
        setSegments(data.grant_segments || []);
        setStates(data.states || []);
        setRooms(data.rooms || []);

        if (orgRes) {
          const orgData = await orgRes.json();
          if (!orgRes.ok || !orgData.success) {
            throw new Error(orgData.message || 'Failed to load organizations');
          }
          if (!cancelled) setOrganizations(orgData.organizations || []);
        }

        if (!data.needsRoomPicker && data.err_id) {
          const room = (data.rooms || []).find((r: RoomRow) => r.id === data.err_id);
          if (room) {
            const place = placeLabels(room, locale);
            onChange({
              ...value,
              emergency_room_id: room.id,
              grant_segment: value.grant_segment || '',
              state_name: place.state_name,
              locality: place.locality,
              room_label: roomLabel(room, locale),
              organization_id: value.organization_id || '',
              organization_label: value.organization_label || '',
            });
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load scope');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOrganization]);

  const isAr = !!locale?.startsWith('ar');

  const roomsInState = useMemo(() => {
    if (!value.state_name) return rooms;
    return rooms.filter((r) => {
      const place = placeLabels(r, locale);
      // Match either locale label or canonical English key
      return (
        place.state_name === value.state_name ||
        r.states?.state_name === value.state_name ||
        r.states?.state_name_ar === value.state_name
      );
    });
  }, [rooms, value.state_name, locale]);

  const stateOptions = useMemo(() => {
    const map = new Map<string, string>(); // value key (EN) -> display
    for (const r of rooms) {
      const en = r.states?.state_name;
      if (!en) continue;
      const display = isAr
        ? r.states?.state_name_ar || en
        : en || r.states?.state_name_ar || '';
      if (!map.has(en)) map.set(en, display);
    }
    // Also include API states list as EN keys
    for (const s of states) {
      if (!map.has(s)) map.set(s, s);
    }
    return Array.from(map.entries())
      .map(([valueKey, label]) => ({ valueKey, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rooms, states, isAr]);

  const segmentLabel = (s: GrantSegment) =>
    isAr && s.label_ar ? s.label_ar : s.label_en;

  if (loading) {
    return <p className="text-sm text-[#a8b6cc]">Loading options…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-400/30 text-red-300 px-3 py-2 text-sm">
        {error}
      </div>
    );
  }

  const gap = compact ? 'gap-2.5' : 'gap-3';
  const stack = compact ? `grid ${gap}` : `space-y-3`;

  const orgLabel = (o: OrgOption) => o.name;

  return (
    <div className={stack}>
      {needsRoomPicker ? (
        <div className={`grid grid-cols-2 ${gap}`}>
          <div className="min-w-0">
            <label className={labelClass}>State</label>
            <select
              className={selectClass}
              value={
                stateOptions.find(
                  (s) =>
                    s.valueKey === value.state_name || s.label === value.state_name
                )?.valueKey || value.state_name
              }
              onChange={(e) => {
                const state_name = e.target.value;
                const opt = stateOptions.find((s) => s.valueKey === state_name);
                onChange({
                  ...value,
                  state_name: opt?.label || state_name,
                  emergency_room_id: '',
                  locality: '',
                  room_label: '',
                });
              }}
            >
              <option value="">Select</option>
              {stateOptions.map((s) => (
                <option key={s.valueKey} value={s.valueKey}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className={labelClass}>ERR room</label>
            <select
              className={selectClass}
              value={value.emergency_room_id}
              disabled={!value.state_name}
              onChange={(e) => {
                const id = e.target.value;
                const room = rooms.find((r) => r.id === id);
                const place = room ? placeLabels(room, locale) : { state_name: '', locality: '' };
                onChange({
                  ...value,
                  emergency_room_id: id,
                  locality: place.locality,
                  state_name: place.state_name || value.state_name,
                  room_label: room ? roomLabel(room, locale) : '',
                });
              }}
            >
              <option value="">Select</option>
              {roomsInState.map((r) => (
                <option key={r.id} value={r.id}>
                  {roomLabel(r, locale)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label className={labelClass}>ERR room</label>
          <div className={`${selectClass} bg-[#1c2d48] text-[#a8b6cc] truncate`}>
            {value.room_label || 'Your room'}
          </div>
        </div>
      )}

      {showOrganization ? (
        <div className={`grid grid-cols-2 ${gap}`}>
          <div className="min-w-0">
            <label className={labelClass}>Grant segment</label>
            <select
              className={selectClass}
              value={value.grant_segment}
              onChange={(e) => onChange({ ...value, grant_segment: e.target.value })}
            >
              <option value="">Select</option>
              {segments.map((s) => (
                <option key={s.id} value={s.code}>
                  {segmentLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className={labelClass}>Organization</label>
            <select
              className={selectClass}
              value={value.organization_id}
              onChange={(e) => {
                const id = e.target.value;
                const org = organizations.find((o) => o.id === id);
                onChange({
                  ...value,
                  organization_id: id,
                  organization_label: org ? org.name : '',
                });
              }}
            >
              <option value="">Select</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {orgLabel(o)}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div>
          <label className={labelClass}>Grant segment</label>
          <select
            className={selectClass}
            value={value.grant_segment}
            onChange={(e) => onChange({ ...value, grant_segment: e.target.value })}
          >
            <option value="">Select</option>
            {segments.map((s) => (
              <option key={s.id} value={s.code}>
                {segmentLabel(s)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function placeLabels(room: RoomRow, locale: string) {
  const st = room.states;
  if (!st) return { state_name: '', locality: '' };
  const ar = !!locale?.startsWith('ar');
  return {
    state_name: ar
      ? st.state_name_ar || st.state_name || ''
      : st.state_name || st.state_name_ar || '',
    locality: ar
      ? st.locality_ar || st.locality || ''
      : st.locality || st.locality_ar || '',
  };
}

function roomLabel(room: RoomRow, locale: string) {
  const name =
    locale?.startsWith('ar') ? room.name_ar || room.name : room.name || room.name_ar;
  return [room.err_code, name].filter(Boolean).join(' · ') || room.id;
}

export function scopeIsReady(
  scope: F1ScopeValue,
  opts?: { requireOrganization?: boolean }
) {
  if (!scope.grant_segment) return false;
  if (!scope.emergency_room_id) return false;
  if (opts?.requireOrganization && !scope.organization_id) return false;
  return true;
}

export function emptyF1Scope(): F1ScopeValue {
  return {
    emergency_room_id: '',
    grant_segment: '',
    state_name: '',
    locality: '',
    room_label: '',
    organization_id: '',
    organization_label: '',
  };
}
