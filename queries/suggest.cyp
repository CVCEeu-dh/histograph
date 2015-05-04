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