-- Funding pool totals (committed / pending) for state allocations.
--
-- The totals are worked out inside the database so every role sees the same state-wide figures,
-- even though a base room can only read its own room's projects. Only the sums come back,
-- never the projects themselves.
--
--   committed = funding_status 'committed' and status approved, active or completed
--   pending   = funding_status 'allocated' and status pending
--   amount    = sum of expenses[].total_cost (as the app has always counted it)
--
-- Callers: active base_err, state_err, support, admin, superadmin. Each only gets totals for
-- allocations of states they work in (their room's state, their visible states, or all for superadmin).
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.funding_pool_totals(p_allocation_ids uuid[])
RETURNS TABLE (allocation_id uuid, committed numeric, pending numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_role text; v_status text; v_all boolean; v_states text[]; v_my_state text;
BEGIN
  SELECT u.role, u.status, coalesce(u.can_see_all_states, false), coalesce(u.visible_states, '{}'), s.state_name
    INTO v_role, v_status, v_all, v_states, v_my_state
  FROM public.users u
  LEFT JOIN public.emergency_rooms er ON er.id = u.err_id
  LEFT JOIN public.states s ON s.id = er.state_reference
  WHERE u.id = auth.uid();

  IF v_role IS NULL OR v_status IS DISTINCT FROM 'active'
     OR v_role NOT IN ('base_err', 'state_err', 'support', 'admin', 'superadmin') THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT a.id,
         coalesce(sum(x.amount) FILTER (WHERE p.funding_status = 'committed'
                                          AND p.status IN ('approved', 'active', 'completed')), 0)::numeric,
         coalesce(sum(x.amount) FILTER (WHERE p.funding_status = 'allocated'
                                          AND p.status = 'pending'), 0)::numeric
  FROM public.cycle_state_allocations a
  LEFT JOIN public.err_projects p ON p.cycle_state_allocation_id = a.id
  LEFT JOIN LATERAL (
    SELECT coalesce(sum(
             CASE
               WHEN jsonb_typeof(e -> 'total_cost') = 'number' THEN (e ->> 'total_cost')::numeric
               WHEN jsonb_typeof(e -> 'total_cost') = 'string'
                    AND btrim(e ->> 'total_cost') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN btrim(e ->> 'total_cost')::numeric
               ELSE 0
             END), 0) AS amount
    FROM jsonb_array_elements(
           CASE
             WHEN jsonb_typeof(p.expenses) = 'array' THEN p.expenses
             WHEN jsonb_typeof(p.expenses) = 'string'
                  AND left(btrim(p.expenses #>> '{}'), 1) = '[' THEN (p.expenses #>> '{}')::jsonb
             ELSE '[]'::jsonb
           END) AS e
  ) x ON true
  WHERE a.id = ANY (p_allocation_ids)
    AND (v_role = 'superadmin' OR v_all OR a.state_name = v_my_state OR a.state_name = ANY (v_states))
  GROUP BY a.id;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.funding_pool_totals(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.funding_pool_totals(uuid[]) TO authenticated;
