
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
ORDER BY com.creation_date DESC
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
