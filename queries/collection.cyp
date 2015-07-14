// name: get_collection
// // get some collection matching some criteria
MATCH (col:collection)
WHERE id(col) = {id}
  OPTIONAL MATCH (u:user)-[r1:curates]->(col)
  OPTIONAL MATCH (res:resource)-[r2:belongs_to]->(col)
  OPTIONAL MATCH (inq:inquiry)--(res)
WITH col, res, u, inq
  
ORDER BY r2.sort_index DESC, inq.last_modification_time DESC
RETURN {
  id:    id(col),
  props: col,
  curators: collect(DISTINCT u.username)
} as result



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


// name: merge_collection
// note that slug is composed by name only
MERGE (col:collection {slug: {slug}, created_by: {username}})
ON CREATE SET
  col.name          = {name},
  col.description   = {description},
  col.language      = {language},
  col.creation_date = {creation_date},
  col.creation_time = {creation_time},
  col.created_by    = {username}
WITH col
MATCH (u:user {username: {username}})
  MERGE (u)-[r:curates]->(col)
WITH col, u
RETURN {
  id: id(col),
  props: col
} as result


// name: remove_collection
//
MATCH (n:collection)
WHERE id(n) = {id}
OPTIONAL MATCH (n)-[r:curates]-()
DELETE n, r


// name: merge_collection_items
//
MATCH (n), (col:collection {slug: {slug}, created_by: {username}})
WHERE id(n) IN {ids}
WITH col, n, reduce(x=[-1,0], i IN {ids} | 
    CASE WHEN i = id(n) THEN [x[1], x[1]+1] ELSE [x[0], x[1]+1] END 
  )[0] as sort_index
MERGE (n)-[r:belongs_to]->(col)
ON CREATE SET
  r.sort_index = sort_index
ON MATCH SET
  r.sort_index = sort_index
RETURN {
  id: id(col),
  props: col,
  ids: count(n)
} as result

// name:get_related_items
// get related items connected woth the collection
MATCH (item)-[r:belongs_to]->(col)
WHERE id(col) = {id}
WITH col, r, item
  OPTIONAL MATCH (pla:place)-[:appears_in]->(item)
  OPTIONAL MATCH (per:person)-[:appears_in]->(item)

WITH col, r, item, pla, per
  RETURN {
    id: id(item),
    type: last(labels(item)),
    props: item,
    order: r.sort_index,
    places: extract(n IN collect(DISTINCT pla)| {
      id: id(n),
      name: n.name
    }),
    persons: extract(n IN collect(DISTINCT per)| {
      id: id(n),
      name: n.name,
      description: n.description
    })
  }
ORDER BY r.sort_index ASC
SKIP {offset}
LIMIT {limit}