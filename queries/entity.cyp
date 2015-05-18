// name: get_entity
//


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