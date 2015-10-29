// name: lucene_query
//
start n=node:node_auto_index({resource_query})
WITH n
LIMIT {limit}
RETURN {
  id: id(n),
  props: n,
  type: 'resource'
} AS result
UNION
start n=node:node_auto_index({entity_query})
WITH n
LIMIT {limit}
RETURN {
  id: id(n),
  props: n,
  type: last(labels(n))
} AS result




// name: count_all_in_between
// return grouped by labels (resource, location person ...)
MATCH p=(n)-[r:appears_in*..3]-(t) WHERE id(n) in {ids} AND id(t) in {ids}
RETURN extract(n in filter(x IN nodes(p) WHERE NOT id(x) IN {ids})|{
    type: last(labels(n)),
    id: id(n)
  }) as count_items


// name: all_in_between
// serendipity graph
MATCH p=(n)-[r:appears_in*..3]-(t) WHERE id(n) in {ids} AND id(t) in {ids}
RETURN extract(n IN nodes(p)| {
  id: id(n),
  type: last(labels(n)),
  label: coalesce(n.name, n.title_en, n.title_fr)
}) AS paths, relationships(p) as rels, length(p) as count
ORDER BY count
SKIP {offset}
LIMIT {limit}


// name: count_all_in_between_resources
// return grouped by resource type (picture, treaty ...)
MATCH (n),(t)
  WHERE id(n) in {ids}
    AND id(t) in {ids}
WITH n, t
MATCH p=allShortestPaths((n)-[:appears_in*..4]-(t))
WITH filter(x in nodes(p) WHERE last(labels(x))='resource') as ns UNWIND ns as res
WITH distinct res
RETURN {
  group: res.type, 
  count_items: count(res)
}


// name: get_all_in_between_resources
// return a set of id for the all-in-between resource.
MATCH (n),(t)
  WHERE id(n) in {ids}
    AND id(t) in {ids}
WITH n, t
MATCH p=allShortestPaths((n)-[:appears_in*..3]-(t))
WITH filter(x in nodes(p) WHERE last(labels(x))='resource') as ns UNWIND ns as res
return id(res) as id
SKIP {offset}
LIMIT {limit}


// name: get_all_in_between_graph
// retutn rels, nodes and
MATCH (n)-[r:appears_in*..2]-(t:{:entity})
  WHERE id(n) in {ids}
  // top common nodes at distance 0 to 2
WITH t, count(DISTINCT r) as rr 
WHERE rr > 1
WITH t, rr
ORDER BY rr DESC
LIMIT 100
  // how do we reach top common nodes
MATCH p=allShortestPaths((n)-[r:appears_in*..2]-(t))
WHERE id(n) in {ids}
WITH p, reduce(tfidf=toFloat(0), r in relationships(p)|tfidf + COALESCE(r.tfidf,0.0)) as tfidf
RETURN extract( n IN nodes(p)| {
  id: id(n),
  type: last(labels(n)),
  label: coalesce(n.name, n.title_en, n.title_fr)
}) AS ns, relationships(p) as rels, tfidf, length(p) as lp ORDER BY length(p) ASC, tfidf DESC
LIMIT {limit}


// name: get_shortest_paths_graph
// weightened graph (tfidf)
MATCH (n),(t)
  WHERE id(n) in {ids}
    AND id(t) in {ids}
WITH n, t
MATCH p=allShortestPaths((n)-[:appears_in*..3]-(t))
WITH p, reduce(tfidf=toFloat(0), r in relationships(p)|tfidf + COALESCE(r.tfidf,0.0)) as tfidf
RETURN p ORDER BY length(p), tfidf DESC LIMIT 50


// name: count_all_shortest_paths
MATCH (n),(t) WHERE id(n) in {ids} AND id(t) in {ids}
WITH n, t
MATCH p=allShortestPaths((n)-[r:appears_in*..3]-(t))
WITH nodes(p) as ns
UNWIND ns as n return count(distinct n)


// name: all_shortest_paths
// get all shortestpath between nodes.
MATCH p = allShortestPaths((a)-[*..4]-(b))
WHERE id(a) in {ids} AND id(b) in {ids}
WITH p, 
  length(FILTER(x IN NODES(p) WHERE id(x) in {ids})) - {threshold} as coherence,
  length(FILTER(x IN NODES(p) WHERE last(labels(x)) in {labels})) as purity,
  length(p) as distance
WITH p, coherence, distance, purity - length(nodes(p)) as adequancy,
  EXTRACT(n IN NODES(p)|{id:id(n), name:n.name, type: last(labels(n))}) as candidate
RETURN {
  path: candidate,
  distance: distance,
  adequancy:adequancy,
  coherence: coherence
} as result
order by coherence DESC, adequancy ASC, distance ASC
SKIP {offset}
LIMIT {limit}


// name: get_unknown_node
// given a simple ID, return the complete node (id, props)
MATCH (n)
WHERE id(n) = {id}
RETURN {
  id: id(n),
  props: n,
  type: LAST(labels(n))
} as result


// name: get_unknown_nodes
// given a list of IDs, return the complete nodes (id, props)
MATCH (n)
WHERE id(n) in {ids}
RETURN {
  id: id(n),
  props: n,
  type: LAST(labels(n))
} as result
LIMIT 1000

