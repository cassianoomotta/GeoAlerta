-- Supports bounded keyset reads of the newest audit events without rewriting or deleting history.
CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_events_at_id_desc
  ON public.audit_events (at DESC, id DESC);
