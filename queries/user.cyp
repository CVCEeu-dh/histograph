// name: merge_user
// to be used with OAuth2provider
MERGE (k:user { email:{email} })
  ON CREATE SET
    k.uuid = {uuid},
    k.username   = {username},

    k.status     = {status},

    {if:picture}
    k.picture  = {picture},
    {/if}
    
    {if:firstname}
    k.firstname  = {firstname},
    {/if}

    {if:gender}
    k.gender     = {gender},
    {/if}

    k.strategy   = {strategy},
    k.about      = {about},

    k.last_notification_time={exec_time},
    k.last_notification_date={exec_date},

    k.creation_time = {exec_time},
    k.creation_date = {exec_date},
    k.last_modification_time = {exec_time},
    k.last_modification_date = {exec_date},

    k.password   = {password},
    k.salt       = {salt},
    k.status     = {status},
    k.activation = {activation}
    
    
    
  ON MATCH SET
    
    k.last_modification_time = {exec_time},
    {if:picture}
      k.picture    = {picture},
    {/if}

    {if:firstname}
      k.firstname  = {firstname},
    {/if}
    {if:gender}
      k.gender     = {gender},
    {/if}
    k.last_modification_date = {exec_date}
    
  RETURN {
    id: k.uuid,
    username: k.username,
    email: k.email,
    props: k
  }

// name: get_matching_user
// given an username and a password
MATCH (u:user)
  WHERE u.email = {username}
    OR u.username = {username}
WITH u
  LIMIT 1
RETURN {
  id: u.uuid,
  username: u.username,
  email: u.email,
  props: u
}


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
    id: u.uuid,
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
    id: t.uuid,
    props: t,
    type: last(labels(t))
  }) WHERE has(x.id)) AS alias_ms
RETURN {
  id: act.uuid,
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
    id: per.uuid,
    type: 'person',
    props: per
  } as alias_per, last(resources) as res
WITH {
    id: res.uuid,
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
  id: res.uuid,
  type: 'resource',
  props: res
} as alias_res
RETURN {
  type: 'resourcelackingdate',
  resource: alias_res
}


// name: count_related_resources
// get last "touched" resources, by type
MATCH (u:user {uuid: {id}}){if:with},(ent:entity) WHERE ent.uuid in {with} {/if}
  WITH (u){if:with},ent{/if}
    MATCH (u)-[r:likes|curates]->(res:resource){if:with}<-[:appears_in]-(ent){/if}
  WHERE u:user
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
MATCH (u:user {uuid: {id}}){if:with},(ent:entity) WHERE ent.uuid in {with} {/if}
  WITH (u){if:with},ent{/if}
    MATCH (u)-[r:likes|curates]->(res:resource){if:with}<-[:appears_in]-(ent){/if}
  WHERE u:user
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
  
WITH r,res
ORDER BY r.creation_time DESC
SKIP {offset}
LIMIT {limit}
WITH r AS u_rel, res
OPTIONAL MATCH (res)-[r_loc:appears_in]->(loc:`location`)
WITH u_rel, res, r_loc, loc
ORDER BY r_loc.score DESC, r_loc.tfidf DESC, r_loc.frequency DESC
WITH u_rel, res, collect({  
      id: loc.uuid,
      type: 'location',
      props: loc,
      rel: r_loc
    })[0..5] as locations   
OPTIONAL MATCH (res)-[r_per:appears_in]-(per:`person`)
WITH u_rel, res, locations, r_per, per
ORDER BY r_per.score DESC, r_per.tfidf DESC, r_per.frequency DESC
WITH u_rel, res, locations, collect({
      id: per.uuid,
      type: 'person',
      props: per,
      rel: r_per
    })[0..5] as persons
OPTIONAL MATCH (res)-[r_org:appears_in]-(org:`organization`)

WITH u_rel, res, locations, persons, collect({  
      id: org.uuid,
      type: 'organization',
      props: org,
      rel: r_org
    })[0..5] as organizations
OPTIONAL MATCH (res)-[r_soc:appears_in]-(soc:`social_group`)

