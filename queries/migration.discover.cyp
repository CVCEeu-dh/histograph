// name: get_empty_versions
// return the version node giving the image url
MATCH (ver:`version`)--(res:`resource`)
  WHERE res.mimetype= 'image'
  RETURN ver, res


// name: merge_version_from_service
// (unique key constraint: url...)
MERGE (ver:version { url: {url}, service: {service}})
  ON CREATE SET
    ver.creation_date = {creation_date},
    ver.creation_time = {creation_time},
    ver.unknowns = {unknowns},
    ver.persons = {persons},
    ver.yaml = {yaml}
  ON MATCH SET
    ver.unknowns = {unknowns},
    ver.persons = {persons},
    ver.yaml = {yaml}
  RETURN ver


// name: merge_relationship_version_resource
// link a resource with an entity, it it han't been done yet.
MATCH (ver:version), (res:resource)
  WHERE id(ver)={version_id} AND id(res)={resource_id}
WITH ver, res
  MERGE (ver)-[r:describes]->(res)
RETURN ver, res, r