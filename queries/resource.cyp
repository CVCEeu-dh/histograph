// name: get_resource
// get resource with its version and comments
MATCH (res) WHERE id(res) = {id}
WITH res
OPTIONAL MATCH (res)-[r_loc:appears_in]-(loc:`location`)
WITH res, r_loc, loc
ORDER BY r_loc.tfidf DESC, r_loc.frequency DESC
WITH res, collect({  
      id: id(loc),
      type: 'location',
      props: loc,
      rel: r_loc
    })[0..5] as locations

OPTIONAL MATCH (res)-[r_per:appears_in]-(per:`person`)
WITH res, locations, r_per, per
ORDER BY r_per.tfidf DESC, r_per.frequency DESC
WITH res, locations, collect({
      id: id(per),
      type: 'person',
      props: per,
      rel: r_per
    })[0..5] as persons
OPTIONAL MATCH (res)-[r_org:appears_in]-(org:`organization`)

WITH res, locations, persons, collect({  
      id: id(org),
      type: 'organization',
      props: org,
      rel: r_org
    })[0..5] as organizations
OPTIONAL MATCH (res)-[r_soc:appears_in]-(soc:`social_group`)

WITH res, locations, persons, organizations, collect({
      id: id(soc),
      type: 'social_group',
      props: soc,
      rel: r_soc
    })[0..5] as social_groups



    OPTIONAL MATCH (ver)-[:describes]->(res)
    OPTIONAL MATCH (res)-[:belongs_to]->(col)
    OPTIONAL MATCH (com)-[:mentions]->(res)
    OPTIONAL MATCH (inq)-[:questions]->(res)

 
    RETURN {
      resource: {
        id: id(res),
        props: res,
        versions: EXTRACT(p in COLLECT(DISTINCT ver)|{name: p.name, id:id(p), yaml:p.yaml, language:p.language, type: last(labels(p))}),
        locations: locations,
        persons:   persons,
        organizations: organizations,
        social_groups:  social_groups,
        collections: EXTRACT(p in COLLECT(DISTINCT col)|{name: p.name, id:id(p), type: 'collection'}),
        comments: count(distinct com),
        inquiries: count(distinct inq)
      }
    } AS result


// name: get_resources
// get resources with number of comments, if any
MATCH (res:resource)
{if:ids}
  WHERE id(res) IN {ids}
{/if}
{?res:start_time__gt} {AND?res:end_time__lt} {AND?res:mimetype__in}
  WITH res
{if:entity_id}
  MATCH (res)--(ent:entity) WHERE id(ent)={entity_id} 
  WITH res
{/if}
{if:orderby}
ORDER BY {:orderby}
{/if}
{unless:orderby}
ORDER BY res.start_time DESC
{/unless}
SKIP {offset} 
LIMIT {limit}

WITH res
OPTIONAL MATCH (res)-[r_loc:appears_in]-(loc:`location`)

WITH res, collect({  
      id: id(loc),
      type: 'location',
      props: loc,
      rel: r_loc
    })[0..5] as locations   
OPTIONAL MATCH (res)-[r_per:appears_in]-(per:`person`)

WITH res, locations, collect({
      id: id(per),
      type: 'person',
      props: per,
      rel: r_per
    })[0..5] as persons
OPTIONAL MATCH (res)-[r_org:appears_in]-(org:`organization`)

WITH res, locations, persons, collect({  
      id: id(org),
      type: 'organization',
      props: org,
      rel: r_org
    })[0..5] as organizations
OPTIONAL MATCH (res)-[r_soc:appears_in]-(soc:`social_group`)

WITH res, locations, persons, organizations, collect({
      id: id(soc),
      type: 'social_group',
      props: soc,
      rel: r_soc
    })[0..5] as social_groups

{if:entity_id}
  OPTIONAL MATCH (res)--(ann:annotation) 
  WITH res, ann, locations, persons, organizations, social_groups
{/if}

RETURN {
  id:id(res),
  type: 'resource',
  props: res,
  {if:entity_id}
    ann: ann,
  {/if}
  persons:     persons,
  organizations: organizations,
  locations:    locations,
  social_groups:   social_groups
} as resource
{if:orderby}
ORDER BY {:orderby}
{/if}
{unless:orderby}
ORDER BY res.start_time DESC
{/unless}


// name: count_resources
// count resources having a version, with current filters
MATCH (res:resource){if:entity_id}--(ent:entity)
  WHERE id(ent)={entity_id} 
