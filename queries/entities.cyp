// name: get_entity
// 
MATCH(e:entity) WHERE id(e) = {id}
RETURN e


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