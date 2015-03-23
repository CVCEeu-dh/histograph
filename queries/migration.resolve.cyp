// name: get_automatic_inquiries
// get 
MATCH (n:`inquiry` {strategy:'reconciliation'})
WHERE NOT(has(n.status)) OR (n.status <> 'reconciled' AND n.status <> 'irreconcilable')
WITH n
MATCH n-[*2]->(r:resource)
RETURN n,r


// name: merge_automatic_inquiries
// get 
MERGE (inq:inquiry {strategy:'reconciliation', content:{content}})
  ON CREATE SET
    inq.service={service},
    inq.content={content}
  ON MATCH SET
    inq.service={service},
    inq.content={content}
  RETURN inq


// name: merge_geocoding_entity
// get 
MERGE (k:entity:location { geocode_id:{geocode_id}})
  ON CREATE SET
    k.creation_date = timestamp(),
    k.geocode_query = {q},
    k.geocode_countryId = {countryId},
    k.geocode_countryName = {countryName},
    k.geocode_toponymName = {toponymName},
    k.geocode_formatted_address = {formatted_address},
    k.geocode_lat = {lat},
    k.geocode_lng = {lng},
    k.geocode_bounds_ne_lat = {ne_lat},
    k.geocode_bounds_ne_lng = {ne_lng},
    k.geocode_bounds_sw_lat = {sw_lat},
    k.geocode_bounds_sw_lng = {sw_lng}
  ON MATCH SET
    k.last_modification_date = timestamp(),
    k.geocode_query = {q},
    k.geocode_countryId = {countryId},
    k.geocode_countryName = {countryName},
    k.geocode_toponymName = {toponymName},
    k.geocode_formatted_address = {formatted_address},
    k.geocode_lat = {lat},
    k.geocode_lng = {lng},
    k.geocode_bounds_ne_lat = {ne_lat},
    k.geocode_bounds_ne_lng = {ne_lng},
    k.geocode_bounds_sw_lat = {sw_lat},
    k.geocode_bounds_sw_lng = {sw_lng}
  RETURN k

// name: merge_geonames_entity
// get 
MERGE (k:entity:location { geonames_id:{geonames_id} })
  ON CREATE SET
    k.creation_date = timestamp(),
    k.geonames_query = {q},
    k.geonames_countryId = {countryId},
    k.geonames_countryName = {countryName},
    k.geonames_countryCode = {countryCode},
    k.geonames_toponymName = {toponymName},
    k.geonames_lat = {lat},
    k.geonames_lng = {lng}
  ON MATCH SET
    k.last_modification_date = timestamp(),
    k.geonames_query = {q},
    k.geonames_countryId = {countryId},
    k.geonames_countryName = {countryName},
    k.geonames_countryCode = {countryCode},
    k.geonames_toponymName = {toponymName},
    k.geonames_lat = {lat},
    k.geonames_lng = {lng}
  RETURN k


// name: merge_relationship_entity_resource
// link a resource with an entity, it it han't been done yet.
MATCH (ent:entity), (res:resource)
  WHERE id(ent)={entity_id} AND id(res)={resource_id}
WITH ent, res
  MERGE (ent)-[r:appears_in]->(res)
RETURN ent, res


// name: merge_relationship_entity_resource_by_uri
// link a resource with an entity by uri and url
MATCH (ent:entity { uri:{uri}}), (res:resource {url:{url}})
MERGE (ent)-[r:appears_in]->(res)
RETURN ent, res, r


// name: merge_resource
// (unique key constraint: url...)
MERGE (k:resource { url:{url} })
  ON CREATE SET
    k.date = {date},
    k.reference = {reference},
    k.title = {title},
    k.place = {place},
    k.stakeholders = {stakeholders}
  ON MATCH SET
    k.date = {date},
    k.reference = {reference},
    k.title = {title},
    k.place = {place},
    k.stakeholders = {stakeholders}
  RETURN k


// name: merge_version
// (unique key constraint: url...)
MERGE (k:version { url:{url}, first: true })
  ON CREATE SET
    k.creation_date = timestamp()
  RETURN k


// name: merge_relationship_version_resource
// link a resource with an entity, it it han't been done yet.
MATCH (ver:version), (res:resource)
  WHERE id(ver)={version_id} AND id(res)={resource_id}
WITH ver, res
  MERGE (ver)-[r:describes]->(res)
RETURN ver, res, r


// name: merge_person_entity
// (unique key constraint: url...)
MERGE (k:entity:person { uri:{id} })
  ON CREATE SET
    k.name = {name}, 
    k.picture = {picture_image},
    k.picture_source = {picture_source},
    k.links_viaf = {links_viaf}, 
    k.links_worldcat = {links_worldcat}, 
    k.links_wiki = {links_wiki}
  ON MATCH SET
    k.name = {name},
    k.picture = {picture_image},
    k.picture_source = {picture_source},
    k.links_viaf = {links_viaf},
    k.links_worldcat = {links_worldcat}, 
    k.links_wiki = {links_wiki}
  RETURN k