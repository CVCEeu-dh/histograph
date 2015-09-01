// name: get_issue
// get issue by id or slug title
MATCH (iss:inquiry:issue)-[:answers {first: true}]-(first:comment)
WHERE id(iss) = {id}
WITH iss, first
MATCH (u)-[:proposes]->(iss)-[:questions]-(res)
WITH u, iss, res, first
OPTIONAL MATCH (iss)-[:answers {accepted: true}]-(accepted)
OPTIONAL MATCH (iss)-[:answers]-(com)
RETURN {
  id: id(iss),
  type: 'issue',
  props: iss,
  proposed_by: u,
  questioning: id(res),
  first : {
    id: id(first),
    props: first
  },
  accepted : {
    id: id(accepted),
    props: accepted
  },
  answers: count(com)
}


// name: count_issues
//
MATCH (inq:inquiry:issue)--(res:resource)
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

// name: create_issue
// create a new issue (safely merge if the issue already exists by slug title.
MERGE (iss:inquiry:issue {slug: {slug}, questioning: {doi}})
ON CREATE SET
  iss.type           = {type}, // that is, date or location or place or person
  iss.title          = {title}, // the title
  iss.description    = {description},
  {if:language}
  iss.language       = {language},
  {/if}
  iss.creation_date  = {creation_date},
  iss.creation_time  = {creation_time},
  iss.proposed_by    = {username}
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
WITH iss, u, res
  OPTIONAL MATCH (iss)-[:answers {accepted: true}]-(accepted)
  OPTIONAL MATCH (iss)-[:answers]-(com)
RETURN {
  id: id(iss),
  props: iss,
  proposed_by: u,
  questioning: id(res),
  accepted : {
    id: id(accepted),
    props: accepted
  },
  answers: count(com)
} as result


// name: merge_issue_comment
// create a new issue comment - slug param contain the id of the resource as well.
MATCH (iss:issue)--(res:resource), (u:user {username: {username}})
WHERE id(iss) = {id}
  MERGE (u)-[r:follows]->(iss)
WITH iss, u, res
  MERGE (com:comment:solution {slug: {slug}})
    ON CREATE SET
      com.content       = {content},
      {if:language}
      com.language      = {language},
      {/if}
      com.creation_date = {creation_date},
      com.creation_time = {creation_time},
      com.answered_by   = {username},
      com.score         = 0,
      com.celebrity     = 0
WITH iss, com, u, res
  MERGE (com)-[r:answers]->(iss)
    {if:first}
    ON CREATE SET
      r.first = true
    {/if}
WITH iss, com, u, res
  MERGE (u)-[r:writes]->(com)
RETURN {
  id: id(com),
  props: com,
  written_by: u,
  answering: iss,
  questioning: id(res)
} as result


// name: remove_issue
// WARNING!!!! destroy everything related to the issue, as if it never existed. Should not be used while comments are in place
MATCH (n:issue)
WHERE id(n) = {id}
OPTIONAL MATCH (n)-[r1]-(com:comment)-[r2]-()
OPTIONAL MATCH (n)-[r3]-()
DELETE n, r1, com, r2, r3