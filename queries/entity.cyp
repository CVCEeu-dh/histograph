// name: get_entity
//
MATCH (ent:entity)
  WHERE id(ent) = {id}
RETURN {
  id: id(ent),
  type: LAST(labels(ent)),
  props: ent
}


// name: get_entities_by_ids
//
MATCH (ent:entity)
WHERE id(ent) IN {ids}
WITH ent
OPTIONAL MATCH (ent)--(res:resource)
WITH ent, length(collect(DISTINCT res)) as resources
RETURN {
  id: id(ent),
    type: LAST(labels(ent)),
    props: ent,
    resources: resources
} as result
SKIP {offset}
LIMIT {limit}

// name: merge_entity
// create or merge entity, by name or links_wiki.
{if:links_wiki}
  MERGE (ent:entity:{:type} {links_wiki: {links_wiki}})
{/if}
{unless:links_wiki}
  MERGE (ent:entity:{:type} {name:{name}})
{/unless}
ON CREATE SET
  ent.name          = {name},
  ent.name_search   = {name_search},
  ent.celebrity     = 0,
  ent.score         = 0,
  {if:lat}
    ent.lat         = {lat},
  {/if}
  {if:lng}
    ent.lng         = {lng},
  {/if}
  {if:geoname_id}
    ent.geoname_id   = {geoname_id},
    ent.geoname_fcl  = {geoname_fcl},
    ent.geoname_country  = {geoname_country},
  {/if}
  {if:geocoding_id}
    ent.geocoding_id  = {geocoding_id},
    ent.geocoding_fcl = {geoname_fcl},
    ent.geocoding_country = {geocoding_country},
  {/if}
  ent.creation_date = {creation_date},
  ent.creation_time = {creation_time}
ON MATCH SET
  {if:lat}
    ent.lat         = {lat},
  {/if}
  {if:lng}
    ent.lng         = {lng},
  {/if}
  {if:geoname_id}
    ent.geoname_id   = {geoname_id},
    ent.geoname_fcl  = {geoname_fcl},
    ent.geoname_country  = {geoname_country},
  {/if}
  {if:geocoding_id}
    ent.geocoding_id  = {geocoding_id},
    ent.geocoding_fcl = {geoname_fcl},
    ent.geocoding_country = {geocoding_country},
  {/if}
  ent.last_modification_date = {creation_date},
  ent.last_modification_time = {creation_time}
WITH ent
LIMIT 1
MATCH (res:resource)
  WHERE id(res) = {resource_id}
WITH ent, res
  MERGE (ent)-[r:appears_in]->(res)
  ON CREATE SET
    {if:frequency}
      r.frequency   = {frequency},
    {/if}
    {if:languages}
      r.languages   = {languages},
    {/if}
    {if:services}
      r.services   = {services},
    {/if}
    r.creation_date = {creation_date},
    r.creation_time = {creation_time}
  ON MATCH SET
    {if:frequency}
      r.frequency   = {frequency},
    {/if}
    {if:languages}
      r.languages   = {languages},
    {/if}
    {if:services}
      r.services   = {services},
    {/if}
    r.last_modification_date = {creation_date},
    r.last_modification_time = {creation_time}
RETURN {
  id: id(ent),
  props: ent,
  type: last(labels(ent)),
  rel: r
} as result


// name: merge_user_entity_relationship
// create or merge the cureted by relationship on a specific entity
MATCH (ent:entity), (u:user {username:{username}})
WHERE id(ent) = {id}
WITH ent, u
MERGE (u)-[r:curates]->(ent)
ON CREATE SET
  r.creation_date = {creation_date},
  r.creation_time = {creation_time}
ON MATCH SET
  r.last_modification_date = {creation_date},
  r.last_modification_time = {creation_time}
RETURN {
  id: id(ent),
  props: ent,
  type: last(labels(ent)),
  rel: r
} as result


// name: get_person_cooccurrences
//
MATCH (p1:person)-[r1:appears_in]-(res:resource)-[r2:appears_in]-(p2:person)
WITH p1, p2, length(collect(DISTINCT res)) as w

RETURN {
    source: {
      id: id(p1),
      type: LAST(labels(p1)),
      name: p1.name
    },
    target: {
      id: id(p2),
      type: LAST(labels(p2)),
      name: p2.name
    },
    weight: w 
  } as result
ORDER BY w DESC
LIMIT 10

// name:get_related_resources
// get related nodes that are connected with the entity
MATCH (ent)-[:appears_in]->(res:resource)
WHERE id(ent) = {id}
WITH res, ent
  OPTIONAL MATCH (pla:`place`)-[:appears_in]->(res)
  OPTIONAL MATCH (per:`person`)-[:appears_in]->(res)

WITH ent, res, pla, per
ORDER BY res.start_date DESC
  RETURN {
    id: id(res),
    props: res,
    places: extract(n IN collect(DISTINCT pla)| {
      id: id(n),
      name: n.name,
      score: n.score
    }),
    persons: extract(n IN collect(DISTINCT per)| {
      id: id(n),
      name: n.name,
      description: n.description,
      score: n.score
    })
  } as result

