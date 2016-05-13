// name: get_entity
// get entity with issues
MATCH (ent:entity)
  WHERE ent.uuid = {id}
WITH ent // collect issues
  OPTIONAL MATCH (u:user)-[r:performs]->(act:issued)-[:mentions]->(ent)
  WITH ent, act,
    {
      id: u.uuid,
      username: u.username,
      vote: r.vote,
      last_modification_time: r.last_modification_time
    } as alias_u

  WITH ent, act, collect(alias_u) as alias_us
  OPTIONAL MATCH (act)-[:mentions]->(ent2:entity)
    WHERE ent2 <> ent
  WITH ent, act, alias_us,
    {
      id: ent2.uuid,
      props: ent2,
      type: last(labels(ent2))
    } as alias_m
  WITH ent, act, alias_us, filter(x in collect(alias_m) WHERE has(x.id)) as alias_ms
  WITH ent, 
    {
      id: act.uuid,
      props: act,
      users: alias_us,
      mentioning: alias_ms
    } as alias_issue 
  WITH ent, filter(x in collect(alias_issue) WHERE has(x.id)) as issues
RETURN {
  id: ent.uuid,
  type: LAST(labels(ent)),
  props: ent,
  issues: issues
}

// name: search_entity
//
MATCH (ent:entity:{:type}) 
  WHERE 
    ent.slug = {slug}
  {if:links_wiki}
    OR ent.links_wiki = {links_wiki} 
  {/if}
  {if:links_viaf}
    OR ent.links_viaf = {links_viaf}
  {/if}

{if:resource_id}
  WITH ent
  OPTIONAL MATCH (res:resource)<-[rel:appears_in]-(ent)
  WHERE res.uuid = {resource_id}
  WITH {
    id: ent.uuid,
    type: LAST(labels(ent)),
    rel: rel,
    props: ent
  } as alias_ent
{/if}
{unless:resource_id}
  WITH {
    id: ent.uuid,
    type: LAST(labels(ent)),
    props: ent
  } as alias_ent
{/unless}
RETURN alias_ent
LIMIT 1

// name: get_entities_by_ids
//
MATCH (ent:entity)
WHERE ent.uuid IN {ids}
WITH ent
OPTIONAL MATCH (ent)--(res:resource)
WITH ent, length(collect(DISTINCT res)) as resources
RETURN {
  id: ent.uuid,
  type: LAST(labels(ent)),
  props: ent,
  resources: resources
} as result
SKIP {offset}
LIMIT {limit}

// name: merge_entity
// create or merge entity, by name or links_wiki.
MATCH (res:resource)
  WHERE res.uuid = {resource_id}
WITH res
{if:links_wiki}
  MERGE (ent:entity:{:type} {links_wiki: {links_wiki}})
{/if}
{unless:links_wiki}
  MERGE (ent:entity:{:type} {slug:{slug}})
{/unless}
ON CREATE SET
  ent.uuid          = {uuid},
  ent.name          = {name},
  ent.name_search   = {name_search},
  ent.celebrity     = 0,
  ent.score         = 0,
  ent.status        = 1,
  ent.df            = 1,

  {if:links_viaf}
    ent.links_viaf         = {links_viaf},
  {/if}
  {if:links_wiki}
    ent.links_wiki         = {links_wiki},
  {/if}
  {if:first_name}
    ent.first_name     = {first_name},
  {/if}
  {if:last_name}
    ent.last_name     = {last_name},
  {/if}
  {if:name_en}
    ent.name_en     = {name_en},
  {/if}
  {if:name_fr}
    ent.name_fr     = {name_fr},
  {/if}
  {if:name_de}
    ent.name_de     = {name_de},
  {/if}
  {if:lat}
    ent.lat         = {lat},
  {/if}
  {if:lng}
    ent.lng         = {lng},
  {/if}
  {if:fcl}
    ent.fcl         = {fcl},
  {/if}
  {if:country}
    ent.country         = {country},
  {/if}
  {if:geoname_id}
    ent.geoname_id   = {geoname_id},
  {/if}
  {if:geoname_fcl}
    ent.geoname_fcl  = {geoname_fcl},
  {/if}
  {if:geoname_country}
    ent.geoname_country  = {geoname_country},
  {/if}
  {if:geocoding_id}
    ent.geocoding_id  = {geocoding_id},
    ent.geocoding_fcl = {geocoding_fcl},
    ent.geocoding_country = {geocoding_country},
  {/if}
  ent.creation_date = {exec_date},
  ent.creation_time = {exec_time},
  ent.last_modification_date = {exec_date},
  ent.last_modification_time = {exec_time}
