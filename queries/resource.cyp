// name: get_resource
// get resource with its version and comments
MATCH (res:resource {uuid: {id}})
WITH res
OPTIONAL MATCH (res)<-[r_cur:curates]-(u:user {username:{username}})
WITH res, count(r_cur) as curated_by_user
OPTIONAL MATCH (res)<-[r_lik:likes]-(u:user {username:{username}})
WITH res, curated_by_user, count(r_lik)> 0 as loved_by_user
OPTIONAL MATCH (lover:user)-[:likes]->(res)
WITH res, curated_by_user, loved_by_user, count(lover) as lovers
OPTIONAL MATCH (curator:user)-[:curates]->(res)
WITH res, curated_by_user, loved_by_user, lovers, count(curator) as curators

OPTIONAL MATCH (res)-[r_pla:appears_in]-(pla:`place`)
WITH res, curated_by_user, loved_by_user, curators, lovers, r_pla, pla
ORDER BY r_pla.score DESC, r_pla.tfidf DESC, r_pla.frequency DESC
WITH res, curated_by_user, loved_by_user, curators, lovers, filter(x in collect({  
      id: pla.uuid,
      type: 'place',
      props: pla,
      rel: r_pla
    }) WHERE has(x.id))[0..5] as places

OPTIONAL MATCH (res)-[r_loc:appears_in]-(loc:`location`)
WITH res, curated_by_user, loved_by_user, curators, lovers, places, r_loc, loc
ORDER BY r_loc.score DESC, r_loc.tfidf DESC, r_loc.frequency DESC
WITH res, curated_by_user, loved_by_user, curators, lovers, places, filter(x in collect({  
      id: loc.uuid,
      type: 'location',
      props: loc,
      rel: r_loc
    }) WHERE has(x.id))[0..5] as locations

OPTIONAL MATCH (res)-[r_per:appears_in]-(per:`person`)
WITH res, curated_by_user, loved_by_user, curators, lovers, places, locations, r_per, per
ORDER BY r_per.score DESC, r_per.tfidf DESC, r_per.frequency DESC
WITH res, curated_by_user, loved_by_user, curators, lovers, places, locations, filter(x in collect({
      id: per.uuid,
      type: 'person',
      props: per,
      rel: r_per
    }) WHERE has(x.id))[0..10] as persons

OPTIONAL MATCH (res)-[r_org:appears_in]-(org:`organization`)
WITH res, curated_by_user, loved_by_user, curators, lovers, places, locations, persons, r_org, org
ORDER BY r_org.score DESC, r_org.tfidf DESC, r_org.frequency DESC
WITH res, curated_by_user, loved_by_user, curators, lovers, places, locations, persons, filter(x in collect({  
      id: org.uuid,
      type: 'organization',
      props: org,
      rel: r_org
    }) WHERE has(x.id))[0..10] as organizations

OPTIONAL MATCH (res)-[r_soc:appears_in]-(soc:`social_group`)
WITH res, curated_by_user, loved_by_user, curators, lovers, places, locations, persons, organizations, r_soc, soc
ORDER BY r_soc.score DESC, r_soc.tfidf DESC, r_soc.frequency DESC
WITH res, curated_by_user, loved_by_user, curators, lovers, places, locations, persons, organizations, filter(x in collect({
      id: soc.uuid,
      type: 'social_group',
      props: soc,
      rel: r_soc
    }) WHERE has(x.id))[0..10] as social_groups

OPTIONAL MATCH (res)-[r_the:appears_in]-(the:`theme`)
WITH res, curated_by_user, loved_by_user, curators, lovers, places, locations, persons, organizations, social_groups, filter(x in collect({
      id: the.uuid,
      type: 'theme',
      props: the,
      rel: r_the
    }) WHERE has(x.id))[0..5] as themes

OPTIONAL MATCH (ver)-[:describes]->(res)
OPTIONAL MATCH (res)-[:belongs_to]->(col)
OPTIONAL MATCH (com)-[:mentions]->(res)
OPTIONAL MATCH (inq)-[:questions]->(res)


