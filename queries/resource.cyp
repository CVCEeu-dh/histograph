// name: get_resource
// get resource with its version and comments
MATCH (res) WHERE id(res) = {id}
  WITH res
    OPTIONAL MATCH (loc:`location`)-[r_loc:appears_in]->(res)
    OPTIONAL MATCH (per:`person`)-[r_per:appears_in]->(res)
    OPTIONAL MATCH (org:`organization`)-[r_org:appears_in]->(res)
    OPTIONAL MATCH (soc:`social_group`)-[r_soc:appears_in]-(res)
    OPTIONAL MATCH (ver)-[:describes]->(res)
    OPTIONAL MATCH (res)-[:belongs_to]->(col)
    OPTIONAL MATCH (com)-[:mentions]->(res)
    OPTIONAL MATCH (inq)-[:questions]->(res)
  WITH res,
    {  
      id: id(loc),
      type: 'location',
      props: loc,
      rel: r_loc
    } as location,
    {  
      id: id(per),
      type: 'person',
      props: per,
      rel: r_per
    } as person,
    {  
      id: id(org),
      type: 'organization',
      props: org,
      rel: r_org
    } as organization,
    {  
      id: id(soc),
      type: 'social_group',
      props: soc,
      rel: r_soc
    } as social_group, 
  ver, col, com, inq
    RETURN {
      resource: {
        id: id(res),
        props: res,
        versions: EXTRACT(p in COLLECT(DISTINCT ver)|{name: p.name, id:id(p), yaml:p.yaml, language:p.language, type: last(labels(p))}),
        locations: collect(DISTINCT location),
        persons:   collect(DISTINCT person),
        organizations: collect(DISTINCT organization),
        social_groups:    collect(DISTINCT social_group),
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
{?res:start_time__gt} {AND?res:end_time__lt}
  WITH res
{if:entity_id}
  MATCH (res)--(ent:entity) WHERE id(ent)={entity_id} 
  WITH res
{/if}
ORDER BY res.last_modification_time DESC, res.start_time DESC, res.creation_date DESC
SKIP {offset} 
LIMIT {limit}
WITH res
OPTIONAL MATCH (res)-[r_loc:appears_in]-(loc:`location`)
OPTIONAL MATCH (res)-[r_per:appears_in]-(per:`person`)
OPTIONAL MATCH (res)-[r_org:appears_in]-(org:`organization`)
OPTIONAL MATCH (res)-[r_soc:appears_in]-(soc:`social_group`)
WITH res,
    {  
      id: id(loc),
      type: 'location',
      props: loc,
      rel: r_loc
    } as location,
    {  
      id: id(per),
      type: 'person',
      props: per,
      rel: r_per
    } as person,
    {  
      id: id(org),
      type: 'organization',
      props: org,
      rel: r_org
    } as organization,
    {  
      id: id(soc),
      type: 'social_group',
      props: soc,
      rel: r_soc
    } as social_group
RETURN {
   id:id(res),
   type: 'resource',
   props: res,
   persons:      collect(DISTINCT person),
   organizations: collect(DISTINCT organization),
   locations:    collect(DISTINCT location),
    social_groups:    collect(DISTINCT social_group)
} as resource
  

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


// name: get_similar_resource_ids_by_entities
// get top 100 similar resources sharing the same persons, orderd by time proximity if this info is available
MATCH p=(res)<-[:appears_in]-(ent:entity)-[:appears_in]->(res2:resource) 
WHERE id(res) = {id}
RETURN{
  target: id(res2),
  dst : abs(coalesce(res.start_time, 1000000000) - coalesce(res2.start_time, 0)),
  det : abs(coalesce(res.end_time, 1000000000) - coalesce(res2.end_time, 0)),
  labels: count(DISTINCT(last(labels(ent))))
} as candidate
ORDER BY 
candidate.labels DESC, candidate.dst ASC, candidate.det ASC
SKIP {offset}
LIMIT {limit}


// name: get_similar_resources
// get resources that match well with a given one
// recommendation system ,et oui
START res = node({id})
MATCH (res)-[*1..2]-(res2:resource)
  OPTIONAL MATCH (per:person)--(res2)
  OPTIONAL MATCH (loc:location)--(res2)
WHERE res <> res2
  WITH res, res2,
    abs(res.start_time-res2.start_time) as proximity,
  collect(DISTINCT per) as persons,
    collect(DISTINCT loc) as locations
  WITH res2, persons, locations, proximity,
    length(persons) as person_similarity,
    length(locations) * 0.01 as location_similarity
  WITH res2, persons, locations, proximity, person_similarity, location_similarity, person_similarity + location_similarity as entity_similarity

  RETURN {
    id: id(res2),
    props: res2,
    persons: persons,
    locations: locations,
    ratings: {
      location_similarity: location_similarity,
      person_similarity: person_similarity,
      entity_similarity: entity_similarity,
      proximity: proximity
    }
  } AS result
  ORDER BY entity_similarity DESC, proximity ASC, person_similarity DESC, location_similarity DESC
  LIMIT 25




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
    {if:url}
      res.url = {url},
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
    {if:url}
      res.url = {url},
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
MATCH (p1:person)-[r1:appears_in]-(res:resource)-[r2:appears_in]-(p2:person)
{?res:start_time__gt} {AND?res:end_time__lt}
WITH p1, p2, length(collect(DISTINCT res)) as w
RETURN {
    source: {
      id: id(p1),
      type: LAST(labels(p1)),
      label: COALESCE(p1.name, p1.title_en, p1.title_fr)
    },
    target: {
      id: id(p2),
      type: LAST(labels(p2)),
      label: COALESCE(p2.name, p2.title_en, p2.title_fr)
    },
    weight: w
  } as result
ORDER BY w DESC
SKIP {offset}
LIMIT {limit}


// name: get_graph_persons
//
MATCH (n)-[r]-(per:person)
  WHERE id(n) = {id}
WITH per
  MATCH (per)--(res:resource)
WITH res
  MATCH (p1:person)-[:appears_in]-(res)-[:appears_in]-(p2:person)
WITH p1, p2, length(collect(DISTINCT res)) as w
RETURN {
  source: {
    id: id(p1),
    type: LAST(labels(p1)),
    label: p1.name
  },
  target: {
    id: id(p2),
    type: LAST(labels(p2)),
    label: p2.name
  },
  weight: w 
} as result
ORDER BY w DESC
LIMIT {limit}


// name: get_timeline
//
MATCH (res:resource)
{?res:start_time__gt} {AND?res:end_time__lt}
WITH res.start_time as t, length(COLLECT(res)) as weight
WHERE t IS NOT NULL
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