ON MATCH SET
  {if:links_viaf}
    ent.links_viaf         = {links_viaf},
  {/if}
  {if:links_wiki}
    ent.links_wiki         = {links_wiki},
  {/if}
  {if:first_name}
    ent.first_name     = {first_name},
  {/if}
  {if:last_name}
    ent.last_name     = {last_name},
  {/if}
  {if:name_en}
    ent.name_en     = {name_en},
  {/if}
  {if:name_fr}
    ent.name_fr     = {name_fr},
  {/if}
  {if:name_de}
    ent.name_de     = {name_de},
  {/if}
  {if:lat}
    ent.lat         = {lat},
  {/if}
  {if:lng}
    ent.lng         = {lng},
  {/if}
  {if:fcl}
    ent.fcl         = {fcl},
  {/if}
  {if:country}
    ent.country         = {country},
  {/if}
  {if:geoname_id}
    ent.geoname_id   = {geoname_id},
  {/if}
  {if:geoname_fcl}
    ent.geoname_fcl  = {geoname_fcl},
  {/if}
  {if:geoname_country}
    ent.geoname_country  = {geoname_country},
  {/if}
  {if:geocoding_id}
    ent.geocoding_id  = {geocoding_id},
    ent.geocoding_fcl = {geocoding_fcl},
    ent.geocoding_country = {geocoding_country},
  {/if}
  ent.last_modification_date = {exec_date},
  ent.last_modification_time = {exec_time}
WITH ent
LIMIT 1
MATCH (res:resource)
  WHERE res.uuid = {resource_id}
WITH ent, res
  MERGE (ent)-[r:appears_in]->(res)
  ON CREATE SET
    {if:frequency}
      r.frequency   = {frequency},
    {/if}
    {if:languages}
      r.languages   = {languages},
    {/if}
    {if:services}
      r.services   = {services},
    {/if}
    {if:username}
      r.created_by = {username},
      r.upvote = [{username}],
      r.celebrity = 1,
      r.score = 1,
    {/if}
    {unless:username}
      r.celebrity = 0,
      r.score = 0,
    {/unless}
    r.creation_date = {exec_date},
    r.creation_time = {exec_time},
    r.last_modification_date = {exec_date},
    r.last_modification_time = {exec_time}
  ON MATCH SET
    {if:frequency}
      r.frequency   = {frequency},
    {/if}
    {if:languages}
      r.languages   = {languages},
    {/if}
    {if:services}
      r.services   = {services},
    {/if}
    r.last_modification_date = {exec_date},
    r.last_modification_time = {exec_time}
RETURN {
  id: ent.uuid,
  props: ent,
  type: last(labels(ent)),
  rel: r
} as result


// name: merge_user_entity_relationship
// create or merge the cureted by relationship on a specific entity
MATCH (ent:entity), (u:user {username:{username}})
WHERE ent.uuid = {id}
WITH ent, u
MERGE (u)-[r:curates]->(ent)
ON CREATE SET
  r.creation_date = {creation_date},
  r.creation_time = {creation_time},
  r.last_modification_date = {creation_date},
  r.last_modification_time = {creation_time}
ON MATCH SET
  r.last_modification_date = {creation_date},
  r.last_modification_time = {creation_time}
RETURN {
  id: ent.uuid,
  props: ent,
  type: last(labels(ent)),
  rel: r
} as result


// name: get_person_cooccurrences
//
MATCH (p1:person)-[r1:appears_in]-(res:resource)-[r2:appears_in]-(p2:person)
WITH p1, p2, length(collect(DISTINCT res)) as w

RETURN {
    source: {
      id: p1.uuid,
      type: LAST(labels(p1)),
      name: p1.name
    },
    target: {
      id: p2.uuid,
      type: LAST(labels(p2)),
      name: p2.name
    },
    weight: w 
  } as result
ORDER BY w DESC
LIMIT 10

