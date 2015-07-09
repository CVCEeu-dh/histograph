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

// name: get_person_cooccurrences
//
MATCH (p1:person)-[r1:appears_in]-(res:resource)-[r2:appears_in]-(p2:person)
WITH p1, p2, length(collect(DISTINCT res)) as w

RETURN {
    source: {
      id: id(p1),
      type: HEAD(labels(p1)),
      name: p1.name
    },
    target: {
      id: id(p2),
      type: HEAD(labels(p2)),
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
  RETURN {
    id: id(res),
    props: res,
    places: extract(n IN collect(DISTINCT pla)| {
      id: id(n),
      name: n.name
    }),
    persons: extract(n IN collect(DISTINCT per)| {
      id: id(n),
      name: n.name,
      description: n.description
    })
  } as result
ORDER BY res.start_date DESC
SKIP {offset} LIMIT {limit}


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


// name: get_graph_persons
// monopartite graph of people
MATCH (n)-[r]-(t:resource)
 WHERE id(n) = {id}
WITH t
 MATCH (p1:person)-[:appears_in]-(t)-[:appears_in]-(p2:person)
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
// get related persons that are connected with the entity, sorted by frequence
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

// name:get_related_places
// get related persons that are connected with the entity, sorted by frequence
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