WITH res
{/if}
{?res:start_time__gt} {AND?res:end_time__lt}
RETURN count(res) as count_items



// name: get_resources_by_ids
// get resources with number of comments, if any
MATCH (res:resource)
WHERE id(res) in {ids}
WITH res
    OPTIONAL MATCH (ver)-[:describes]->(res)
    OPTIONAL MATCH (ent)-[:appears_in]->(res)
    OPTIONAL MATCH (res)-[:belongs_to]->(col)
    OPTIONAL MATCH (com)-[:mentions]->(res)
    OPTIONAL MATCH (inq)-[:questions]->(res)
  WITH ver, res, ent, col, com, inq, {
      id: id(res),
      props: res,
      versions: EXTRACT(p in COLLECT(DISTINCT ver)|{name: p.name, id:id(p), yaml:p.yaml, language:p.language, type: last(labels(p))}),
      entities: EXTRACT(p in COLLECT(DISTINCT ent)|{name: p.name, id:id(p), type: last(labels(p)), props: p}),
      collections: EXTRACT(p in COLLECT(DISTINCT col)|{name: p.name, id:id(p), type: 'collection'}),
      comments: count(distinct com),
      inquiries: count(distinct inq)
    } AS result
  RETURN result


// name: count_similar_resource_ids_by_entities
// get top 100 similar resources sharing the same persons, orderd by time proximity if this info is available
MATCH (res:resource)-[:appears_in*2]-(e)
WHERE id(res) = {id}
RETURN count(DISTINCT(e)) as count_items


// name: get_similar_resource_ids_by_entities_v1
// get top 100 similar resources sharing the same persons, orderd by time proximity if this info is available
MATCH (res)<-[R1:appears_in]-(ent:entity)-[R2:appears_in]->(res2:resource)
  WHERE id(res) = {id} AND ent.score > -1 
WITH res, ent, res2, R1, R2, {
  target: id(res2),
  dst : abs(coalesce(res.start_time, 1000000000) - coalesce(res2.start_time, 0)),
  det : abs(coalesce(res.end_time, 1000000000) - coalesce(res2.end_time, 0)),
  //labels: count(DISTINCT(last(labels(ent)))),
  int : count(DISTINCT ent)
} as candidate
RETURN candidate
ORDER BY
{unless:orderby}
  R1.tfidf DESC, R2.tfidf DESC, candidate.dst ASC, candidate.det ASC
{/unless}
{if:orderby}
   ORDER BY {:orderby}
{/if}
SKIP {offset}
LIMIT {limit}



// name: get_similar_resource_ids_by_entities
//
MATCH (res1:resource)<-[r1:appears_in]-(ent:entity)-[r2:appears_in]->(res2:resource)
  WHERE id(res1) = {id}
    AND ent.score > -1
    {if:mimetype}
    AND res2.mimetype = {mimetype}
    {/if}
    {if:start_time}
    AND res2.start_time >= {start_time}
    {/if}
    {if:end_time}
    AND res2.end_time >= {end_time}
    {/if}
    AND id(res1) <> id(res2)
  
WITH res1, res2, count(*) as intersection

MATCH (res1)<-[rel:appears_in]-(r1:entity)
WITH res1, res2, intersection, count(rel) as H1

MATCH (res2)<-[rel:appears_in]-(r1:entity)
WITH res1,res2, intersection, H1, count(rel) as H2
WITH res1, res2, intersection, H1+H2 as union
WITH res1, res2, intersection, union, toFloat(intersection)/toFloat(union) as JACCARD

{unless:orderby}
ORDER BY JACCARD DESC
SKIP {offset}
LIMIT {limit}
{/unless}
RETURN {
  target: id(res2),
  type: LAST(labels(res2)),
  dst : abs(coalesce(res1.start_time, 1000000000) - coalesce(res2.start_time, 0)),
  det : abs(coalesce(res1.end_time, 1000000000) - coalesce(res2.end_time, 0)),
  weight: JACCARD
} as result
{if:orderby}
  ORDER BY {:orderby}
{/if}