// name:get_related_resources
// get related nodes that are connected with the entity
MATCH (ent:entity {uuid: {id}})
WITH ent
MATCH
  (ent)-[r:appears_in]->(res:resource){if:with}<-[:appears_in]-(ent2){/if}
  WHERE r.score > -2
  {if:with}
    AND ent2.uuid in {with}
  {/if}
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:mimetype}
    AND res.mimetype in {mimetype}
  {/if}
  {if:type}
    AND res.type in {type}
  {/if}
WITH DISTINCT res, r, ent
{if:orderby}
ORDER BY {:orderby}
{/if}
{unless:orderby}
ORDER BY r.tfidf DESC, res.start_time DESC
{/unless}

SKIP {offset}
LIMIT {limit}

OPTIONAL MATCH (res)<-[r_the:appears_in]-(the:`theme`)

WITH r, ent, res, r_the, the
ORDER BY r_the.score DESC, r_the.tfidf DESC, r_the.frequency DESC
WITH r, ent, res, filter(x in collect({  
      id: the.uuid,
      type: 'theme',
      props: the,
      rel: r_the
    }) WHERE has(x.id))[0..5] as themes   

OPTIONAL MATCH (res)<-[r_per:appears_in]-(per:`person`)
WITH r, ent, res, themes, r_per, per
ORDER BY r_per.score DESC, r_per.tfidf DESC, r_per.frequency DESC
WITH r, ent, res, themes, filter(x in collect({
      id: per.uuid,
      type: 'person',
      props: per,
      rel: r_per
    }) WHERE has(x.id))[0..5] as persons

WITH r, ent, res, themes, persons

  RETURN {
    id: res.uuid,
    props: res,
    type: last(labels(res)),
    rel: r,
    themes: themes,
    persons: persons
  } as result
ORDER BY r.tfidf DESC, res.start_date DESC


// name: signale_related_resource
// change the relationship status in order to clean it later.
MATCH (ent)-[r:appears_in]->(res:resource)
WHERE ent.uuid = {entity_id} AND res.uuid = {resource_id}




// name:count_related_resources
MATCH (ent: entity {uuid: {id}})-[r:appears_in]->(res:resource){if:with}<-[:appears_in]-(ent2){/if}
WHERE r.score > -2
  {if:with}
    AND ent2.uuid in {with}
  {/if}
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:mimetype}
    AND res.mimetype in {mimetype}
  {/if}
  {if:type}
    AND res.type in {type}
  {/if}
RETURN count(res) as count_items



// name:get_related_resources_timeline
MATCH (ent:entity {uuid: {id}})
WITH ent
MATCH (ent)-[:appears_in]->(res:resource)
  WHERE has(res.start_month)
  {if:mimetype}
  AND res.mimetype = {mimetype}
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
  WITH res
  MATCH (ent2)
  WHERE ent2.uuid in {with}
  WITH res, ent2
  MATCH (res)<-[:appears_in]-(ent2)
{/if}
  
WITH DISTINCT res
  
WITH  res.start_month as tm, min(res.start_time) as t,  count(res) as weight
RETURN tm, t, weight
ORDER BY tm ASC



// name:get_graph
// get lighter version for graph purposes, max 500 resources sorted by number of persons
MATCH (ent)-[:appears_in]->(res:resource)
WHERE ent.uuid = {id}
WITH ent, res
  OPTIONAL MATCH (pla:place)-[:appears_in]->(res)
  OPTIONAL MATCH (per:person)-[:appears_in]->(res)
WITH res,
  extract(n IN COLLECT(DISTINCT pla)| {id: n.uuid, name: n.name }) as places,
  extract(n IN COLLECT(DISTINCT per)| {id: n.uuid, name: n.name }) as persons
WITH res, persons, places,
  {
    res: {
      id: res.uuid,
      name: COALESCE(res.title_en,res.title_fr,res.title,res.name, ''),
      type: 'resource'
    },
    pla: places,
    per: persons
  } as result
WITH result, length(result.per) as entities
ORDER BY entities DESC
RETURN result
LIMIT {limit}


// name: get_related_entities_graph
// monopartite graph of entities
MATCH (n:entity {uuid: {id}})-[r:appears_in]->(t:resource)
  WHERE r.score > -1
  {if:start_time}
    AND t.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND t.end_time <= {end_time}
  {/if}
  {if:mimetype}
    AND t.mimetype in {mimetype}
  {/if}
  {if:type}
    AND t.type in {type}
  {/if}
