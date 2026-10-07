-- Feedback & support tickets from the app, synced to GitHub Issues by /api/feedback-tickets.
--
-- Safe to run more than once. If the main schema isn't loaded yet (public.users missing),
-- it does nothing and says so; run it again after the schema is in place.
--
-- Privacy: tickets store the sender's room code for follow-up through the coordinator.
-- user_id stays in the database (staff-only) and is never sent to GitHub.

DO $migration$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE NOTICE 'feedback_tickets: public.users not found yet - skipped. Run again after loading the schema.';
    RETURN;
  END IF;

  CREATE TABLE IF NOT EXISTS public.feedback_tickets (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at          timestamptz NOT NULL DEFAULT now(),
    user_id             uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id),
    room_code           text,
    ticket_type         text NOT NULL CHECK (ticket_type IN ('bug', 'feedback', 'support')),
    subject             text NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 150),
    description         text NOT NULL CHECK (char_length(description) BETWEEN 5 AND 4000),
    rating              smallint CHECK (rating BETWEEN 1 AND 5),
    language            text CHECK (language IN ('ar', 'en', 'es')),
    page                text CHECK (char_length(page) <= 100),
    sync_status         text NOT NULL DEFAULT 'pending'
                        CHECK (sync_status IN ('pending', 'synced', 'failed', 'not_configured', 'blocked_public_repo')),
    sync_error          text,
    sync_attempts       integer NOT NULL DEFAULT 0,
    github_issue_number integer,
    github_issue_url    text,
    synced_at           timestamptz
  );
  CREATE INDEX IF NOT EXISTS feedback_tickets_sync_status_idx ON public.feedback_tickets (sync_status) WHERE sync_status <> 'synced';

  ALTER TABLE public.feedback_tickets ENABLE ROW LEVEL SECURITY;

  -- Active app users (not partners, not pending) file tickets as themselves; sync fields start empty.
  DROP POLICY IF EXISTS feedback_tickets_insert_own ON public.feedback_tickets;
  CREATE POLICY feedback_tickets_insert_own ON public.feedback_tickets FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
      AND sync_status = 'pending' AND github_issue_number IS NULL AND github_issue_url IS NULL
      AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'active'
                  AND u.role IN ('base_err', 'state_err', 'support', 'admin', 'superadmin'))
    );

  -- You can see your own tickets; support, admin and superadmin see all of them.
  DROP POLICY IF EXISTS feedback_tickets_read ON public.feedback_tickets;
  CREATE POLICY feedback_tickets_read ON public.feedback_tickets FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'active'
                 AND u.role IN ('support', 'admin', 'superadmin'))
    );
  -- No UPDATE or DELETE policies: sync results go through feedback_ticket_record_sync() below.

  GRANT SELECT, INSERT ON public.feedback_tickets TO authenticated;
END
$migration$;

-- Record the result of a GitHub sync. Allowed once for the ticket's own sender (right after filing)
-- and any number of times for active admins/superadmins (retries).
CREATE OR REPLACE FUNCTION public.feedback_ticket_record_sync(
  p_ticket_id uuid, p_status text, p_issue_number integer DEFAULT NULL, p_issue_url text DEFAULT NULL, p_error text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  IF p_status NOT IN ('pending', 'synced', 'failed', 'not_configured', 'blocked_public_repo') THEN
    RAISE EXCEPTION 'invalid sync status %', p_status;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.feedback_tickets t WHERE t.id = p_ticket_id
      AND ((t.user_id = auth.uid() AND t.sync_attempts = 0)   -- sender: once, right after filing
           OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.status = 'active'
                      AND u.role IN ('admin', 'superadmin')))
  ) THEN
    RAISE EXCEPTION 'not allowed to update this ticket';
  END IF;
  UPDATE public.feedback_tickets
     SET sync_status = p_status,
         github_issue_number = coalesce(p_issue_number, github_issue_number),
         github_issue_url = coalesce(p_issue_url, github_issue_url),
         sync_error = CASE WHEN p_status = 'synced' THEN NULL ELSE left(p_error, 500) END,
         sync_attempts = sync_attempts + 1,
         synced_at = CASE WHEN p_status = 'synced' THEN now() ELSE synced_at END
   WHERE id = p_ticket_id;
END
$fn$;

REVOKE EXECUTE ON FUNCTION public.feedback_ticket_record_sync(uuid, text, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feedback_ticket_record_sync(uuid, text, integer, text, text) TO authenticated;
