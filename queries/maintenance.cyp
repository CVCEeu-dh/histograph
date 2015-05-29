// name: get_entity_duplicates_by_wiky
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
  collect(n) as ent
WITH ent, length(unique_names) as un, length(ent) as c
WHERE un > 1 AND c > 1
RETURN ent, un
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