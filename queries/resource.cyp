// name: get_resource
// get resource with its version and comments
MATCH (res) WHERE id(res) = {id}
  WITH res
    OPTIONAL MATCH (ann:`annotation`)-[:describes]-(res)
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
WHERE has(res.place)
WITH res
  SKIP {offset} 
  LIMIT {limit}
MATCH (ver:`version`)-[r1:describes]-(res)
OPTIONAL MATCH (res)-[r2:appears_in]-(loc:`location`)
OPTIONAL MATCH (res)-[r3:appears_in]-(per:`person`)
  WITH res, ver, loc, per
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
MATCH (ver:`version`)-[r1:describes]-(res)
OPTIONAL MATCH (res)-[r2:appears_in]-(loc:`location`)
OPTIONAL MATCH (res)-[r3:appears_in]-(per:`person`)
  WITH res, ver, loc, per
    RETURN {
      id: id(res),
      props: res,
      locations: collect(DISTINCT loc),
      persons: collect(DISTINCT per)
    } as r


// name: get_similar_resource_ids_by_entities
// get top 100 similar resources sharing the same persons, orderd by time proximity if this info is available
START res = node({id})
MATCH (res)--(per:person)--(res2:resource)
WITH res, res2,
length(collect(per)) as per_sim,
0 as loc_sim,
abs(coalesce(res.start_time, 1000000000) - coalesce(res2.start_time, 0)) as time_proximity
ORDER BY per_sim DESC, time_proximity ASC
LIMIT {limit}
RETURN DISTINCT id(res2) as id, per_sim, loc_sim, time_proximity
UNION ALL
START res=node({id})
MATCH (res)--(loc:location)--(res2:resource)
WITH res, res2,
length(collect(loc)) as loc_sim,
length([]) as per_sim,
abs(coalesce(res.start_time, 1000000000) - coalesce(res2.start_time, 0)) as time_proximity
ORDER BY loc_sim DESC, time_proximity ASC
LIMIT {limit}
RETURN DISTINCT id(res2) as id, per_sim, loc_sim, time_proximity


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
WITH p1, p2, length(collect(DISTINCT res)) as w
RETURN {
    source: {
      id: id(p1),
      type: HEAD(labels(p1)),
      name: p1.name
    },
    target: {
      id: id(p2),
      type: HEAD(labels(p2)),
      name: p2.name
    },
    weight: w
  } as result
ORDER BY w DESC
SKIP {skip}
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