WITH t
{if:with}
  MATCH (t)<-[r2:appears_in]-(ent2:entity)
  WHERE ent2.uuid in {with} AND r2.score > -1
  WITH t
{/if}
MATCH (p1:{:entity})-[:appears_in]->(t)<-[:appears_in]-(p2:{:entity})
WHERE id(p1) > id(p2) 
WITH p1, p2, count(t) as w 
WITH p1, p2, w
ORDER BY w DESC
LIMIT {limit} RETURN {
  source: { 
    id: p1.uuid, 
    type: '{:entity}', 
    label: COALESCE(p1.name, p1.title_en, p1.title_fr,p1.title, '')
  },
  target: { 
    id: p2.uuid, 
    type: '{:entity}',
    label: COALESCE(p2.name, p2.title_en, p2.title_fr,p2.title, '') 
  },
  weight: w
} as result 



// name: get_related_resources_graph
// monopartite graph of resources
MATCH (n:entity)-[r:appears_in]->(res:resource){if:with}-[:appears_in]-(ent2){/if}
 WHERE n.uuid = {id}
 {if:with}
    AND ent2.uuid in {with}
  {/if}
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:mimetype}
    AND res.mimetype in {mimetype}
  {/if}
  {if:type}
    AND res.type in {type}
  {/if}
WITH res ORDER BY
r.tfidf DESC
LIMIT 25
WITH collect(res.uuid) as resources
MATCH p=(t:resource)<-[r1:appears_in]-(n:entity)-[r2:appears_in]->(t1:resource)
//WITH t,r1, n, r2, t1
//ORDER BY r1.tfidf DESC, r2.tfidf DESC
WHERE  id(t) > id(t1) AND t.uuid in resources AND t1.uuid in resources
WITH t, t1, count(DISTINCT n) as w
ORDER BY w DESC
LIMIT {limit}
WITH t, t1,w
RETURN {
    source: {
      id: t.uuid,
      type: LAST(labels(t)),
      label: COALESCE(t.name, t.title_en, t.title_fr,t.title, '')
    },
    target: {
      id: t1.uuid,
      type: LAST(labels(t1)),
      label: COALESCE(t1.name, t1.title_en, t1.title_fr,t1.title, '')
    },
    weight: w 
  } as result


// name:get_related_persons
// DEPRECATED get related persons that are connected with the entity, sorted by frequence
MATCH (ent:entity)-[:appears_in]->(res:resource)
WHERE ent.uuid = {id}
WITH ent, res
  MATCH (per:person)-[:appears_in]->(res)
  WHERE per <> ent
RETURN {
  id: per.uuid,
  props: per,
  type: LAST(labels(per)),
  coappear: COUNT(DISTINCT res)
} as results ORDER BY results.coappear DESC LIMIT 10


// name:get_related_entities
//
MATCH (ent:entity)
  WHERE ent.uuid = {id}
WITH ent
MATCH (ent)-[r:appears_in]->(res:resource)
  WITH ent, res
  WHERE r.score > -2
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:mimetype}
    AND res.mimetype in {mimetype}
  {/if}
  {if:type}
    AND res.type in {type}
  {/if}
WITH ent, res
  MATCH (ent1:{:entity})-[r:appears_in]->(res)
  WHERE ent1.score > -1 AND ent1.uuid <> {id}
  {if:with}
    AND ent1.uuid IN {with}
  {/if}
WITH ent1, count(DISTINCT r) as w
RETURN {
  id: ent1.uuid,
  type: last(labels(ent1)),
  props: ent1,
  weight: w
}
ORDER BY w DESC
SKIP {offset}
LIMIT {limit}



// name:count_related_entities
//
MATCH (ent:entity)
  WHERE ent.uuid = {id}
WITH ent
MATCH (ent)-[r:appears_in]->(res:resource)
WITH ent, res
  WHERE r.score > -2
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:mimetype}
    AND res.mimetype in {mimetype}
  {/if}
  {if:type}
    AND res.type in {type}
  {/if}
WITH ent, res
  MATCH (ent1:{:entity})-[r:appears_in]->(res)
  WHERE ent1.score > -1 AND ent1 <> ent
  {if:with}
    AND ent1.uuid IN {with}
  {/if}
