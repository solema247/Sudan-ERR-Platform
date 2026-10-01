-- Project budget currency (USD or SDG), chosen on the F1 form. No conversion between them:
-- the USD funding pool only counts USD budgets. Projects without a currency (older ones) count as USD.
-- Safe to run more than once; does nothing if the ERR schema isn't loaded yet.

DO $migration$
BEGIN
  IF to_regclass('public.err_projects') IS NULL THEN
    RAISE NOTICE 'project currency: public.err_projects not found yet - skipped. Run again after loading the schema.';
    RETURN;
  END IF;

  ALTER TABLE public.err_projects ADD COLUMN IF NOT EXISTS currency text;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'err_projects_currency_check') THEN
    ALTER TABLE public.err_projects
      ADD CONSTRAINT err_projects_currency_check CHECK (currency IS NULL OR currency IN ('USD', 'SDG'));
  END IF;
  EXECUTE $c$COMMENT ON COLUMN public.err_projects.currency IS 'Budget currency from the F1 form: USD or SDG (NULL = USD, older projects)'$c$;
END
$migration$;

-- Funding pool totals: same as 20261001120000_funding_pool_totals.sql, counting USD budgets only.
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
                                          AND p.status IN ('approved', 'active', 'completed')
                                          AND coalesce(p.currency, 'USD') = 'USD'), 0)::numeric,
         coalesce(sum(x.amount) FILTER (WHERE p.funding_status = 'allocated'
                                          AND p.status = 'pending'
                                          AND coalesce(p.currency, 'USD') = 'USD'), 0)::numeric
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
