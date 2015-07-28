// name: get_issue
// get issue by id or slug title
MATCH (iss:inquiry:issue)
WHERE id(iss) = {id}
WITH iss
MATCH (u)-[:proposes]->(iss)-[:questions]-(res)
WITH u, iss, res
OPTIONAL MATCH (iss)-[:answers]-(com)
RETURN {
  id: id(iss),
  type: 'issue',
  props: iss,
  proposed_by: u,
  questioning: id(res),
  answers: count(com)
}


// name: count_issues
//
MATCH (inq:issue)--(res:resource)
{?res:resource_id__ID}
RETURN count(*) as total_Count

// name: get_issues
//
MATCH (iss:issue)--(res:resource)
{?res:resource_id__ID}
{AND?iss:type__equals}
WITH iss, res
ORDER BY iss.creation_date DESC
SKIP {offset}
LIMIT {limit}
WITH iss, res
MATCH (iss)-[:proposes]-(u:user)
WITH DISTINCT iss, res, u
RETURN {
  id: id(iss),
  type: last(labels(iss)),
  props: iss,
  proposed_by: u,
  questioning: id(res)
}

// name: merge_issue
// create a new issue (safely merge if the issue already exists by slug title.
MERGE (iss:inquiry:issue {slug: {slug}, questioning: {doi}})
ON CREATE SET
  iss.type          = {type}, // that is, date or location or place or person
  iss.solution      = {solution},
  iss.description   = {description},
  iss.language      = {language},
  iss.creation_date = {creation_date},
  iss.creation_time = {creation_time},
  iss.proposed_by   = {username}
WITH iss
MATCH (u:user {username: {username}})
  MERGE (u)-[r:proposes]->(iss)
WITH iss, u
MATCH (res)
  WHERE id(res) = {doi}
WITH iss, u, res
  MERGE (iss)-[r:questions]->(res)
  ON CREATE SET
    res.last_modification_date = {creation_date},
    res.last_modification_time = {creation_time}
  ON MATCH SET
    res.last_modification_date = {creation_date},
    res.last_modification_time = {creation_time}
RETURN {
  id: id(iss),
  props: iss,
  proposed_by: u,
  questioning: res
} as result


// name: remove_issue
// WARNING!!!! destroy everything related to the issue, as if it never existed. Should not be used while comments are in place
MATCH (n:issue)
WHERE id(n) = {id}
OPTIONAL MATCH (n)-[r1]-(com:comment)-[r2]-()
OPTIONAL MATCH (n)-[r3]-()
DELETE n, r1, com, r2, r3