RETURN {
  resource: {
    id: res.uuid,
    type: last(labels(res)),
    props: res,
    curated_by_user: curated_by_user,
    loved_by_user: loved_by_user,
    versions: EXTRACT(p in COLLECT(DISTINCT ver)|{name: p.name, id: p.uuid, yaml:p.yaml, language:p.language, type: last(labels(p))}),
    locations: locations,
    places: places,
    persons:   persons,
    organizations: organizations,
    social_groups:  social_groups,
    themes:  themes,
    //collections: EXTRACT(p in COLLECT(DISTINCT col)|{name: p.name, id: p.uuid, type: 'collection'}),
    comments: count(distinct com),
    inquiries: count(distinct inq),
    lovers: lovers,
    curators: curators
  }
} AS result


// name: get_resources
// get resources with number of comments, if any
{unless:with}
MATCH (res:resource)
{/unless}
{if:with}
  MATCH (res:resource)<-[:appears_in]-(ent:entity)
  WHERE ent.uuid IN {with}
  WITH DISTINCT res
{/if}
WHERE res:resource
{if:ids}
  AND res.uuid IN {ids}
{/if}
{if:start_time}
  AND res.start_time >= {start_time}
{/if}
{if:end_time}
  AND res.end_time >= {end_time}
{/if}
{if:type}
  AND res.type IN {type}
{/if}
{if:mimetype}
  AND res.mimetype IN {mimetype}
{/if}


WITH res

{if:orderby}
ORDER BY {:orderby}
{/if}
{unless:orderby}
ORDER BY res.last_modification_time DESC
{/unless}
SKIP {offset} 
LIMIT {limit}
WITH res
OPTIONAL MATCH (res)-[r_loc:appears_in]->(loc:`location`)
// WHERE loc.score > -2
WITH res, r_loc, loc
ORDER BY r_loc.score DESC, r_loc.tfidf DESC, r_loc.frequency DESC
WITH res,  filter(x in collect({  
      id: loc.uuid,
      type: 'location',
      props: loc,
      rel: r_loc
    }) WHERE has(x.id))[0..5] as locations   
OPTIONAL MATCH (res)<-[r_per:appears_in]-(per:`person`)
// WHERE per.score > -2
WITH res, locations, r_per, per
ORDER BY  r_per.score DESC, r_per.tfidf DESC, r_per.frequency DESC
WITH res, locations,  filter(x in collect({  
      id: per.uuid,
      type: 'person',
      props: per,
      rel: r_per
    }) WHERE has(x.id))[0..5] as persons
OPTIONAL MATCH (res)<-[r_org:appears_in]-(org:`organization`)
// WHERE org.score > -2
WITH res, locations, persons,  filter(x in collect({    
      id: org.uuid,
      type: 'organization',
      props: org,
      rel: r_org
    }) WHERE has(x.id))[0..5] as organizations
OPTIONAL MATCH (res)<-[r_soc:appears_in]-(soc:`social_group`)
// WHERE soc.score > -2
WITH res, locations, persons, organizations,  filter(x in collect({  
      id: soc.uuid,
      type: 'social_group',
      props: soc,
      rel: r_soc
    }) WHERE has(x.id))[0..5] as social_groups
OPTIONAL MATCH (res)<-[r_the:appears_in]-(the:`theme`)
// WHERE the.score > -2
WITH res, locations, persons, organizations, social_groups, filter(x in collect({    
      id: the.uuid,
      type: 'theme',
      props: the,
      rel: r_the
    }) WHERE has(x.id))[0..5] as themes

{if:with}
  OPTIONAL MATCH (res)--(ann:annotation) 
  WITH res, ann, locations, persons, organizations, themes, social_groups
{/if}

RETURN {
  id: res.uuid,
  type: 'resource',
  props: res,
  {if:with}
    annotations: collect(ann),
  {/if}
  persons:     persons,
  themes:     themes,
  organizations: organizations,
  locations:    locations,
  social_groups:   social_groups
} as resource
//{if:orderby}
//ORDER BY {:orderby}
//{/if}
//{unless:orderby}
ORDER BY resource.props.start_time ASC
//{/unless}


// name: count_resources
// count resources having a version, with current filters
{unless:with}
MATCH (res:resource)
{/unless}
{if:with}
  MATCH (res:resource)<-[:appears_in]-(ent:entity)
  WHERE ent.uuid IN {with}
  WITH DISTINCT res
{/if}

