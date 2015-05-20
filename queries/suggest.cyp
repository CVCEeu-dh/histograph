// name: lucene_query
//
start n=node:node_auto_index({query})
WHERE 'resource' IN labels(n)
RETURN {
  id: id(n),
  type:  HEAD(labels(n)),
  mimetype: n.mimetype,
  languages: n.languages,
  title: n.title_en
} AS result
LIMIT {limit_resources}
UNION
start n=node:node_auto_index({query})
WHERE 'entity' IN labels(n)
RETURN {
  id: id(n),
  labels: labels(n),
  type:  TAIL(labels(n)),
  mimetype: n.mimetype,
  languages: n.languages,
  title: COALESCE(n.name)
} AS result
LIMIT {limit_entities}


// name: all_shortest_paths
// get all shortestpath between nodes.
MATCH p = allShortestPaths((a)-[*..4]-(b))
WHERE id(a) in {ids} AND id(b) in {ids}
WITH p, 
  length(FILTER(x IN NODES(p) WHERE id(x) in {ids})) - {threshold} as coherence,
  length(FILTER(x IN NODES(p) WHERE last(labels(x)) in {labels})) as purity,
  length(p) as distance
WITH p, coherence, distance, purity - length(nodes(p)) as adequancy,
  EXTRACT(n IN NODES(p)|{id:id(n), name:n.name, type: last(labels(n))}) as candidate
RETURN {
  path: candidate,
  distance: distance,
  adequancy:adequancy,
  coherence: coherence
} as result
order by coherence DESC, adequancy ASC, distance ASC
SKIP {offset}
LIMIT {limit}