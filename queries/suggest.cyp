// name: lucene_query
//
start n=node:node_auto_index({query})
WHERE 'resource' IN labels(n)
RETURN {
  id: id(n),
  type:  HEAD(labels(n)),
  mimetype: n.mimetype,
  languages: n.languages,
  title: COALESCE(n.title_en, n.title_fr)
} AS result
LIMIT {limit_resources}
UNION
start n=node:node_auto_index({query})
WHERE 'entity' IN labels(n)
RETURN {
  id: id(n),
  labels: labels(n),
  type:  LAST(labels(n)),
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


// name: get_unknown_node
// given a simple ID, return the complete node (id, props)
MATCH (n)
WHERE id(n) = {id}
RETURN {
  id: id(n),
  props: n,
  type: LAST(labels(n))
} as result


// name: get_unknown_nodes
// given a list of IDs, return the complete nodes (id, props)
MATCH (n)
WHERE id(n) in {ids}
RETURN {
  id: id(n),
  props: n,
  type: LAST(labels(n))
} as result
LIMIT 1000

// name: get_neighbors
// [33828,26750,26389,33759,33758, 26441, 27631, 11173]
MATCH (a)-[r]-(b)
WHERE id(a) in {ids} AND last(labels(b)) in {labels}
RETURN {
  source: {
    id: id(a),
    name: COALESCE(a.name, a.title_en, a.title_fr),
    start_time: a.start_time,
    end_time: a.end_time,
    type: last(labels(a))
  },
  target: {
    id: id(b),
    name: COALESCE(b.name, b.title_en, b.title_fr),
    start_time: b.start_time,
    end_time: b.end_time,
    type: last(labels(b))
  }
} LIMIT {limit}


// name: get_matching_resources_count
// get resources by query
start n=node:node_auto_index({query})
WHERE 'resource' in labels(n)
RETURN count(n) as total_count

// name: get_matching_resources
// get resources by query
start n=node:node_auto_index({query})
WHERE 'resource' in labels(n)
RETURN {
  id: id(n),
  props: n,
  type: 'resource'
} AS result
SKIP {offset}
LIMIT {limit}


// name: get_matching_entities
// get resources by query
start n=node:node_auto_index({query})
WHERE 'entity' in labels(n)
RETURN {
  id: id(n),
  props: n,
  type: last(labels(n))
} AS result
SKIP {offset}
LIMIT {limit}