{?res:start_time__gt}
{AND?res:end_time__lt}
{AND?res:type__in}

WITH collect(res) as resources
WITH resources, length(resources) as total_items
UNWIND resources as res

RETURN {
  group: {if:group}res.{:group}{/if}{unless:group}res.type{/unless}, 
  count_items: count(res),
  total_items: total_items
} // count per type



// name: get_resources_by_ids
// get resources with number of comments, if any
MATCH (res:resource)<-[:appears_in]-()
WHERE res.uuid in {ids}
WITH DISTINCT res
    OPTIONAL MATCH (ver)-[:describes]->(res)
    OPTIONAL MATCH (ent)-[:appears_in]->(res)
    OPTIONAL MATCH (res)-[:belongs_to]->(col)
    OPTIONAL MATCH (com)-[:mentions]->(res)
    OPTIONAL MATCH (inq)-[:questions]->(res)
  WITH ver, res, ent, col, com, inq, {
      id: res.uuid,
      props: res,
      versions: EXTRACT(p in COLLECT(DISTINCT ver)|{name: p.name, id: p.uuid, yaml:p.yaml, language:p.language, type: last(labels(p))}),
      entities: EXTRACT(p in COLLECT(DISTINCT ent)|{name: p.name, id: p.uuid, type: last(labels(p)), props: p}),
      collections: EXTRACT(p in COLLECT(DISTINCT col)|{name: p.name, id: p.uuid, type: 'collection'}),
      comments: count(distinct com),
      inquiries: count(distinct inq)
    } AS result
  RETURN result


// name: count_related_resources
// get top 100 similar resources sharing the same persons, orderd by time proximity if this info is available
MATCH (res:resource)
  WHERE res.uuid = {id} 
WITH res
MATCH (res)<-[r1:appears_in]-(ent:entity)
WHERE r1.score > -1 AND ent.score > -1
WITH res, r1, ent
  ORDER BY r1.tfidf DESC
  LIMIT 9
WITH ent
MATCH (ent)-[:appears_in]->(res2:resource)
{if:with}
  WHERE id(res2) <> {id}

  WITH res2
  MATCH (res2)<-[:appears_in]-(ent2:entity) 
  WHERE id(ent2) IN {with}

{/if}
{unless:with}
  WHERE id(res2) <> {id}
{/unless}

  {if:mimetype}
  AND res2.mimetype IN {mimetype}
  {/if}
  {if:type}
  AND res2.type IN {type}
  {/if}
  {if:start_time}
  AND res2.start_time >= {start_time}
  {/if}
  {if:end_time}
  AND res2.end_time <= {end_time}
  {/if}
WITH res2
RETURN {
  group: {if:group}res2.{:group}{/if}{unless:group}res2.type{/unless}, 
  count_items: count(res2)
} // count per type


// name: get_related_resources
// top 20 entities attached to the person
MATCH (res1:resource {uuid: {id}})<-[r1:appears_in]-(ent:entity)
WHERE r1.score > -1 AND ent.score > -1
WITH res1, r1, ent
  ORDER BY r1.score DESC, r1.tfidf DESC
  LIMIT 9
WITH res1, r1, ent
MATCH (ent)-[r2:appears_in]->(res2:resource){if:with}, (res2)<-[:appears_in]-(ent2:entity) WHERE id(ent2) IN {with} AND id(res2) <> {id}{/if}
{unless:with} WHERE res2.uuid <> {id} {/unless}

    {if:mimetype}
    AND res2.mimetype IN {mimetype}
    {/if}
    {if:type}
    AND res2.type IN {type}
    {/if}
    {if:start_time}
    AND res2.start_time >= {start_time}
    {/if}
    {if:end_time}
    AND res2.end_time <= {end_time}
    {/if}

WITH res1, res2, count(*) as intersection

// MATCH (res1)<-[rel:appears_in]-(r1:entity)
// WITH res1, res2, intersection, count(rel) as H1

// MATCH (res2)<-[rel:appears_in]-(r1:entity)
// WITH res1,res2, intersection, H1, count(rel) as H2
// WITH res1, res2, intersection, H1+H2 as union
// WITH res1, res2, intersection, union, toFloat(intersection)/toFloat(union) as JACCARD