// name: add_comment_to_resource
// add a comment to a resource, by user username. At least one #tag should be provided
START res=node({id})
  MATCH (u:user {username:{username}})
  WITH res, u 
    CREATE (com:`comment` {
      creation_date: {creation_date},
      creation_time: {creation_time},
      content: {content},
      tags: {tags}
    })
    CREATE (u)-[:says]->(com)
    CREATE (com)-[:mentions]->(res)
  WITH u, com, res
    MATCH (u:user)-[r4:says]-(com)-[r5:mentions]-(res)
    WITH res, {
      id: id(com),
      comment: com,
      user: u
    } AS coms
  RETURN {
    comments: collect(DISTINCT coms)
  } AS result


// name: get_resource_by_doi
// FOR MIGRATION ONLY
MATCH (res:resource {doi:{doi}})
RETURN res


// name: merge_collection_by_name
// add a collection (it is basically a tag for resource) FOR MIGRATION ONLY
MERGE (col:collection {name:{name}})
RETURN col


// name: merge_resource
// also assign a default curator for the resource
{if:slug}
  MERGE (res:resource {slug:{slug}})
{/if}
{unless:slug}
  MERGE (res:resource {doi:{doi}})
{/unless}
  ON CREATE set
    res.name = {name},
    res.mimetype = {mimetype},
    res.languages = {languages},
    {if:start_time}
      res.start_time = {start_time},
      res.end_time   = {end_time},
      res.start_date = {start_date},
      res.end_date   = {end_date},
    {/if}
    {if:start_month}
      res.start_month = {start_month},
      res.end_month   = {end_month},
    {/if}
    {if:full_search}
      res.full_search = {full_search},
    {/if}
    {if:title_search}
      res.title_search = {title_search},
    {/if}
    {if:url}
      res.url = {url},
    {/if}
    {if:url_en}
      res.url_en = {url_en},
    {/if}
    {if:url_fr}
      res.url_fr = {url_fr},
    {/if}
    {if:url_de}
      res.url_de = {url_de},
    {/if}
    {if:title_en}
      res.title_en = {title_en},
    {/if}
    {if:title_fr}
      res.title_fr = {title_fr},
    {/if}
    {if:title_de}
      res.title_de = {title_de},
    {/if}
    {if:caption_en}
      res.caption_en = {caption_en},
    {/if}
    {if:caption_fr}
      res.caption_fr = {caption_fr},
    {/if}
    {if:caption_de}
      res.caption_de = {caption_de},
    {/if}
    res.creation_date = {creation_date},
    res.creation_time = {creation_time}
  ON MATCH SET
    {if:start_time}
      res.start_time = {start_time},
      res.end_time   = {end_time},
      res.start_date = {start_date},
      res.end_date   = {end_date},
    {/if}
    {if:start_month}
      res.start_month = {start_month},
      res.end_month   = {end_month},
    {/if}
    {if:full_search}
      res.full_search = {full_search},
    {/if}
    {if:title_search}
      res.title_search = {title_search},
    {/if}
    {if:url}
      res.url = {url},
    {/if}
    {if:url_en}
      res.url_en = {url_en},
    {/if}
    {if:url_fr}
      res.url_fr = {url_fr},
    {/if}
    {if:url_de}
      res.url_de = {url_de},
    {/if}
    {if:title_en}
      res.title_en = {title_en},
    {/if}
    {if:title_fr}
      res.title_fr = {title_fr},
    {/if}
    {if:title_de}
      res.title_de = {title_de},
    {/if}
    {if:caption_en}
      res.caption_en = {caption_en},
    {/if}
    {if:caption_fr}
      res.caption_fr = {caption_fr},
    {/if}
    {if:caption_de}
      res.caption_de = {caption_de},
    {/if}
    res.last_modification_date = {creation_date},
    res.last_modification_time = {creation_time}
WITH res
MATCH (u:user {username: {username}})
  MERGE (u)-[r:curates]->(res)
RETURN {
  id: id(res),
  props: res,
  curated_by: u.username
}

// name: remove_resource
// WARNING!!!! destroy everything related to the resource, as if it never existed. Should not be used while comments are in place
MATCH (n:resource)
WHERE id(n) = {id}
OPTIONAL MATCH (n)-[r]-()
DELETE n, r


// name: merge_relationship_resource_collection
// link a resource with an entity, it it han't been done yet.
MATCH (col:collection), (res:resource)
  WHERE id(col)={collection_id} AND id(res)={resource_id}
WITH col, res
  MERGE (res)-[r:belongs_to]->(col)
RETURN col, res


