// name: DEPRECATED_get_entity_duplicates_by_wiky
// find all node that have duplicates
MATCH (n:entity)
WHERE has(n.links_wiki) AND length(n.links_wiki) > 0
WITH 
  n.links_wiki as w,
  collect(n.name) as names,
  collect(DISTINCT n.name) as unique_names,
  collect(n) as ent
WITH ent, length(unique_names) as un, length(ent) as c
WHERE un = 1 AND c > 1
RETURN ent, un
ORDER BY c DESC

// name: get_entity_duplicates_candidates_by_wiky
// find all node that have duplicates
MATCH (n:entity)
WHERE has(n.links_wiki) AND length(n.links_wiki) > 0
WITH 
  n.links_wiki as w,
  collect(n.name) as names,
  collect(DISTINCT n.name) as unique_names,
  collect(n) as entities
WITH entities, unique_names, length(unique_names) as un, length(entities) as c
WHERE un > 1 AND c > 1
RETURN entities, c, unique_names
ORDER BY c DESC


// name: get_entity_relationships
// find all in/out relationship for a given node
MATCH (alter)-[r]->(related)
WHERE id(alter) = {alter_id}
RETURN {
  alter_id: id(alter),
  related_id: id(related),
  r:r
} as result

// name: export_people
// get all entity:person in order to refine them.
MATCH (n:person)
WITH n
RETURN {
  id: id(n),
  doi: n.doi,
  name: n.name,
  name_disambiguated: COALESCE(n.name_disambiguated, n.name),
  description: n.description,
  birth_date: n.birth_date,
  birth_time: n.birth_time,
  death_date: n.death_date,
  death_time: n.death_time,
  birth_place: n.birth_place,
  death_place: n.death_place,
  links_wiki: n.links_wiki,
  links_worldcat: n.links_worldcat,
  links_viaf: n.links_viaf,
  abstract: COALESCE(n.abstract_en, n.abstract_fr, n.abstract_de)
} as per



// name: get_entity_duplicates_candidates_by_name
// find all node that have duplicates by name
MATCH (n:person)
WHERE has(n.name) AND length(n.name) > 0
WITH n.name as named, collect(n) as entities
WITH named, entities, length(entities) as c
WHERE c > 1
RETURN named, entities, c
ORDER BY c DESC