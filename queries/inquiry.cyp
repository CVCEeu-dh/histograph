// name: get_inquiry
// get inquiry by id or slug title
MATCH (inq)
WHERE id(inq) = {id}
WITH inq
MATCH (u)-[:proposes]->(inq)-[:questions]-(res)
WITH u, inq, res
OPTIONAL MATCH (inq)-[:answers]-(com)
RETURN {
  id: id(inq),
  type: last(labels(inq)),
  props: inq,
  proposed_by: u,
  questioning: id(res),
  answers: count(com)
}


// name: count_inquiries
//
MATCH (inq:inquiry)--(res:resource)
{?res:resource_id__ID}
RETURN count(*)

// name: get_inquiries
//
MATCH (inq:inquiry)--(res:resource)
{?res:resource_id__ID}
WITH inq, res
ORDER BY inq.creation_date DESC
SKIP {offset}
LIMIT {limit}
WITH inq, res
MATCH (inq)-[:proposes]-(u:user)
WITH DISTINCT inq, res, u
RETURN {
  id: id(inq),
  type: last(labels(inq)),
  props: inq,
  proposed_by: u,
  questioning: id(res)
}




// name: merge_inquiry
// create inquiry (safely merge if the inquiry already exists by slug title.
MERGE (inq:inquiry {slug: {slug}, questioning: {doi}})
ON CREATE SET
  inq.name          = {name},
  inq.description   = {description},
  inq.language      = {language},
  inq.creation_date = {creation_date},
  inq.creation_time = {creation_time},
  inq.proposed_by   = {username}
WITH inq
MATCH (u:user {username: {username}})
  MERGE (u)-[r:proposes]->(inq)
  ON CREATE SET
    r.creation_date = {creation_date},
    r.creation_time = {creation_time}
WITH inq, u
MATCH (res)
  WHERE id(res) = {doi}
WITH inq, u, res
  MERGE (inq)-[r:questions]->(res)
  ON CREATE SET
    r.creation_date = {creation_date},
    r.creation_time = {creation_time}
RETURN {
  id: id(inq),
  props: inq,
  proposed_by: u.username,
  questioning: res
} as result


// name: merge_inquiry_comment
// create a new inquiry comment - how to avoid comment spamming? slug param contain the id of the inquiry as well.
MATCH (inq:inquiry)--(res:resource), (u:user {username: {username}})
WHERE id(inq) = {id}
  MERGE (u)-[r:follows]->(inq)
WITH inq, u, res
  MERGE (com:comment:observation {slug: {slug}})
    ON CREATE SET
      com.content       = {content},
      com.language      = {language},
      com.creation_date = {creation_date},
      com.creation_time = {creation_time},
      com.created_by   = {username},
      com.score         = 0,
      com.celebrity     = 0
WITH inq, com, u, res
  MERGE (com)-[r:answers]->(inq)
  ON CREATE SET
    r.creation_date = {creation_date},
    r.creation_time = {creation_time}
WITH inq, com, u, res
  MERGE (u)-[r:writes]->(com)
  ON CREATE SET
    r.creation_date = {creation_date},
    r.creation_time = {creation_time}
RETURN {
  id: id(com),
  props: com,
  written_by: u,
  answering: inq,
  questioning: res
} as result


// name: merge_inquiry_vote
MATCH (inq:inquiry)--(res:resource), (u:user {username: {username}})
WHERE id(inq) = {id}
  MERGE (u)-[r:follows]->(inq)
WITH inq, u, res
  MERGE (com:comment:vote {slug: {slug}})
    ON CREATE SET
      com.content = {content},
      com.creation_date = {creation_date},
      com.creation_time = {creation_time}
    ON MATCH SET
      com.content = {content},
      com.last_modification_date = {last_modification_date},
      com.last_modification_time = {last_modification_time}
WITH inq, u, res, com
  MERGE (u)-[r:votes]->(com)-[r:discusses]->(inq)
RETURN {
  id: id(com),
  props: com,
  written_by: u,
  answering: inq,
  questioning: res
} as result

  
// name: remove_inquiry
// WARNING!!!! destroy everything related to the inquiry, as if it never existed. Should not be used while comments are in place
MATCH (n:inquiry)
WHERE id(n) = {id}

OPTIONAL MATCH (n)-[r1]-(com:comment)-[r2]-()
OPTIONAL MATCH (n)-[r3]-()
DELETE n, r1, com, r2, r3