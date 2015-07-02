// name: get_inquiry
// get inquiry by id or slug title
MATCH (inq:inquiry)--(u:user)
WHERE id(inq) = {id}
RETURN {
  id: id(inq),
  props: inq,
  proposed_by: u.username
}


// name: get_inquiries
//
MATCH (inq:inquiry)--(u:user)
WITH inq, u
ORDER BY inq.creation_date DESC
SKIP {offset}
LIMIT {limit}
WITH inq, u
MATCH (inq)--(res:resource)
RETURN {
  id: id(inq),
  props: inq,
  proposed_by: u.username,
  questioning: res.doi
}




// name: merge_inquiry
// create inquiry (safely merge if the inquiry already exists by slug title.
MERGE (inq:inquiry {name: {name}})
ON CREATE SET
  inq.description   = {description},
  inq.language      = {language},
  inq.creation_date = {creation_date},
  inq.creation_time = {creation_time},
  inq.proposed_by   = {username}
WITH inq
MATCH (u:user {username: {username}})
  MERGE (u)-[r:proposes]->(inq)
WITH inq, u
MATCH (res)
  WHERE id(res) = {doi}
WITH inq, u, res
  MERGE (inq)-[r:questions]->(res)
RETURN {
  id: id(inq),
  props: inq,
  proposed_by: u.username,
  questioning: res
} as result


// name: remove_inquiry
// WARNING!!!! destroy everything related to the inquiry, as if it never existed. Should not be used while comments are in place
MATCH (n:inquiry)
WHERE id(n) = {id}
OPTIONAL MATCH (n)-[r]-()
DELETE n, r