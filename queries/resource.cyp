// name: get_resource
// get resource with its version and comments
START res=node({id})
  WITH res
    OPTIONAL MATCH (ver:`version`)-[r1:describes]-(res)
    OPTIONAL MATCH (res)-[r2:appears_in]-(loc:`location`)
    OPTIONAL MATCH (res)-[r3:appears_in]-(per:`person`)
    OPTIONAL MATCH (u:user)-[r4:says]-(com)-[r5:mentions]-(res)
  
  WITH  ver, res, loc, per, u, com, {
      id: id(com),
      comment: com,
      user: u
    } AS coms

  WITH ver, res, loc, per, coms
    RETURN {
      resource: {
        id: id(res),
        props: res,
        versions: collect(DISTINCT ver),
        locations: collect(DISTINCT loc),
        persons: collect(DISTINCT per),
        comments: collect(DISTINCT coms)
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


// name: get_similar_resources
// get resources that match well with a given one
// recommendation system ,et oui
START res = node({id})
MATCH (res)-[*1..2]-(res2:resource)
  OPTIONAL MATCH (per:person)-[r2]-(res2)
  OPTIONAL MATCH (loc:location)-[r4]-(res2)
WHERE res <> res2
  WITH res, res2,
    abs(res.start_time-res2.start_time) as proximity,
  collect(DISTINCT per) as persons,
    collect(DISTINCT loc) as locations
  WITH res2, persons, locations, proximity,
    length(persons) as person_similarity,
    length(locations)*0.3 as location_similarity
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