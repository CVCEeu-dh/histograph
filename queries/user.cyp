// name: merge_user
// to be used with OAuth2provider
MERGE (k:user { email:{email} })
  ON CREATE SET
    k.status={status},
    k.picture={picture},
    k.username={username},
    k.firstname={firstname},
    k.strategy={strategy},
    k.about={about},
    k.salt={salt},
    k.password={password},
    k.gender={gender}
  ON MATCH SET
    k.picture={picture},
    k.gender={gender}
  RETURN k


// name: count_pulse
// get total number of user activities/notifications
MATCH (u:user {username: '@danieleguido'})-[r]-(n)
RETURN count(DISTINCT n) as count_items


// name: get_pulse
// get user activity (filter by relationship creation date OR other user relationship on "users's items")
MATCH (u:user {username: '@danieleguido'})-[r]-(n)
OPTIONAL MATCH (n)-[r2]-()
WITH u, r, r2, n

ORDER BY n.creation_time DESC, r2.creation_time DESC, r.creation_time DESC
SKIP {offset}
LIMIT {limit}
WITH {
    id: id(n),
    type: last(labels(n)),
    props: n,
    rel: r
  } as target

RETURN DISTINCT target



// name: count_related_resources
// get last "touched" resources, by type
MATCH (u:user)-[r]-(n:resource)
WHERE id(u) = {id}
WITH DISTINCT RES
RETURN {
  group: res.type, 
  count_items: count(res)
} // count per type

// name: get_related_resources
// get last "touched" resources
MATCH (u:user)-[r]-(res:resource)
WHERE id(u) = {id}
ORDER BY r.creation_time DESC
SKIP {offset} 
LIMIT {limit}
WITH r.creation_time, res
OPTIONAL MATCH (res)-[r_loc:appears_in]->(loc:`location`)
WITH r.creation_time, res, r_loc, loc
ORDER BY r_loc.tfidf DESC, r_loc.frequency DESC
WITH r.creation_time, res, collect({  
      id: id(loc),
      type: 'location',
      props: loc,
      rel: r_loc
    })[0..5] as locations   
OPTIONAL MATCH (res)-[r_per:appears_in]-(per:`person`)
WITH r.creation_time, res, locations, r_per, per
ORDER BY r_per.tfidf DESC, r_per.frequency DESC
WITH r.creation_time, res, locations, collect({
      id: id(per),
      type: 'person',
      props: per,
      rel: r_per
    })[0..5] as persons
OPTIONAL MATCH (res)-[r_org:appears_in]-(org:`organization`)

WITH r.creation_time, res, locations, persons, collect({  
      id: id(org),
      type: 'organization',
      props: org,
      rel: r_org
    })[0..5] as organizations
OPTIONAL MATCH (res)-[r_soc:appears_in]-(soc:`social_group`)

WITH r.creation_time, res, locations, persons, organizations, collect({
      id: id(soc),
      type: 'social_group',
      props: soc,
      rel: r_soc
    })[0..5] as social_groups

{if:with}
  OPTIONAL MATCH (res)--(ann:annotation) 
  WITH r.creation_time, res, ann, locations, persons, organizations, social_groups
{/if}

RETURN {
  id:id(res),
  type: 'resource',
  props: res,
  {if:with}
    annotations: collect(ann),
  {/if}
  persons:     persons,
  organizations: organizations,
  locations:    locations,
  social_groups:   social_groups
} as resource
//{if:orderby}
//ORDER BY {:orderby}
//{/if}
//{unless:orderby}
ORDER BY r.creation_time ASC

// name: remove_user
// WARNING!!!! destroy everything related to the user, as if it never existed.
MATCH (n:user {email:{email}})
OPTIONAL MATCH (n)-[r]-()
DELETE n, r