SKIP {offset} LIMIT {limit}


// name: signale_related_resource
// change the relationship status in order to clean it later.
MATCH (ent)-[r:appears_in]->(res:resource)
WHERE id(ent) = {entity_id} AND id(res) = {resource_id}




// name:count_related_resources
MATCH (ent)-[:appears_in]->(res:resource)
WHERE id(ent) = {id}
RETURN count(res) as total_items


// name:get_graph
// get lighter version for graph purposes, max 500 resources sorted by number of persons
MATCH (ent)-[:appears_in]->(res:resource)
WHERE id(ent) = {id}
WITH ent, res
  OPTIONAL MATCH (pla:place)-[:appears_in]->(res)
  OPTIONAL MATCH (per:person)-[:appears_in]->(res)
WITH res,
  extract(n IN COLLECT(DISTINCT pla)| {id: id(n), name: n.name }) as places,
  extract(n IN COLLECT(DISTINCT per)| {id: id(n), name: n.name }) as persons
WITH res, persons, places,
  {
    res: {
      id: id(res),
      name: COALESCE(res.title_en,res.title_fr,res.title,res.name, ''),
      type: 'resource'
    },
    pla: places,
    per: persons
  } as result
WITH result, length(result.per) as entities
ORDER BY entities DESC
RETURN result
LIMIT {limit}


// name: get_related_entities_graph
// monopartite graph of entities
MATCH (n)-[r]-(t:resource)
 WHERE id(n) = {id}
WITH t
 MATCH (p1:{:entity})-[:appears_in]-(t)-[:appears_in]-(p2:{:entity})
 WHERE p1.score > -1 AND p2.score > -1
WITH p1, p2, length(collect(DISTINCT t)) as w
  
RETURN {
    source: {
      id: id(p1),
      type: LAST(labels(p1)),
      label: COALESCE(p1.name, p1.title_en, p1.title_fr,p1.title, '')
    },
    target: {
      id: id(p2),
      type: LAST(labels(p2)),
      label: COALESCE(p2.name, p2.title_en, p2.title_fr,p2.title, '')
    },
    weight: w 
  } as result
ORDER BY w DESC
LIMIT {limit}


// name:get_related_persons
// DEPRECATED get related persons that are connected with the entity, sorted by frequence
MATCH (ent)-[:appears_in]->(res:resource)
WHERE id(ent) = {id}
WITH ent, res
  MATCH (per:person)-[:appears_in]->(res)
  WHERE per <> ent
RETURN {
  id: id(per),
  props: per,
  type: LAST(labels(per)),
  coappear: COUNT(DISTINCT res)
} as results ORDER BY results.coappear DESC LIMIT 10


// name:get_related_entities
//
MATCH (ent)-[r:appears_in]->(res:resource)
  WHERE id(ent) = {id}
WITH res
  MATCH (ent1:{:entity})-[r:appears_in]->(res)
  WHERE ent1.score > -1
WITH ent1, count(DISTINCT r) as w
RETURN {
  id: id(ent1),
  type: last(labels(ent1)),
  props: ent1,
  weight: w
}
ORDER BY w DESC
SKIP {offset}
LIMIT {limit}


// name:count_related_entities
//
MATCH (ent)-[r:appears_in]->(res:resource)
  WHERE id(ent) = {id}
WITH res
  MATCH (ent1:{:entity})-[r:appears_in]->(res)
  WHERE ent1.score > -1
WITH ent1
RETURN COUNT(DISTINCT ent1) as count_items


// name:get_related_places
// DEPRECATED get related persons that are connected with the entity, sorted by frequence
MATCH (ent)-[:appears_in]->(res:resource)
WHERE id(ent) = {id}
WITH ent, res
  OPTIONAL MATCH (per:place)-[:appears_in]->(res)
RETURN {
  id: id(per),
  props: per,
  type: LAST(labels(per)),
  coappear: COUNT(DISTINCT res)
} as results ORDER BY results.coappear DESC LIMIT 10


// name: get_timeline
// get timebased resources id where the entioty a^^ears
MATCH (ent)-[:appears_in]->(res:resource)
WHERE id(ent) = {id} AND has(res.start_time)
RETURN {id:id(res), start_time: res.start_time }
ORDER BY res.start_time


// name: get_relationships
// get the list of all relationships
MATCH (ent)-[r]->()
WHERE id(ent) = {id}
RETURN r


// name: merge_relationships
// create or merge a relationship.
MATCH (n),(t)
WHERE id(n) = {id_start} AND id(t) = {id_end}
MERGE (n)-[r:{:%(type)}]->(t)
ON CREATE SET
  r.reconciled_by = {reconciled_by}
ON MATCH SET
  r.reconciled_by = {reconciled_by}
RETURN r