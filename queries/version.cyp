// name: merge_version_from_service
// DEPRECATED. (unique key constraint: url...)
MERGE (ver:version:annotation { resource: {resource_id}, service: {service}, language:{language} })
  ON CREATE SET
    ver.creation_date = {creation_date},
    ver.creation_time = {creation_time},
    ver.unknowns = {unknowns},
    ver.persons = {persons},
    ver.yaml = {yaml}
  ON MATCH SET
    ver.language = {language},
    ver.unknowns = {unknowns},
    ver.persons = {persons},
    ver.yaml = {yaml}
  RETURN ver
  
// name: merge_relationship_version_resource
// DEPRECATED. link a resource with an entity, it it han't been done yet.
MATCH (ver:version), (res:resource)
  WHERE id(ver)={version_id} AND id(res)={resource_id}
WITH ver, res
  MERGE (ver)-[r:describes]->(res)
RETURN ver, res, r

// name: merge_relationship_resource_version
// merge at the same thie the version object
MATCH (res:resource)
WHERE id(res)={resource_id}
WITH res
MERGE (ver:version:annotation { resource: {resource_id}, service: {service}, language:{language} })
  ON CREATE SET
    ver.creation_date = {creation_date},
    ver.creation_time = {creation_time},
    ver.yaml = {yaml}
  ON MATCH SET
    ver.language = {language},
    ver.yaml = {yaml}
WITH ver, res
MERGE (ver)-[r:describes]->(res)
  ON CREATE SET
    r.creation_date = {creation_date},
    r.creation_time = {creation_time}
  ON MATCH SET
    r.last_modification_date = {creation_date},
    r.last_modification_time = {creation_time}
RETURN {
  id: id(ver),
  type: last(labels(ver)),
  props: ver,
  rel: r
} as result