// {unless:orderby}
// ORDER BY JACCARD DESC
// SKIP {offset}
// LIMIT {limit}
// {/unless}
{unless:orderby}
 ORDER BY intersection DESC
 SKIP {offset}
 LIMIT {limit}
{/unless}
WITH res1, res2, intersection
OPTIONAL MATCH (res2)<-[r_per:appears_in]-(per:`person`)
WHERE per.score > -2
WITH res1, res2, intersection, r_per, per
ORDER BY  r_per.score DESC, r_per.tfidf DESC, r_per.frequency DESC
WITH res1, res2, intersection, filter(x in collect({  
      id: per.uuid,
      type: 'person',
      props: per,
      rel: r_per
    }) WHERE has(x.id))[0..5] as persons

WITH res1, res2, intersection, persons
OPTIONAL MATCH (res2)<-[r_the:appears_in]-(the:`theme`)
WITH res1, res2, intersection, persons, r_the, the
ORDER BY  r_the.score DESC, r_the.tfidf DESC, r_the.frequency DESC
WITH res1, res2, intersection, persons, filter(x in collect({  
      id: the.uuid,
      type: 'theme',
      props: the,
      rel: r_the
    }) WHERE has(x.id))[0..5] as themes

RETURN {
  id: res2.uuid,
  props: res2,
  persons: persons,
  themes: themes,
  target: res2.uuid,
  type: LAST(labels(res2)),
  dst : abs(coalesce(res1.start_time, 1000000000) - coalesce(res2.start_time, 0)),
  det : abs(coalesce(res1.end_time, 1000000000) - coalesce(res2.end_time, 0)),
  // weight: JACCARD
  weight : intersection
} as result
{if:orderby}
  ORDER BY {:orderby}
  SKIP {offset}
  LIMIT {limit}
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
      id: com.uuid,
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
    res.uuid = {uuid},
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
    {if:title_it}
      res.title_it = {title_it},
    {/if}
    {if:title_en}
      res.title_en = {title_en},
    {/if}
    {if:title_es}
      res.title_es = {title_es},
    {/if}
    {if:title_fr}
      res.title_fr = {title_fr},
    {/if}
    {if:title_de}
      res.title_de = {title_de},
    {/if}
    {if:title_und}
      res.title_und = {title_und},
    {/if}
    {if:caption_en}
      res.caption_en = {caption_en},
    {/if}
    {if:caption_fr}
      res.caption_fr = {caption_fr},
    {/if}
    {if:caption_it}
      res.caption_it = {caption_it},
    {/if}
    {if:caption_es}
      res.caption_es = {caption_es},
    {/if}
    {if:caption_de}
      res.caption_de = {caption_de},
    {/if}
    {if:caption_und} 
      res.caption_und = {caption_und},
    {/if}
    {if:type}
      res.type = {type},
    {/if}
    res.creation_date = {creation_date},
    res.creation_time = {creation_time}
  ON MATCH SET
    res.uuid = {uuid},
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
    {if:title_und}
      res.title_und = {title_und},
    {/if}
    {if:title_en}
      res.title_en = {title_en},
    {/if}
    {if:title_es}
      res.title_es = {title_es},
    {/if}
    {if:title_it}
      res.title_it = {title_it},
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
    {if:caption_it}
      res.caption_it = {caption_it},
    {/if}
    {if:caption_es}
      res.caption_es = {caption_es},
    {/if}
    {if:caption_de}
      res.caption_de = {caption_de},
    {/if}
    {if:caption_und} 
      res.caption_und = {caption_und},
    {/if}
    {if:type}
      res.type = {type},
    {/if}
    res.last_modification_date = {creation_date},
    res.last_modification_time = {creation_time}
WITH res
MATCH (u:user {username: {username}})
  MERGE (u)-[r:curates]->(res)
RETURN {
  id: res.uuid,
  props: res,
  curated_by: u.username
}

// name: remove_resource
// WARNING!!!! destroy everything related to the resource, as if it never existed. Should not be used while comments are in place
MATCH (n:resource)
WHERE n.uuid = {id}
OPTIONAL MATCH (n)-[r]-()
DELETE n, r


