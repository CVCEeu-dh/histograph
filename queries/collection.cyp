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
MATCH (col:collection)
WHERE id(col) = {id}
WITH col
  OPTIONAL MATCH (res:resource)-[r:belongs_to]->(col)
  OPTIONAL MATCH (res)-[r1:appears_in]-(pla:`place`)
  OPTIONAL MATCH (res)-[r2:appears_in]-(loc:`location`)
  OPTIONAL MATCH (res)-[r3:appears_in]-(per:`person`)
WITH col, res, pla, loc, per
  RETURN {
    id: id(res),
    props: res,
    locations: collect(DISTINCT loc),
    persons: collect(DISTINCT per)
  } as result
SKIP {offset} LIMIT {limit}