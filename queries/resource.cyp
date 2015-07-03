// name: get_resource
// get resource with its version and comments
MATCH (res) WHERE id(res) = {id}
WITH res
    OPTIONAL MATCH (ver)-[:describes]->(res)
    OPTIONAL MATCH (ent)-[:appears_in]->(res)
    OPTIONAL MATCH (res)-[:belongs_to]->(col)
    OPTIONAL MATCH (com)-[:mentions]->(res)
    OPTIONAL MATCH (inq)-[:questions]->(res)
  WITH ver, res, ent, col, com, inq
    RETURN {
      resource: {
        id: id(res),
        props: res,
        versions: EXTRACT(p in COLLECT(DISTINCT ver)|{name: p.name, id:id(p), yaml:p.yaml, language:p.language, type: last(labels(p))}),
        entities: EXTRACT(p in COLLECT(DISTINCT ent)|{name: p.name, id:id(p), type: last(labels(p))}),
        collections: EXTRACT(p in COLLECT(DISTINCT col)|{name: p.name, id:id(p), type: 'collection'}),
        comments: count(distinct com),
        inquiries: count(distinct inq)
      }
    } AS result
    
    
// name: get_resource_by_language
// get resource with its version and comments
START res=node({id})
  WITH res
    OPTIONAL MATCH (ann:`annotation` {language:{language}})-[:describes]-(res)
    OPTIONAL MATCH (ver:`positioning`)-[:describes]-(res)
    OPTIONAL MATCH (res)-[:appears_in{is_event_place:true}]-(pla:`location`)
    OPTIONAL MATCH (res)-[:appears_in]-(loc:`location`)
    OPTIONAL MATCH (res)-[:appears_in]-(per:`person`)
    OPTIONAL MATCH (res)-[:belongs_to]-(col:collection)
    OPTIONAL MATCH (u:user)-[:says]-(com)-[:mentions]-(res)
  
  WITH ann, ver, res, pla, loc, per, u, col, {
      id: id(com),
      props: com,
      user: u
    } AS coms

  WITH ann, ver, res, pla, loc, per, col, coms
    RETURN {
      resource: {
        id: id(res),
        props: res,
        positionings: collect(DISTINCT ver),
        annotations: collect(DISTINCT ann),
        places: collect(DISTINCT pla),
        locations: collect(DISTINCT loc),
        persons: collect(DISTINCT per),
        comments: collect(DISTINCT coms),
        collections: collect(DISTINCT col)
      }
    } AS result


// name: get_resources
// get resources with number of comments, if any
MATCH (res:resource)
{?res:start_time__gt} {AND?res:end_time__lt}
WITH res
  SKIP {offset} 
  LIMIT {limit}
OPTIONAL MATCH (res)-[r2:appears_in]-(loc:`location`)
OPTIONAL MATCH (res)-[r3:appears_in]-(per:`person`)
  WITH res, loc, per
    RETURN {
      id: id(res),
      props: res,
      locations: collect(DISTINCT loc),
      persons: collect(DISTINCT per)
    } as r


// name: get_resources_by_ids
// get resources with number of comments, if any
MATCH (res:resource)
WHERE id(res) in {ids}
WITH res
  SKIP {offset}
  LIMIT {limit}
MATCH (ver:`version`)-[:describes]-(res)
OPTIONAL MATCH (res)-[:appears_in]-(loc:`location`)
OPTIONAL MATCH (res)-[:appears_in]-(pla:`place`)
OPTIONAL MATCH (res)-[:appears_in]-(per:`person`)
  WITH res, ver, loc, per, pla
    RETURN {
      id: id(res),
      props: res,
      type: 'resource',
      locations: collect(DISTINCT loc),
      persons: collect(DISTINCT per),
      places: collect(DISTINCT pla)
    } as r


// name: count_similar_resource_ids_by_entities
// get top 100 similar resources sharing the same persons, orderd by time proximity if this info is available
MATCH (res)
WHERE id(res) = {id}
WITH res
OPTIONAL MATCH (res)--(per:person)--(r)
OPTIONAL MATCH (res)--(loc:location)--(r)
WHERE id(r) <> id(res)
WITH DISTINCT r,
{
  id: id(r),
  shared_persons: length(collect(DISTINCT per)),
  shared_locations: length(collect(DISTINCT loc))
} as candidate
WHERE candidate.shared_persons > 0 OR candidate.shared_locations > 0
RETURN count(candidate) as total_items


// name: get_similar_resource_ids_by_entities
// get top 100 similar resources sharing the same persons, orderd by time proximity if this info is available
MATCH (res)
WHERE id(res) = {id}
WITH res
OPTIONAL MATCH (res)--(per:person)--(r)
OPTIONAL MATCH (res)--(loc:location)--(r)
WHERE id(r) <> id(res)
WITH DISTINCT r,
{
  id: id(r),
  dt: abs(coalesce(res.start_time, 1000000000) - coalesce(r.start_time, 0)),
  shared_persons: length(collect(DISTINCT per)),
  shared_locations: length(collect(DISTINCT loc))
} as candidate
ORDER BY candidate.dt ASC, candidate.shared_persons DESC, candidate.shared_locations DESC
SKIP {offset}
LIMIT {limit}
RETURN candidate


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


// name: count_resources
// count resources having a version, with current filters
MATCH (r:resource)--(v:version)
  WITH r
  RETURN count(r)


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


// name: merge_resource_by_doi
// add a titre to an altrady existing resource nodes; FOR MIGRATION ONLY
MERGE (res:resource {doi:{doi}})
  ON CREATE set
    res.name = {name},
    res.caption = {caption},
    res.source = {source},
    res.mimetype = {mimetype}
  ON MATCH set
    res.name = {name},
    res.caption = {caption},
    res.source = {source},
    res.mimetype = {mimetype}
RETURN res


// name: merge_resource
// also assign a default curator for the resource
MERGE (res:resource {doi:{doi}})
  ON CREATE set
    res.name = {name},
    res.mimetype = {mimetype},
    res.creation_date = {creation_date},
    res.creation_time = {creation_time},
    res.languages = {languages},
    {each:language in languages} 
      res.{:title_%(language)} = {{:title_%(language)}},
      res.{:caption_%(language)} = {{:caption_%(language)}}
    {/each}
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
MATCH (n:resource {doi:{doi}})
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