// name: merge_relationship_resource_collection
// link a resource with an entity, it it han't been done yet.
MATCH (col:collection), (res:resource)
  WHERE col.uuid={collection_id} AND res.uuid={resource_id}
WITH col, res
  MERGE (res)-[r:belongs_to]->(col)
RETURN col, res


// name: get_precomputated_cooccurrences
//
MATCH (p1:{:entity})-[r:appear_in_same_document]-(p2:{:entity})
WHERE id(p1) < id(p2)
WITH p1,p2,r
ORDER BY r.intersections DESC
LIMIT {limit}
WITH p1,p2,r
RETURN {
  source: {
    id: p1.uuid,
    type: {entity},
    label: COALESCE(p1.name, p1.title_en, p1.title_fr),
    url: p1.thumbnail
  },
  target: {
    id: p2.uuid,
    type: {entity},
    label: COALESCE(p2.name, p2.title_en, p2.title_fr),
    url: p2.thumbnail
  },
  weight: r.intersections
} as result



// name: get_cooccurrences
// 
{if:with}
MATCH (ent2:entity)
  WHERE ent2.uuid IN {with}
WITH ent2
MATCH (res:resource)<-[:appears_in]-(ent2)
WITH res
  MATCH (p1:{:entity})-[r1:appears_in]->(res)<-[r2:appears_in]-(p2:{:entity})
{/if}
{unless:with}
MATCH (p1:{:entity})-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(p2:{:entity})
{/unless}
  WHERE id(p1) < id(p2) AND r1.score > -1 AND r2.score > -1 AND p1.score > -1 AND p2.score > -1
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
WITH p1, p2, count(res) as w
ORDER BY w DESC
LIMIT {limit}
RETURN {
    source: {
      id: p1.uuid,
      type: {entity},
      label: COALESCE(p1.name, p1.title_en, p1.title_fr),
      url: p1.thumbnail
    },
    target: {
      id: p2.uuid,
      type: {entity},
      label: COALESCE(p2.name, p2.title_en, p2.title_fr),
      url: p2.thumbnail
    },
    weight: w
  } as result


// name: get_bipartite_cooccurrences
//
{if:with}
MATCH (ent2:entity)
  WHERE ent2.uuid IN {with}
WITH ent2
MATCH (res:resource)<-[:appears_in]-(ent2)
WITH res
  MATCH (p1:{:entityA})-[r1:appears_in]->(res)<-[r2:appears_in]-(p2:{:entityB})
{/if}
{unless:with}
MATCH (p1:{:entityA})-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(p2:{:entityB})
{/unless}
  WHERE p1.score > -1 AND p2.score > -1
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
  
  
WITH p1, p2, count(res) as w
ORDER BY w DESC
LIMIT {limit}
RETURN {
    source: {
      id: p1.uuid,
      type: {entityA},
      label: p1.name,
      url: p1.thumbnail
    },
    target: {
      id: p2.uuid,
      type: {entityB},
      label: p2.name,
      url: p2.thumbnail
    },
    weight: w
  } as result



// name: get_related_entities_graph
//
MATCH (n:resource {uuid: {id}})<-[r1:appears_in]-(ent:{:entity})-[r2:appears_in]->(res:resource)
WITH r1, r2, res
  ORDER BY r1.tfidf DESC, r2.tfidf DESC
  LIMIT 100
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



// name: get_related_resources_bipartite_graph
MATCH (res1:resource {uuid: {id}})<-[r1:appears_in]-(ent:entity)-[r2:appears_in]->(res2:resource)
  WHERE ent.score > -1
    {if:mimetype}
    AND res2.mimetype IN {mimetype}
    {/if}
    {if:type}
    AND res2.type IN {type}
    {/if}
    {if:start_time}
    AND res2.start_time >= {start_time}
    {/if}
    {if:end_time}
    AND res2.end_time <= {end_time}
    {/if}

WITH  res1, res2, r1, r2, ent
{if:with}
  MATCH (ent2:entity)-[:appears_in]->(res2)
  WHERE ent2.uuid IN {with}
  WITH  res1, res2, r1, r2, ent
{/if}

WITH res1, res2, count(*) as intersection