// name: get_cooccurrences
//
MATCH (p1:person)-[r:appear_in_same_document]-(p2:person)
WHERE id(p1) < id(p2) AND r.jaccard < 0.33
RETURN {
  source: {
    id: id(p1),
    type: 'person',
    label: COALESCE(p1.name, p1.title_en, p1.title_fr)
  },
  target: {
    id: id(p2),
    type: 'person',
    label: COALESCE(p2.name, p2.title_en, p2.title_fr)
  },
  weight: r.jaccard
}
ORDER BY r.jaccard DESC
LIMIT {limit}


// name: get_filtered_cooccurrences
//
MATCH (p1:person)-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(p2:person)
{?res:start_time__gt} {AND?res:end_time__lt}
WHERE id(p1) < id(p2)
  {if:start_time}
    AND res.start_time >= {start_time}
  {/if}
  {if:end_time}
    AND res.end_time <= {end_time}
  {/if}
  {if:mimetype}
    AND res.mimetype in {mimetype}
  {/if}
  {if:entity_id}
    AND id(p1) IN {entity_id}
    AND id(p2) IN {entity_id}
  {/if}
  AND p1.score > -1
  AND p2.score > -1
WITH p1, p2, res
ORDER BY r1.tfidf DESC, r2.tfidf DESC
// limit here?
WITH p1, p2, count(DISTINCT res) as w
RETURN {
    source: {
      id: id(p1),
      type: 'person',
      label: COALESCE(p1.name, p1.title_en, p1.title_fr)
    },
    target: {
      id: id(p2),
      type: 'person',
      label: COALESCE(p2.name, p2.title_en, p2.title_fr)
    },
    weight: w
  } as result
ORDER BY w DESC
LIMIT {limit}


// name: get_graph_persons
// DEPRECATED
MATCH (n)-[r]-(per:person)
  WHERE id(n) = {id}
WITH per
  MATCH (per)--(res:resource)
WITH res
  MATCH (p1:person)-[:appears_in]-(res)-[:appears_in]-(p2:person)
  WHERE p1.score > -1 AND p2.score > -1
WITH p1, p2, count(DISTINCT res) as w
RETURN {
  source: {
    id: id(p1),
    type: LAST(labels(p1)),
    score: p1.score,
    label: p1.name
  },
  target: {
    id: id(p2),
    type: LAST(labels(p2)),
    score: p2.score,
    label: p2.name
  },
  weight: w 
} as result
ORDER BY result.weight DESC
LIMIT {limit}

// name: get_related_entities_graph
//
MATCH (n)<-[r1:appears_in]-(ent:{:entity})-[r2:appears_in]->(res:resource)
  WHERE id(n) = {id}
WITH res
MATCH (p1:{:entity})-[:appears_in]->(res)<-[:appears_in]-(p2:{:entity})
 WHERE p1.score > -1 AND p2.score > -1
WITH p1, p2, count(DISTINCT res) as w
RETURN {
    source: {
      id: id(p1),
      type: LAST(labels(p1)),
      label: COALESCE(p1.name, p1.title_en, p1.title_fr,p1.title, '')
    },
    target: {
      id: id(p2),
      type: LAST(labels(p2)),
      label: COALESCE(p2.name, p2.title_en, p2.title_fr,p2.title, '')
    },
    weight: w 
  } as result
ORDER BY w DESC
LIMIT 500




// name: get_related_resources_graph
//
MATCH (res:resource)-[:appears_in]-(ent:person)
WHERE id(res) = {id} AND ent.score > -1
WITH ent
MATCH (res3:resource)<--(ent)-->(res2:resource)
WHERE res2 <> res3
WITH res2, res3, count(distinct ent) as intersection
RETURN {
  source: {
    id: id(res2),
    type: LAST(labels(res2)),
    label: COALESCE(res2.name, res2.title_en, res2.title_fr)
  },
  target: {
    id: id(res3),
    type: LAST(labels(res3)),
    label: COALESCE(res3.name, res3.title_en, res3.title_fr)
  },
  weight: intersection
} as result
ORDER BY intersection DESC
LIMIT {limit}



// name: count_timeline
//
MATCH (res:resource)
WHERE res.start_time IS NOT NULL
{?res:start_time__gt} {AND?res:end_time__lt}
return count(distinct res.start_time)