WITH u_rel, res, locations, persons, organizations, collect({
      id: soc.uuid,
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
  id: res.uuid,
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
// bipartite graph of related resoruces and entities in between PROFILE MATCH (u:user {uuid: 'N1srS9_vnx'})-[r:likes|curates]-(res:resource) RETURN res
MATCH (u:user {uuid: {id}})-[r:likes|curates]->(res:resource){if:with}<-[:appears_in]-(ent:entity){/if}
WHERE u:user
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
MATCH (entA:person)-[r1:appears_in]->(res)<-[r2:appears_in]-(entB:person)
WHERE id(entA) < id(entB) AND r1.score > -1 AND r2.score > -1 AND entA.score > -1 AND entB.score > -1
WITH entA, entB, count(res) as w, min(r1.tf + r2.tf) as minf
WHERE w > 1
WITH entA, entB, w, minf
ORDER BY w DESC, minf DESC
LIMIT 500
return{
  source: {
    id: entA.uuid,
    type: last(labels(entA)),
    label: COALESCE(entA.name, entA.title_en, entA.title_fr)
  },
  target: {
    id: entB.uuid,
    type: last(labels(entB)),
    label: COALESCE(entB.name, entB.title_en, entB.title_fr)
  },
  weight: w
}


// name: get_related_resources_timeline
// 
MATCH (u:user {uuid: {id}})-[r:likes|curates]->(res:resource)
WITH res
{?res:start_time__gt}
{AND?res:end_time__lt}
{AND?res:type__in}
WITH res
WHERE exists(res.start_month)
WITH res
{if:with}
  MATCH (res)<-[r:appears_in]-(ent2:entity) 
  WHERE ent2.uuid IN {with}
  WITH res, count(r) as strict
  WHERE strict = size({with})
  WITH res
{/if}
{if:without}
  OPTIONAL MATCH  (res)<-[r:appears_in]-(ent:entity)
  WHERE ent.uuid IN {without}
  WITH res, r
  WHERE r is null
  WITH res
{/if}
WITH  res.start_month as tm, min(res.start_time) as t, count(res) as weight
RETURN tm, t, weight
ORDER BY tm ASC

// name: get_related_resources_elastic
// 
MATCH (u:user {uuid: {id}})-[r:likes|curates]->(res:resource)
WITH res
{?res:start_time__gt}
{AND?res:end_time__lt}
{AND?res:type__in}
WITH res
WHERE exists(res.start_month)
WITH res
{if:with}
  MATCH (res)<-[r:appears_in]-(ent2:entity) 
  WHERE ent2.uuid IN {with}
  WITH res, count(r) as strict
  WHERE strict = size({with})
  WITH res
{/if}
{if:without}
  OPTIONAL MATCH  (res)<-[r:appears_in]-(ent:entity)
  WHERE ent.uuid IN {without}
  WITH res, r
  WHERE r is null
  WITH res
{/if}
MATCH (res)<-[r:appears_in]-(ent:{:entity})
WHERE r.score > -1
WITH ent, count(r) as df
ORDER BY df desc, ent.name ASC
LIMIT 100 
RETURN {
  id: ent.uuid,
  label: last(labels(ent)),
  name: ent.name,
  w:df
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
  id: u.uuid,
  username: u.username,
  last_modification_time: r.last_modification_time,
  last_modification_date: r.last_modification_date,
  type: type(r)
}) as users
  OPTIONAL MATCH (res)-[r_loc:appears_in]->(loc:`location`)

WITH res, last_modification_time, users, r_loc, loc
  ORDER BY r_loc.tfidf DESC, r_loc.frequency DESC

WITH res, last_modification_time, users, collect({  
      id: loc.uuid,
      type: 'location',
      props: loc,
      rel: r_loc
    })[0..5] as locations   
OPTIONAL MATCH (res)-[r_per:appears_in]-(per:`person`)

WITH res, last_modification_time, users, locations, r_per, per
  ORDER BY r_per.tfidf DESC, r_per.frequency DESC

WITH res, last_modification_time, users, locations, collect({
      id: per.uuid,
      type: 'person',
      props: per,
      rel: r_per
    })[0..5] as persons
OPTIONAL MATCH (res)-[r_org:appears_in]-(org:`organization`)

WITH res, last_modification_time, users, locations, persons, r_org, org
  ORDER BY r_org.tfidf DESC, r_org.frequency DESC

WITH res, last_modification_time, users, locations, persons, collect({  
      id: org.uuid,
      type: 'organization',
      props: org,
      rel: r_org
    })[0..5] as organizations
OPTIONAL MATCH (res)-[r_soc:appears_in]-(soc:`social_group`)

WITH res, last_modification_time, users, locations, persons, organizations, r_soc, soc
  ORDER BY r_soc.tfidf DESC, r_soc.frequency DESC

WITH res, last_modification_time, users, locations, persons, organizations, collect({
      id: soc.uuid,
      type: 'social_group',
      props: soc,
      rel: r_soc
    })[0..5] as social_groups


RETURN {
  id: res.uuid,
  type: 'resource',
  props:   res,
  persons: persons,
  organizations: organizations,
  locations:    locations,
  social_groups:   social_groups,
  users: users
}
ORDER BY last_modification_time DESC