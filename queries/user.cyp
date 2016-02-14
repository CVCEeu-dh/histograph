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
MATCH (you:user {username:{username}})
WITH you 
MATCH (u:user)-[:performs]->(act:action)
WHERE id(you) <> id(u) AND act.last_modification_time > you.last_notification_time
WITH act, you
MATCH (act)-[:mentions]->(n)<-[r]-(you)
WITH DISTINCT act
RETURN count(act) as total_items


// name: get_pulse
// get user activity (filter by relationship creation date OR other user relationship on "users's items")
MATCH (you:user {username:{username}})
WITH you 
MATCH (u:user)-[:performs]->(act:action)
WHERE id(you) <> id(u) AND act.last_modification_time > you.last_notification_time
WITH act, you, u, {
    id: id(u),
    username: u.username,
    picture: u.picture
  } as alias_u
MATCH (act)-[:mentions]->(n)<-[r]-(you)
WITH DISTINCT act, alias_u
  ORDER BY act.last_modification_time DESC
  SKIP {offset}
  LIMIT {limit}
WITH act, alias_u
MATCH (act)-[r2:mentions]->(t)
WITH act, alias_u, filter(x in collect({
    id: id(t),
    props: t,
    type: last(labels(t))
  }) WHERE has(x.id)) AS alias_ms
RETURN {
  id: id(act),
  props: act,
  type: last(labels(act)),
  performed_by: alias_u,
  mentioning: alias_ms
}
ORDER BY act.last_modification_time DESC


// name: get_challenges
// help unresolved issue
MATCH (you:user {username:'@danieleguido'})
WITH you 
MATCH (u:user)-[:performs]->(act:action)
WHERE id(you) <> id(u) AND act.last_modification_time > you.last_notification_time
RETURN act

// name: count_crowdsourcing_unknownpeople
// is ... a Person?
MATCH (per:person)-[r:appears_in]->(res:resource)
WHERE NOT(has(per.last_name))
  AND per.celebrity = 0 AND per.df > 1
WITH DISTINCT per
RETURN count(per) as count_items

// name: get_crowdsourcing_unknownpeople
// is ... a Person? It should also give you a simple context (that probably you may know... @todo)
MATCH (per:person)-[r:appears_in]->(res:resource)
WHERE NOT(has(per.last_name))
  AND per.celebrity = 0
WITH per, collect(res) as resources
WITH per, resources, length(resources) as df
WHERE df > 1
WITH per, resources, df
ORDER BY df DESC
SKIP {offset}
LIMIT {limit}
WITH {
    id: id(per),
    type: 'person',
    props: per
  } as alias_per, last(resources) as res
WITH {
    id: id(res),
    type: 'resource',
    props: res
  } as alias_res, alias_per
RETURN {
  type: 'unknown_people',
  person: alias_per, 
  resource: alias_res
} as t



// name: count_crowdsourcing_resourcelackingdate
// how many (connected) resources are ... lacking starttime
MATCH ()-[r:appears_in]->(res:resource)
WHERE NOT(has(res.start_time))
RETURN count(DISTINCT res) as count_items

// name: get_crowdsourcing_resourcelackingdate
// is ... a Person? It should also give you a simple context (that probably you may know... @todo)
MATCH ()-[r:appears_in]->(res:resource)
WHERE NOT(has(res.start_time))
WITH res, count(r) as df
SKIP {offset}
LIMIT {limit}
WITH {
  id: id(res),
  type: 'resource',
  props: res
} as alias_res
RETURN {
  type: 'resourcelackingdate',
  resource: alias_res
}


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
DELETE  n, r


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


// name: count_noise
// get love or curation noise, see below get_noise query.
MATCH (res:resource)<-[r:likes|curates]-(u:user)
WHERE has(r.last_modification_time)
WITH res, r ORDER BY r.last_modification_time DESC
WITH collect(DISTINCT res) as resources
WITH resources, length(resources) as total_items
UNWIND resources as res
RETURN {
  group: {if:group}res.{:group}{/if}{unless:group}res.type{/unless}, 
  count_items: count(res),
  total_items: total_items
}

// name: get_noise
// get love or curation noise (something that just happened).
// test with 
// > node scripts/manage.js --task=query --cypher=user/get_noise --offset=0 --limit=10
// @todo: add filters...
MATCH (res:resource)<-[r:likes|curates]-(u:user)
WHERE has(r.last_modification_time)
WITH res, r ORDER BY r.last_modification_time DESC
WITH DISTINCT res
SKIP {offset}
LIMIT {limit}
WITH res
MATCH (res:resource)<-[r:likes|curates]-(u)
WITH res, max(r.last_modification_time) as last_modification_time, collect({
  id: id(u),
  username: u.username,
  last_modification_time: r.last_modification_time,
  last_modification_date: r.last_modification_date,
  type: type(r)
}) as users
  OPTIONAL MATCH (res)-[r_loc:appears_in]->(loc:`location`)

WITH res, last_modification_time, users, r_loc, loc
  ORDER BY r_loc.tfidf DESC, r_loc.frequency DESC

WITH res, last_modification_time, users, collect({  
      id: id(loc),
      type: 'location',
      props: loc,
      rel: r_loc
    })[0..5] as locations   
OPTIONAL MATCH (res)-[r_per:appears_in]-(per:`person`)

WITH res, last_modification_time, users, locations, r_per, per
  ORDER BY r_per.tfidf DESC, r_per.frequency DESC

WITH res, last_modification_time, users, locations, collect({
      id: id(per),
      type: 'person',
      props: per,
      rel: r_per
    })[0..5] as persons
OPTIONAL MATCH (res)-[r_org:appears_in]-(org:`organization`)

WITH res, last_modification_time, users, locations, persons, r_org, org
  ORDER BY r_org.tfidf DESC, r_org.frequency DESC

WITH res, last_modification_time, users, locations, persons, collect({  
      id: id(org),
      type: 'organization',
      props: org,
      rel: r_org
    })[0..5] as organizations
OPTIONAL MATCH (res)-[r_soc:appears_in]-(soc:`social_group`)

WITH res, last_modification_time, users, locations, persons, organizations, r_soc, soc
  ORDER BY r_soc.tfidf DESC, r_soc.frequency DESC

WITH res, last_modification_time, users, locations, persons, organizations, collect({
      id: id(soc),
      type: 'social_group',
      props: soc,
      rel: r_soc
    })[0..5] as social_groups


RETURN {
  id:id(res),
  type: 'resource',
  props:   res,
  persons: persons,
  organizations: organizations,
  locations:    locations,
  social_groups:   social_groups,
  users: users
}
ORDER BY last_modification_time DESC