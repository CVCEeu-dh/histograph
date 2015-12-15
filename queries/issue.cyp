// name: get_issue
// get issue by id or slug title
MATCH (iss:issue)-[r:questions]->(t)
WHERE id(iss) = {id}
WITH iss, r, {
    id: id(t),
    props: t,
    type: last(labels(t))
  } as alias_t
OPTIONAL MATCH (iss)-[:mentions]->(m)
WITH iss, r, alias_t, filter(x  in collect({
    id: id(m),
    props: m,
    type: last(labels(m))
  }) WHERE has(x.id)) as alias_ms
// get followers count
MATCH (u:user)-[:follows]->iss
WITH iss, r, alias_t, alias_ms, count(u) as followers
// are there any solutions?
OPTIONAL MATCH (u:user)-[:writes]->(com:comment)-[:answers]->iss
WITH iss, r, alias_t, alias_ms, followers,
  {
    id: id(u),
    username: u.username,
    picture: u.picture
  } as alias_u, com

ORDER BY com.last_modification_time DESC

WITH iss, r, alias_t, alias_ms, followers, {
  id: id(com),
  type: 'comment',
  props: com,
  written_by: alias_u
} as alias_com
WITH iss, r, alias_t, alias_ms, followers, collect(alias_com) as answers

RETURN {
  id: id(iss),
  type: last(labels(iss)),
  creation_date: r.creation_date,
  creation_time: r.creation_time,
  last_modification_date: r.last_modification_date,
  last_modification_time: r.last_modification_time,
  created_by: iss.created_by,
  questioning: alias_t,
  mentioning: alias_ms,
  answers: answers,
  followers: followers
}



// name: count_issues
// get issues by type babe
MATCH (iss:issue)-[:questions]->(t)
{if:target_id}
  WHERE id(t) = {target_id}
  WITH iss
{/if}

WITH last(labels(iss)) as group, count(DISTINCT iss) as count_items
RETURN {
  group: group, 
  count_items: count_items
} AS result


// name: get_issues
//
MATCH (iss:issue{if:kind}:{:kind}{/if})-[r:questions]->(t)
{if:target_id}
  WHERE id(t) = {target_id}
{/if}
WITH iss, r, t
  ORDER BY r.last_modification_time DESC
SKIP {offset}
LIMIT {limit}

WITH iss, r, {
    id: id(t),
    props: t,
    type: last(labels(t))
  } as alias_t

MATCH (u:user)-[:follows]->iss
WITH iss, r, alias_t, count(u) as followers 
OPTIONAL MATCH (iss)-[:mentions]->(m)
WITH iss, r, followers, alias_t, collect({
    id: id(m),
    props: m,
    type: last(labels(m))
  }) as alias_ms

WITH iss, r, alias_t, alias_ms, followers
// get last solutions
OPTIONAL MATCH (u:user)-[:writes]->(com:comment)-[:answers]->iss
WITH iss, r, alias_t, alias_ms, followers,
  {
    id: id(u),
    username: u.username,
    picture: u.picture
  } as alias_u, com

ORDER BY com.last_modification_time DESC

WITH iss, r, alias_t, alias_ms, followers, {
  id: id(com),
  type: 'comment',
  props: com,
  written_by: alias_u
} as alias_com

WITH iss, r, alias_t, alias_ms, followers, collect(alias_com) as answers


ORDER BY r.last_modification_time DESC
RETURN {
  id: id(iss),
  type: last(labels(iss)),
  creation_date: r.creation_date,
  creation_time: r.creation_time,
  last_modification_date: r.last_modification_date,
  last_modification_time: r.last_modification_time,
  created_by: iss.created_by,
  questioning: alias_t,
  mentioning:  alias_ms,
  followers: followers,
  answers: answers
}


// name:create_issue
// create a new issue and attach it to a node (entity or resource or other)
// the user have to provide an answer (it could be 'nope')
MATCH (u:user {username:{username}}), (t)
  WHERE id(t) = {questioning}

WITH u, t

  MERGE (iss:issue:{:kind})-[r:questions]->t
    ON CREATE SET
      // wrong <property> with custom content
      r.creation_date  = {exec_date},
      r.creation_time  = {exec_time},
      r.last_modification_date = {exec_date},
      r.last_modification_time = {exec_time},
      iss.created_by     = {username}
    ON MATCH SET
      r.last_modification_date = {exec_date},
      r.last_modification_time = {exec_time}

WITH u, t, iss
  MERGE u-[r:curates]->t
    ON CREATE SET
      r.creation_date  = {exec_date},
      r.creation_time  = {exec_time},
      r.last_modification_date = {exec_date},
      r.last_modification_time = {exec_time}
    ON MATCH SET
      r.last_modification_date = {exec_date},
      r.last_modification_time = {exec_time}
WITH iss, u, t
  MERGE u-[r:follows]->iss
    ON CREATE SET
      r.creation_date  = {exec_date},
      r.creation_time  = {exec_time},
      r.last_modification_date = {exec_date},
      r.last_modification_time = {exec_time}
    ON MATCH SET
      r.last_modification_date = {exec_date},
      r.last_modification_time = {exec_time}
{if:solution}
  WITH iss, u, t
    MERGE u-[r:writes]->(com:comment {solution:{solution}})-[:answers]->iss
      ON CREATE SET
        com.creation_date  = {exec_date},
        com.creation_time  = {exec_time},
        com.last_modification_date = {exec_date},
        com.last_modification_time = {exec_time}
      ON MATCH SET
        com.last_modification_date = {exec_date},
        com.last_modification_time = {exec_time}
{/if}

{if:mentioning}
  WITH iss, u, t
  MATCH (con)
    WHERE id(con) IN {mentioning}
  WITH iss, u, t, con
    MERGE iss-[r:mentions]->con
    ON CREATE SET
      r.creation_date  = {exec_date},
      r.creation_time  = {exec_time},
      r.last_modification_date = {exec_date},
      r.last_modification_time = {exec_time}
    ON MATCH SET
      r.last_modification_date = {exec_date},
      r.last_modification_time = {exec_time}

  WITH iss
{/if}


return {
  id: id(iss)
}


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