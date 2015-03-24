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