// name: get_inquiry
// get inquiry by id or slug title
MATCH (inq:inquiry)--(u:user)
WHERE id(inq) = {id}
RETURN {
  id: id(inq),
  props: inq,
  proposed_by: u.username
}

// name: merge_inquiry
// create inquiry (safely merge if the inquiry already exists by slug title.
MERGE (inq:inquiry {name: {name}})
ON CREATE SET
  inq.description   = {description},
  inq.language      = {language},
  inq.creation_date = {creation_date},
  inq.creation_time = {creation_time}
WITH inq
MATCH (u:user {username: {username}})
  MERGE (u)-[r:proposes]->(inq)
RETURN {
  id: id(inq),
  props: inq,
  proposed_by: u.username
} as result

// name: remove_inquiry
// WARNING!!!! destroy everything related to the inquiry, as if it never existed. Should not be used while comments are in place
MATCH (n:inquiry)
WHERE id(n) = {id}
OPTIONAL MATCH (n)-[r]-()
DELETE n, r