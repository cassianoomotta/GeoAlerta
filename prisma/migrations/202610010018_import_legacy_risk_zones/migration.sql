BEGIN;
-- Fail atomically on malformed/foreign municipal zones. Never repair or invent
-- geometry silently. The untouched archive retains all historical attributes.
DO $$ DECLARE z record; g geometry; BEGIN
  FOR z IN SELECT * FROM public.legacy_risk_zones LOOP
    IF z.municipio NOT IN ('sa_patrulha','Santo Antônio da Patrulha') THEN
      RAISE EXCEPTION 'LEGACY_ZONE_MUNICIPALITY_REVIEW_REQUIRED';
    END IF;
    g := ST_SetSRID(ST_GeomFromGeoJSON((CASE WHEN z.geojson->>'type'='Feature'
      THEN z.geojson->'geometry' ELSE z.geojson END)::text),4326);
    IF g IS NULL OR ST_IsEmpty(g) OR NOT ST_IsValid(g)
      OR GeometryType(g) NOT IN ('POLYGON','MULTIPOLYGON')
      OR ST_XMin(Box3D(g)) < -180 OR ST_XMax(Box3D(g)) > 180
      OR ST_YMin(Box3D(g)) < -90 OR ST_YMax(Box3D(g)) > 90 THEN
      RAISE EXCEPTION 'LEGACY_ZONE_GEOMETRY_REVIEW_REQUIRED';
    END IF;
    IF EXISTS(SELECT FROM public.risk_zones WHERE zone_id=z.id) THEN
      RAISE EXCEPTION 'LEGACY_ZONE_ID_COLLISION';
    END IF;
    INSERT INTO public.risk_zones(zone_id,version,name,type,active,geometry)
      VALUES(z.id,1,z.name,'INUNDACAO',true,ST_Multi(g));
    INSERT INTO public.audit_events(entity_id,kind,changes)
      VALUES(z.id,'LEGACY_RISK_ZONE_IMPORTED',jsonb_build_object('version',1,'source','legacy_risk_zones'));
  END LOOP;
END $$;
COMMIT;