MATCH (res1)<-[rel:appears_in]-(r1:entity)
WITH res1, res2, intersection, count(r1) as H1

MATCH (res2)<-[rel:appears_in]-(r1:entity)
WITH res1,res2, intersection, H1, count(r1) as H2
WITH res1, res2, intersection, H1+H2 as union
WITH res1, res2, intersection, union, toFloat(intersection)/toFloat(union) as JACCARD
ORDER BY JACCARD DESC
LIMIT 50 // top 50 resources
WITH (collect(res2) + res1) as ghosts
UNWIND ghosts as ghost
MATCH (ghost)<-[r:appears_in]-(ent:person)
WITH ghost, r, ent
ORDER BY r.tfidf DESC
WITH ghost, collect(DISTINCT ent)[0..10] as entities
WHERE length(entities) > 1
UNWIND entities as ent
MATCH (ghost)<-[r:appears_in]-(ent)
RETURN {
  source: {
    id: ghost.uuid,
    type: 'resource',
    label: COALESCE(ghost.name, ghost.title_en, ghost.title_fr)
  },
  target: {
    id: ent.uuid,
    type: LAST(labels(ent)),
    label: ent.name
  },
  weight: r.frequency
} as result
ORDER BY r.tfidf DESC
LIMIT 250



// name: get_related_resources_graph
//
MATCH (res1:resource {uuid: {id}})<-[r1:appears_in]-(ent:entity)-[r2:appears_in]->(res2:resource)
  WHERE ent.score > -1
    {if:mimetype}
    AND res2.mimetype IN {mimetype}
    {/if}
    {if:type}
    AND res2.type IN {type}
    {/if}
    {if:start_time}
    AND res2.start_time >= {start_time}
    {/if}
    {if:end_time}
    AND res2.end_time <= {end_time}
    {/if}

WITH  res1, res2, r1, r2, ent
{if:with}
  MATCH (ent2:entity)
  WHERE ent2.uuid IN {with}
  WITH ent2
  MATCH (ent2)-[:appears_in]->(res2)
  WITH  res1, res2, r1, r2, ent
{/if}

WITH res1, res2, count(*) as intersection

MATCH (res1)<-[rel:appears_in]-(r1:entity)
WITH res1, res2, intersection, count(r1) as H1

MATCH (res2)<-[rel:appears_in]-(r1:entity)
WITH res1,res2, intersection, H1, count(r1) as H2
WITH res1, res2, intersection, H1+H2 as union
WITH res1, res2, intersection, union, toFloat(intersection)/toFloat(union) as JACCARD
ORDER BY JACCARD DESC
LIMIT 50 // top 50 resources
WITH (collect(res2) + res1) as resources
UNWIND resources as P
UNWIND resources as Q
MATCH (P)<-[rA:appears_in]-(ent:person)-[rB:appears_in]->(Q)
WHERE id(P) < id(Q)
WITH P, Q, ent
ORDER BY ent.specificity DESC

