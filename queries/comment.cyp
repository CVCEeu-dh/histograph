
// name: count_comment
//
MATCH (com:comment)--(n)
{?n:related_to__ID}
RETURN count(*)

// name: get_comments
//
MATCH (com:comment)--(n)
{?n:related_to__ID}
WITH com, n 
ORDER BY com.score DESC, com.celebrity DESC, com.creation_time ASC
SKIP {offset}
LIMIT {limit}
WITH com, n
MATCH (u)-[r:writes]->(com)
RETURN {
  id: id(com),
  type: last(labels(com)),
  props: com,
  written_by: u
}

// name: get_comment
//
MATCH (u:user)-[r:writes]->(com:comment)
WHERE id(com) = {id}
RETURN {
  id: id(com),
  type: last(labels(com)),
  props: com,
  written_by: u
}

// name: update_comment
//
MATCH (com:comment)--(n)
WHERE id(com) = {id}
WITH com, u
SET
  com.content = {content},
  com.last_modification_date = {last_modification_date},
  com.last_modification_time = {last_modification_time}
RETURN {
  id: id(com),
  type: last(labels(com)),
  props: com,
  written_by: u
}