// name: get_neighbors
// [33828,26750,26389,33759,33758, 26441, 27631, 11173]
MATCH (a)-[r]-(b)
WHERE id(a) in {ids} AND last(labels(b)) in {labels}
RETURN {
  source: {
    id: id(a),
    label: COALESCE(a.name, a.title_en, a.title_fr),
    start_time: a.start_time,
    end_time: a.end_time,
    type: last(labels(a))
  },
  target: {
    id: id(b),
    label: COALESCE(b.name, b.title_en, b.title_fr),
    start_time: b.start_time,
    end_time: b.end_time,
    type: last(labels(b))
  }
} LIMIT {limit}



// name: count
// global facets for a specific query
start res=node:node_auto_index({resource_query})
WITH res
RETURN {
  group: 'resource',
  type: res.type,
  count_items: count(res)
} as g
UNION
start ent=node:node_auto_index({entity_query})
WITH ent
RETURN {
  group: 'entity',
  type: last(labels(ent)),
  count_items: count(ent)
} as g



// name: count_resources
// get resources by query
start res=node:node_auto_index({query})
WITH res
{?res:start_time__gt}
{AND?res:end_time__lt}
{AND?res:type__in}
WITH DISTINCT res
{if:with}
  MATCH (ent:entity)-[:appears_in]->(res)
  WHERE id(ent) IN {with}
  WITH DISTINCT res
{/if}
RETURN {
  group: res.type,
  count_items: count(res)
} // count per type


// name: get_resources
// get resources by query
start res=node:node_auto_index({query})
WITH res
{?res:start_time__gt}
{AND?res:end_time__lt}
{AND?res:type__in}
WITH DISTINCT res
{if:with}
  MATCH (ent:entity)-[:appears_in]->(res)
  WHERE id(ent) IN {with}
  WITH DISTINCT res
{/if}
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

RETURN {
  id: id(res),
  props: res,
  type: 'resource',
  persons:        persons,
  organizations:  organizations,
  locations:      locations,
  social_groups:  social_groups
} AS result


// name: get_matching_entities_count
// get resources by query
start n=node:node_auto_index({query})
WHERE 'entity' in labels(n)
WITH last(labels(n)) as group, count(n) as count_items
RETURN {
  group: group, 
  count_items: count_items
} AS result


// name: get_matching_entities
// get resources by query
start n=node:node_auto_index({query})
WHERE {entity} in labels(n)
RETURN {
  id: id(n),
  props: n,
  type: last(labels(n))
} AS result
SKIP {offset}
LIMIT {limit}


// name: get_graph_matching_entities
//
START p1=node:node_auto_index({query})
MATCH (p1)-[r:appears_in]-(p2)
WHERE ('resource' IN labels(p1) OR 'person' IN labels(p1)) AND ('resource' IN labels(p2) OR 'person' IN labels(p2))
RETURN {
  source: {
    id: id(p1),
    type: LAST(labels(p1)),
    label: COALESCE(p1.name, p1.title_en, p1.title_fr, p1.title_de, p1.title_search)
  },
  target: {
    id: id(p2),
    type: LAST(labels(p2)),
    label: COALESCE(p2.name, p2.title_en, p2.title_fr, p2.title_de, p2.title_search)
  },
  weight: 1 
} as result
LIMIT {limit}


// name: count_shared_resources
// an overview of how many resources are between two entities (one step), according to filters
MATCH p=(n:entity)-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(t:entity)
  WHERE id(n) in {ids}
    AND id(t) in {ids}
    AND id(n) < id(t)
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
RETURN {
  group: {if:group}res.{:group}{/if}{unless:group}res.type{/unless}, 
  count_items: count(res)
}


// name: get_shared_resources
// an overview of first n resources in between two entities
MATCH p=(n:entity)-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(t:entity)
  WHERE id(n) in {ids}
    AND id(t) in {ids}
    AND id(n) < id(t)
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
WITH res, r1, r2
ORDER BY r1.tfidf DESC, r2.tfidf DESC
SKIP {offset}
LIMIT {limit}
WITH distinct res
RETURN {
  id: id(res),
  slug: res.slug,
  name: res.name
}



// name: get_suggestions
// CHECK
MATCH (n:resource)
WHERE n.title_search =~ {query} OR n.caption_search =~ {query}
RETURN { id: id(n), props: n } LIMIT {limit}
UNION
MATCH (n:entity)
WHERE n.name =~ {query}
RETURN { id: id(n), props: n } LIMIT {limit}


// name: build_full_search_legacy_index
// fill the full search index. Cfr scripts/tasks/lucene.js
MATCH (res:resource) WHERE has(res.full_search)
SET res.full_search = res.full_search


// name: build_title_search_legacy_index
// fill the full search index. Cfr scripts/tasks/lucene.js
MATCH (res:resource) WHERE has(res.title_search)
SET res.title_search = res.title_search


// name: build_name_search_legacy_index
// fill the full search index. Cfr scripts/tasks/lucene.js
MATCH (ent:entity) WHERE has(ent.name_search)
SET ent.name_search = ent.name_search