// name: get_timeline
//
MATCH (res:resource)
  WHERE has(res.start_month)
{if:start_time}
  AND res.start_time >= {start_time}
{/if}
{if:end_time}
  AND res.end_time <= {end_time}
{/if} 
WITH  res.start_month as tm, min(res.start_time) as t, count(res) as weight
RETURN t, weight


// name: get_related_resources_timeline
//
MATCH (res:resource)<-[:appears_in]-(ent:entity)
WHERE id(res) = {id}
WITH ent
MATCH (res:resource)<-[:appears_in]-(ent)
WHERE has(res.start_month)
WITH  res.start_month as tm, min(res.start_time) as t, count(res) as weight
RETURN tm, t, weight
ORDER BY tm ASC



// name: get_timeline_per_day
//
MATCH (res:resource)
WHERE has(res.start_time)
{if:start_time}
  AND res.start_time >= {start_time}
{/if}
{if:end_time}
  AND res.end_time <= {end_time}
{/if} 
WITH  res.start_time as t, count(res) as weight
RETURN t, weight


// name: get_timeline_similar_resource_ids_by_entities
//
MATCH (res)
WHERE id(res) = 19389
WITH res
OPTIONAL MATCH (res)--(per:person)--(r)
OPTIONAL MATCH (res)--(loc:location)--(r)
WHERE id(r) <> id(res)
WITH 
{
  id: id(r),
  shared_persons: count(DISTINCT per),
  shared_locations: count(DISTINCT loc),
  start_time: r.start_time
} as candidate
WHERE candidate.start_time IS NOT NULL AND candidate.shared_persons > 0 OR candidate.shared_locations > 0
RETURN candidate.start_time as t, count(*) as weight


// name: merge_user_resource_relationship
// create or merge the cureted by relationship on a specific entity
MATCH (res:resource), (u:user {username:{username}})
WHERE id(res) = {id}
WITH res, u
MERGE (u)-[r:curates]->(res)
ON CREATE SET
  r.creation_date = {creation_date},
  r.creation_time = {creation_time},
  r.favourited = true
ON MATCH SET
  r.last_modification_date = {creation_date},
  r.last_modification_time = {creation_time},
  r.favourited = true
RETURN {
  id: id(res),
  props: res,
  type: last(labels(res)),
  rel: r
} as result


// name:count_related_users
// get related users that 'curates's OR liked the resource
MATCH (u:user)-[*0..2]-(res)
WHERE id(res) = {id}
RETURN count(DISTINCT u) as count_items

// name:get_related_users
// get related users that 'curates'sthe resource
MATCH (res:resource)-[*0..2]-(u)
WHERE id(res) = {id}
WITH res
OPTIONAL MATCH (u)-[r:curates]->(res)
OPTIONAL MATCH (u)-[r2:proposes]->(inq)-[:questions]->(res)
WITH u, r, {
    id: id(inq),
    type: last(labels(inq)),
    rel: r2,
    props: inq
  } as proposed_inquiries
RETURN  {
  id: id(u),
  username: u.username,
  props: u,
  type: last(labels(u)),
  favourites: COLLECT(DISTINCT r),
  proposes: COLLECT(DISTINCT proposed_inquiries)
} as users


// name:get_related_entities
// get related nodes that are connected with the entity. test with
// > node .\scripts\manage.js --task=query --cypher=resource/get_related_entities --id=<ID> --limit=10 --type=person --offset=0
MATCH (n)-[r]-(ent:{:entity})
  WHERE id(n) = {id}
WITH ent
  MATCH (ent)--(res:resource)
  // order by relevance ...
WITH res
  MATCH (ent1:{:entity})-[r:appears_in]->(res)
  WHERE ent1.score > -1
WITH ent1, count(DISTINCT r) as w
RETURN {
  id: id(ent1),
  type: last(labels(ent1)),
  props: ent1,
  weight: w
}
ORDER BY w DESC
SKIP {offset}
LIMIT {limit}

// name:count_related_entities
// get related nodes that are connected with the entity. test with
// > node .\scripts\manage.js --task=query --cypher=resource/get_related_entities --id=<ID> --limit=10 --type=person --offset=0
MATCH (n)-[r]-(ent:{:entity})
  WHERE id(n) = {id}
WITH ent
  MATCH (ent)--(res:resource)
  // order by relevance ...
WITH res
  MATCH (ent1:{:entity})-[:appears_in]->(res)
  WHERE ent1.score > -1
WITH ent1
RETURN COUNT(DISTINCT ent1) as count_items