WITH P, Q, count(distinct ent) as intersection
RETURN {
  source: {
    id: P.uuid,
    type: 'resource',
    label: COALESCE(P.name, P.title_en, P.title_fr)
  },
  target: {
    id: Q.uuid,
    type:'resource',
    label: COALESCE(Q.name, Q.title_en, Q.title_fr)
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

{if:with}
  WHERE has(res.start_month)
  WITH res
  MATCH (ent:entity)-[r:appears_in]->(res)
  WHERE ent.uuid IN {with}
  WITH DISTINCT res 
{/if}
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
WITH  res.start_month as tm, min(res.start_time) as t, count(res) as weight
RETURN tm, t, weight
ORDER BY tm ASC

// name: get_related_resources_timeline
//
MATCH (res:resource)<-[:appears_in]-(ent:entity)
WHERE res.uuid = {id} AND ent.score > -1
WITH ent
{if:with}
  MATCH (ent2:entity)
  WHERE ent2.uuid  IN {with}
  WITH ent2
  MATCH (ent2)-[:appears_in]->(res:resource)<-[r:appears_in]-(ent)
  WITH DISTINCT res
{/if}
{unless:with}
  MATCH (res:resource)<-[r:appears_in]-(ent)
  WITH DISTINCT res
{/unless}

WHERE res.uuid <> {id} AND has(res.start_month)
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
WITH DISTINCT res
  
WITH  res.start_month as tm, min(res.start_time) as t,  count(res) as weight
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



// name: create_related_user
// create or merge the cureted by relationship on a specific entity
// create related user
MATCH (res:resource), (u:user {username:{username}})
WHERE res.uuid = {id}
WITH res, u
MERGE (u)-[r:likes]->(res)
ON CREATE SET
  r.creation_date = {creation_date},
  r.creation_time = {creation_time},
  r.last_modification_date = {creation_date},
  r.last_modification_time = {creation_time}
ON MATCH SET
  r.last_modification_date = {creation_date},
  r.last_modification_time = {creation_time}
RETURN {
  id: res.uuid,
  props: res,
  type: last(labels(res)),
  rel: r
} as result

// name: remove_related_user
// remove the relationship, if any
MATCH (u:user {username:{username}})-[r:likes]->(res:resource)
WHERE res.uuid = {id}
WITH res, u, r
DELETE r RETURN count(r)


// name:count_related_users
// get related users that 'curates's OR liked the resource
MATCH (u:user)-[*0..2]-(res:resource {uuid: {id}})
RETURN count(DISTINCT u) as count_items

// name:get_related_users
// get related users that 'curates'sthe resource
MATCH (res:resource)-[*0..2]-(u)
WHERE res.uuid = {id}
WITH res
OPTIONAL MATCH (u)-[r:curates]->(res)
OPTIONAL MATCH (u)-[r2:proposes]->(inq)-[:questions]->(res)
WITH u, r, {
    id: inq.uuid,
    type: last(labels(inq)),
    rel: r2,
    props: inq
  } as proposed_inquiries
RETURN  {
  id: u.uuid,
  username: u.username,
  props: u,
  type: last(labels(u)),
  favourites: COLLECT(DISTINCT r),
  proposes: COLLECT(DISTINCT proposed_inquiries)
} as users


// name:get_related_entities
// get related nodes that are connected with the entity. test with
// > node .\scripts\manage.js --task=query --cypher=resource/get_related_entities --id=<ID> --limit=10 --type=person --offset=0
MATCH (ent:{:entity})-[r:appears_in]->(res:resource){if:with}<-[:appears_in]-(ent2){/if}
  WHERE res.uuid = {id} AND ent.score > -1
  {if:with}
    AND id(ent2) in {with}
  {/if}
WITH ent, r
  ORDER BY r.tfidf
  LIMIT 50
WITH ent
  MATCH (ent)-[r1:appears_in]->(res:resource)
  WHERE ent.score > -1
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
  // order by relevance ...
WITH DISTINCT res
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
  WHERE n.uuid = {id}
WITH ent
  MATCH (ent)--(res:resource)
  // order by relevance ...
WITH res
  MATCH (ent1:{:entity})-[:appears_in]->(res)
  WHERE ent1.score > -1
WITH ent1
RETURN COUNT(DISTINCT ent1) as count_items


// name:count_related_actions
// count related actions
MATCH (res:resource)
  WHERE res.uuid = {id}
WITH res
  MATCH (act:action{if:kind}:{:kind}{/if})-[r]->(res)
WITH last(labels(act)) as group, count(DISTINCT act) as count_items
RETURN {
  group: group,
  count_items: count_items
} AS result


// name:get_related_actions
// get actions getMany()
MATCH (res:resource)
  WHERE res.uuid = {id}
WITH res
  MATCH (act:action{if:kind}:{:kind}{/if})-[r]->(res)

WITH act
ORDER BY act.last_modification_time DESC
SKIP {offset}
LIMIT {limit}

WITH act
MATCH (u:user)-[r:performs]->act

WITH act, r, {
    id: u.uuid,
    username: u.username,
    picture: u.picture
  } as alias_u
MATCH (act)-[r_men:mentions]->(t:entity)
WITH act, alias_u, collect({
  id: t.uuid,
  type: last(labels(t)),
  props:t}) as mentioning
RETURN {
  id: act.uuid,
  type: last(labels(act)),
  props: act,
  performed_by: alias_u,
  mentioning: mentioning
}
