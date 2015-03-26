// name: get_resource
// get resource with its version and comments
START res=node({id})
  WITH res
    MATCH (ver:`version`)-[r1:describes]-(res)
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



// name: count_resources
// count resources having a version, with current filters
MATCH (r:resource)--(v:version)
  WITH r
  RETURN count(r)


// name: add_comment_to_resource
// add a comment to a resource, by user username. At least one #tag should be provided
START res=node({id})
  WITH res 
    CREATE (com:`comment` {
      creation_date: {creation_date},
      creation_time: {creation_time},
      content: {content},
      tags: {tags}
    })
    CREATE (u:user {username:{username}})-[:says]->(com)
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
  
