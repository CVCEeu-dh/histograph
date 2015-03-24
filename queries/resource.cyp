// name: get_resource
// get resource with its version and comments
START r=node({id})
WITH r
  MATCH (r)--(v:version)
  RETURN r,v

// name: get_resources
// get resources with number of comments, if any
MATCH (r:resource)--(v:version)
  WITH r
    SKIP {offset} 
    LIMIT {limit}
  RETURN r

// name: count_resources
// count resources having a version, with current filters
MATCH (r:resource)--(v:version)
  WITH r
  RETURN count(r)