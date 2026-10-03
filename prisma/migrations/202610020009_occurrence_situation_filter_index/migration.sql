BEGIN;

CREATE INDEX occurrences_situation_created
  ON public.occurrences(occurrence_situation,created_at DESC,id);

COMMIT;
