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
    k.gender={gender},
    k.last_notification_time={exec_time},
    k.last_notification_date={exec_date}
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
MATCH (u:user {username: {username}})-[r:curates]-(n)
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


// name: get_related_crowdsourcing_actions
// get crowdsourcing todos... CONFIRM an action performed by someone else
// or play with someone else issue
MATCH (u:user {username:{username}}) 
WITH u
MATCH (act:action)-[:mentions]->(ent)
OPTIONAL MATCH (ent)<-[:mentions]-(act2:action)-[:performs]-(u)
WITH act, ent
WHERE act2 is NULL
WITH act, {type: last(labels(ent)), id:id(ent)} as alias_ms
RETURN id(act), last(labels(act)), collect(alias_ms)


// name: count_related_resources
// get last "touched" resources, by type
MATCH (u:user)-[r]-(res:resource){if:with}<-[:appears_in]-(ent){/if}
  WHERE id(u) = {id}
  {if:mimetype}
    AND res.mimetype IN {mimetype}
  {/if}
  {if:type}
    AND res.type IN {type}
  {/if}
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:with}
    AND id(ent) in {with}
  {/if}
WITH collect(res) as resources
WITH resources, length(resources) as total_items
UNWIND resources as res
RETURN {
  group: res.type, 
  count_items: count(res),
  total_items: total_items
}

// name: get_related_resources
// get last "touched" resources
MATCH (u:user)-[r]-(res:resource){if:with}<-[:appears_in]-(ent){/if}
  WHERE id(u) = {id}
  {if:mimetype}
    AND res.mimetype IN {mimetype}
  {/if}
  {if:type}
    AND res.type IN {type}
  {/if}
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:with}
    AND id(ent) in {with}
  {/if}
WITH r,res
ORDER BY r.creation_time DESC
SKIP {offset}
LIMIT {limit}
WITH r AS u_rel, res
OPTIONAL MATCH (res)-[r_loc:appears_in]->(loc:`location`)
WITH u_rel, res, r_loc, loc
ORDER BY r_loc.tfidf DESC, r_loc.frequency DESC
WITH u_rel, res, collect({  
      id: id(loc),
      type: 'location',
      props: loc,
      rel: r_loc
    })[0..5] as locations   
OPTIONAL MATCH (res)-[r_per:appears_in]-(per:`person`)
WITH u_rel, res, locations, r_per, per
ORDER BY r_per.tfidf DESC, r_per.frequency DESC
WITH u_rel, res, locations, collect({
      id: id(per),
      type: 'person',
      props: per,
      rel: r_per
    })[0..5] as persons
OPTIONAL MATCH (res)-[r_org:appears_in]-(org:`organization`)

WITH u_rel, res, locations, persons, collect({  
      id: id(org),
      type: 'organization',
      props: org,
      rel: r_org
    })[0..5] as organizations
OPTIONAL MATCH (res)-[r_soc:appears_in]-(soc:`social_group`)

WITH u_rel, res, locations, persons, organizations, collect({
      id: id(soc),
      type: 'social_group',
      props: soc,
      rel: r_soc
    })[0..5] as social_groups

{if:with}
WITH u_rel, res, locations, persons, organizations, social_groups
  OPTIONAL MATCH (res)--(ann:annotation) 
  WITH u_rel, res, locations, persons, organizations, social_groups, collect(ann) as annotations
{/if}

RETURN {
  id:id(res),
  type: 'resource',
  props: res,
  {if:with}
    annotations: annotations,
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
ORDER BY u_rel.creation_time DESC

// name: remove_user
// WARNING!!!! destroy everything related to the user, as if it never existed.
MATCH (n:user {email:{email}})
OPTIONAL MATCH (n)-[r]-()
DELETE n, r


// name: get_related_resources_graph
// bipartite graph of related resoruces and entities in between
MATCH (u:user)-[r]-(res:resource){if:with}<-[:appears_in]-(ent){/if}
  WHERE id(u)={id}
  {if:mimetype}
    AND res.mimetype IN {mimetype}
  {/if}
  {if:type}
    AND res.type IN {type}
  {/if}
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:with}
    AND id(ent) in {with}
  {/if}
WITH res
MATCH (ent:entity)-[r:appears_in]->(res)
WITH res, r, ent
ORDER BY r.tfidf DESC
WITH ent, collect(DISTINCT res) as resources
WITH ent, resources, length(resources) as weight
WHERE weight > 1
WITH ent, resources
UNWIND resources as res
MATCH p=(res)-[r:appears_in]-(ent)
return{
  source: {
    id: id(res),
    type: 'resource',
    label: COALESCE(res.name, res.title_en, res.title_fr)
  },
  target: {
    id: id(ent),
    type: last(labels(ent)),
    label: COALESCE(ent.name, ent.title_en, ent.title_fr)
  },
  weight: r.frequency
}
