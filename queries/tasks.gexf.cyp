// name: get_precoputated_entity_bipartite_graph
// just for precomputated links (jaccard distance)
MATCH (p1:{:entity})-[r:appear_in_same_document]-(p2:{:entity})
WHERE id(p1) < id(p2) AND p1.score > -1 AND p2.score > -1
WITH p1,p2,r
ORDER BY r.intersections DESC
LIMIT {limit}
WITH p1,p2,r
RETURN {
  source: {
    id: id(p1),
    type: {entity},
    label: COALESCE(p1.name, p1.title_en, p1.title_fr),
    url: p1.thumbnail
  },
  target: {
    id: id(p2),
    type: {entity},
    label: COALESCE(p2.name, p2.title_en, p2.title_fr),
    url: p2.thumbnail
  },
  weight: r.intersections
} as result




// name: get_entity_monopartite_graph
// just one entity type against itself
{if:with}
MATCH (res:resource)<-[:appears_in]-(ent2:entity)
  WHERE id(ent2) IN {with}
WITH res
  MATCH (p1:{:entity})-[r1:appears_in]->(res)<-[r2:appears_in]-(p2:{:entity})
{/if}
{unless:with}
MATCH (p1:{:entity})-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(p2:{:entity})
{/unless}
  WHERE id(p1) < id(p2)
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:mimetype}
    AND res.mimetype in {mimetype}
  {/if}
  {if:type}
    AND res.type in {type}
  {/if}
  
  AND p1.score > -1
  AND p2.score > -1
WITH p1, p2, res
ORDER BY r1.tfidf DESC, r2.tfidf DESC
// limit here?
WITH p1, p2, count(DISTINCT res) as w
RETURN {
    source: {
      id: id(p1),
      type: {entity},
      label: p1.name,
      url: p1.thumbnail
    },
    target: {
      id: id(p2),
      type: {entity},
      label: p2.name,
      url: p2.thumbnail
    },
    weight: w
  } as result
ORDER BY w DESC
SKIP {offset}
LIMIT {limit}


// name: get_entity_bipartite_graph
// just one entity type against itself
{if:with}
MATCH (res:resource)<-[:appears_in]-(ent2:entity)
  WHERE id(ent2) IN {with}
WITH res
  MATCH (p1:{:entityA})-[r1:appears_in]->(res)<-[r2:appears_in]-(p2:{:entityB})
{/if}
{unless:with}
MATCH (p1:{:entityA})-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(p2:{:entityB})
{/unless}
  WHERE p1.score > -1 AND p2.score > -1
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:mimetype}
    AND res.mimetype in {mimetype}
  {/if}
  {if:type}
    AND res.type in {type}
  {/if}
  
  
WITH p1, p2, res
ORDER BY r1.tfidf DESC, r2.tfidf DESC
// limit here?
WITH p1, p2, count(DISTINCT res) as w
RETURN {
    source: {
      id: id(p1),
      type: {entityA},
      label: p1.name,
      url: p1.thumbnail
    },
    target: {
      id: id(p2),
      type: {entityB},
      label: p2.name,
      url: p2.thumbnail
    },
    weight: w
  } as result
ORDER BY w DESC
SKIP {offset}
LIMIT {limit}