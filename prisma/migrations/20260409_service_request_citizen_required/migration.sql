-- Backfill citizen records for legacy service requests without citizenId
INSERT INTO "public"."citizens" (
    "id",
    "fullName",
    "documentType",
    "documentNumber",
    "documentNumberNormalized",
    "phone",
    "createdAt",
    "updatedAt"
)
SELECT
    'ctz_req_' || md5(sr."id"),
    coalesce(nullif(trim(sr."citizenName"), ''), 'Nao informado'),
    'CPF',
    coalesce(nullif(trim(sr."citizenDocument"), ''), 'REQ-' || sr."id"),
    CASE
        WHEN coalesce(trim(sr."citizenDocument"), '') <> ''
            THEN upper(regexp_replace(sr."citizenDocument", '[^0-9A-Za-z]', '', 'g'))
        ELSE upper('REQ' || sr."id")
    END,
    nullif(trim(sr."citizenContact"), ''),
    now(),
    now()
FROM "public"."ServiceRequest" sr
WHERE sr."citizenId" IS NULL
ON CONFLICT ("documentNumberNormalized") DO NOTHING;

-- Attach all requests to a citizen using the same normalization strategy used in backfill
UPDATE "public"."ServiceRequest" sr
SET "citizenId" = c."id"
FROM "public"."citizens" c
WHERE sr."citizenId" IS NULL
  AND c."documentNumberNormalized" = CASE
      WHEN coalesce(trim(sr."citizenDocument"), '') <> ''
          THEN upper(regexp_replace(sr."citizenDocument", '[^0-9A-Za-z]', '', 'g'))
      ELSE upper('REQ' || sr."id")
  END;

-- Fail early if any orphan record remains before setting NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."ServiceRequest" sr
    WHERE sr."citizenId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot enforce NOT NULL on ServiceRequest.citizenId: orphan records still exist';
  END IF;
END $$;

ALTER TABLE "public"."ServiceRequest"
ALTER COLUMN "citizenId" SET NOT NULL;
