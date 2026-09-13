-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)
-- Adds the columns needed for the computed Environmental Severity Index (ESI).
--
-- `severity` is kept as-is: it now stores the *computed* level instead of a
-- value the reporter picked, so the map/dashboard colour-coding logic that
-- already reads `severity` does not need to change.

alter table reports
  add column if not exists affected_area text,
  add column if not exists wildlife_impact boolean default false,
  add column if not exists esi_score numeric(4, 1);

comment on column reports.affected_area is 'small | medium | large — footprint of the pollution/incident, used to compute esi_score';
comment on column reports.wildlife_impact is 'true if dead or injured marine life was observed';
comment on column reports.esi_score is 'Environmental Severity Index (0-10), computed via a weighted sum of pollution type + affected area + wildlife impact';