WITH ent1
RETURN COUNT(DISTINCT ent1) as count_items


// name: get_timeline
// get timebased resources id where the entioty a^^ears
MATCH (ent)-[:appears_in]->(res:resource)
WHERE ent.uuid = {id} AND has(res.start_time)
RETURN {id: res.uuid, start_time: res.start_time }
ORDER BY res.start_time


// name: get_relationships
// get the list of all relationships
MATCH (ent)-[r]->()
WHERE ent.uuid = {id}
RETURN r


// name: merge_relationships
// create or merge a relationship.
MATCH (n),(t)
WHERE n.uuid = {id_start} AND t.uuid = {id_end}
MERGE (n)-[r:{:%(type)}]->(t)
ON CREATE SET
  r.reconciled_by = {reconciled_by}
ON MATCH SET
  r.reconciled_by = {reconciled_by}
RETURN r


// name: update_entity_related_resource
// SET the cureted by relationship on a specific entity.
// to manually create a relationship cfr merge_entity_related_resource
MATCH (ent:entity {uuid: {entity_id}})-[r1:appears_in]->(res:resource {uuid:{resource_id}}), (u:user {uuid: {user_id}})

WITH ent, u, res, r1
  SET
    r1.last_modification_date = {exec_date},
    r1.last_modification_time = {exec_time}

WITH ent, u, res, r1

MERGE (u)-[r2:curates]->(ent)
ON CREATE SET
  r2.creation_date = {exec_date},
  r2.creation_time = {exec_time},
  r2.last_modification_date = {exec_date},
  r2.last_modification_time = {exec_time}
ON MATCH SET
  r2.last_modification_date = {exec_date},
  r2.last_modification_time = {exec_time}
SET
  ent.last_modification_date = {exec_date},
  ent.last_modification_time = {exec_time}
return ent, u, res, r1 as rel, r2



// name: remove_entity_related_resource
// delete the current relationship if it has been created by a specific user and has not been voted
MATCH (ent:entity)-[r1:appears_in]-(res:resource), (u:user)
WHERE ent.uuid = {entity_id}
  AND u.uuid = {user_id}
  AND res.uuid = {resource_id}
  AND r1.created_by = {username}
  AND length(r1.upvote) = 1
WITH r1
DELETE r1


// name: merge_entity_related_resource
//
MATCH (ent:entity), (res:resource), (u:user)
WHERE ent.uuid = {entity_id}
  AND u.uuid = {user_id}
  AND res.uuid = {resource_id}

WITH ent, u, res

MERGE (ent)-[r1:appears_in]->(res)
  ON CREATE SET
    r1.created_by    = {username},
    r1.frequence     = {frequence},
    r1.creation_date = {exec_date},
    r1.creation_time = {exec_time},
    r1.celebrity = 1,
    r1.score = 1,
    r1.last_modification_date = {exec_date},
    r1.last_modification_time = {exec_time}
  ON MATCH SET
    r1.last_modification_date = {exec_date},
    r1.last_modification_time = {exec_time}

MERGE (u)-[r3:curates]->(res)
  ON CREATE SET
    r3.creation_date = {exec_date},
    r3.creation_time = {exec_time},
    r3.last_modification_date = {exec_date},
    r3.last_modification_time = {exec_time}
  ON MATCH SET
    r3.last_modification_date = {exec_date},
    r3.last_modification_time = {exec_time}

SET
  ent.last_modification_date = {exec_date},
  ent.last_modification_time = {exec_time}

return ent, u, res, r1 as rel


// name: reconcile_entities
// scenario:  
MATCH (from:entity), (to:entity), (u:user)
WHERE from.uuid = {from_entity_id}
  AND to.uuid   = {to_entity_id}
  AND u.uuid    = {user_id}

ON MATCH SET
  r2.last_modification_date = {exec_date},
  r2.last_modification_time = {exec_time}
SET
  ent.last_modification_date = {exec_date},
  ent.last_modification_time = {exec_time}


// name: remove_entity
// WARNING!!!! destroy everything related to the user, as if it never existed.
MATCH (n:entity) WHERE n.uuid = {id} WITH n
OPTIONAL MATCH (n)-[r]-()
DELETE n, r