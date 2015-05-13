// name: get_collection
// // get some collection matching some criteria
START col=node({id})
  OPTIONAL MATCH (res:resource)-[r:belongs_to]->(col)
  OPTIONAL MATCH (u:user)-[:says]->(com:comment)-[r2:mentions]->(res)
WITH col, res, u, com
ORDER BY com.creation_time DESC
WITH {
  id:        id(col),
  props:     col,
  comments:  collect(DISTINCT com),
  users:     collect(DISTINCT u),
  resources: collect(DISTINCT res)
} as result
WITH result, HEAD(result.comments) as last_comment
  OPTIONAL MATCH (last_user:user)-[:says]->(last_comment)-[:mentions]->(last_commented_resource:resource)
RETURN {
  id: result.id,
  props: result.props,
  users: result.users,
  comments: result.comments,
  resources: length(result.resources),
  last_comment: {
    id: id(last_comment),
    props: last_comment,
    user: last_user
  },
  last_commented_resource: {
    id: id(last_commented_resource),
    props: last_commented_resource
  }
} AS collection



// name: get_collections
// // get some collection matching some criteria
MATCH (col:collection)
  OPTIONAL MATCH (res:resource)-[r:belongs_to]->(col)
  OPTIONAL MATCH (u:user)-[:says]->(com:comment)-[r2:mentions]->(res)
WITH col, res, u, com
ORDER BY com.creation_time DESC
WITH {
  id:        id(col),
  props:     col,
  comments:  collect(DISTINCT com),
  users:     collect(DISTINCT u),
  resources: collect(DISTINCT res)
} as result
WITH result, HEAD(result.comments) as last_comment
  OPTIONAL MATCH (last_user:user)-[:says]->(last_comment)-[:mentions]->(last_commented_resource:resource)
RETURN {
  id: result.id,
  props: result.props,
  users: length(result.users),
  comments: length(result.comments),
  resources: length(result.resources),
  last_comment: {
    id: id(last_comment),
    props: last_comment,
    user: last_user
  },
  last_commented_resource: {
    id: id(last_commented_resource),
    props: last_commented_resource
  }
} AS collection
ORDER BY collection.users DESC, collection.comments DESC
LIMIT 10


// name:get_related_resources
// get related nodes that are connected somehow
MATCH (res:resource)-[r:belongs_to]->(col)
WHERE id(col) = {id}
WITH res, col
  OPTIONAL MATCH (res)-[r1:appears_in]-(pla:`place`)
  OPTIONAL MATCH (res)-[r3:appears_in]-(per:`person`)
WITH col, res, pla, per
  RETURN {
    id: id(res),
    props: res,
    places: extract(n IN collect(DISTINCT pla)| {id: id(n), name: n.name }),
    persons: extract(n IN collect(DISTINCT per)| {id: id(n), name: n.name })
  } as result
SKIP {offset} LIMIT {limit}


// name:get_collection_graph
// get lighter version for graph purposes
MATCH (col:collection)
WHERE id(col) = {id}
WITH col
  OPTIONAL MATCH (res:resource)-[r:belongs_to]->(col)
  OPTIONAL MATCH (res)-[r1:appears_in]-(pla:`place`)
  OPTIONAL MATCH (res)-[r3:appears_in]-(per:`person`)
WITH res,
  extract(n IN COLLECT(DISTINCT pla)| {id: id(n), name: n.name }) as places,
  extract(n IN COLLECT(DISTINCT per)| {id: id(n), name: n.name }) as persons
WITH res, persons, places,
  {
    res: { id: id(res), name: COALESCE(res.title_en,res.title_fr,res.title,res.name, '') },
    pla: places,
    per: persons
  } as result
WITH result, length(result.per) as entities
ORDER BY entities DESC
RETURN result
LIMIT 500