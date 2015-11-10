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
WITH DISTINCT res
  {?res:start_time__gt} {AND?res:end_time__lt} {AND?res:mimetype__in} {AND?res:type__in}
WITH DISTINCT res
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
MATCH p=allShortestPaths((n)-[:appears_in*..4]-(t))
WITH filter(x in nodes(p) WHERE last(labels(x))='resource') as ns UNWIND ns as res
WITH DISTINCT res
  {?res:start_time__gt} {AND?res:end_time__lt} {AND?res:mimetype__in} {AND?res:type__in}
WITH DISTINCT res
return id(res) as id
SKIP {offset}
LIMIT {limit}


// name: get_all_in_between_graph
// retutn rels, nodes from a) the shortes path and b) enlarged path
MATCH p=allShortestPaths((n)-[:appears_in*..4]-(t))
  WHERE id(n) in {ids}
    AND id(t) in {ids}
{if:type}
  AND ALL(x in FILTER(x in nodes(p) WHERE last(labels(x)) = 'resource') WHERE x.type in {type})
{/if}
{if:start_time}
  AND ALL(x in FILTER(x in nodes(p) WHERE last(labels(x)) = 'resource') WHERE x.start_time >= {start_time})
{/if}
{if:end_time}
  AND ALL(x in FILTER(x in nodes(p) WHERE last(labels(x)) = 'resource') WHERE x.end_time <= {end_time})
{/if}
WITH p, reduce(tfidf=toFloat(0), r in relationships(p)|tfidf + COALESCE(r.tfidf,0.0)) as tfidf
RETURN extract( n IN nodes(p)| {
  id: id(n),
  type: last(labels(n)),
  ghost: 0,
  label: coalesce(n.name, n.title_en, n.title_fr)
}) AS ns, relationships(p) as rels, tfidf, length(p) as lp
ORDER BY lp ASC, tfidf DESC
LIMIT {limit}
UNION
MATCH (n)-[r:appears_in*..2]-(t:{:entity})
  WHERE id(n) in {ids} AND id(n) <> id(t)
  // top common nodes at distance 0 to 2
WITH t, count(DISTINCT r) as rr 
WHERE rr > 1
WITH t, rr
ORDER BY rr DESC
LIMIT 50
  // how do we reach top common nodes
MATCH p=allShortestPaths((n)-[r:appears_in*..2]-(t))
WHERE id(n) in {ids} AND id(n) <> id(t)
{if:type}
  AND ALL(x in FILTER(x in nodes(p) WHERE last(labels(x)) = 'resource') WHERE x.type in {type})
{/if}
{if:start_time}
  AND ALL(x in FILTER(x in nodes(p) WHERE last(labels(x)) = 'resource') WHERE x.start_time >= {start_time})
{/if}
{if:end_time}
  AND ALL(x in FILTER(x in nodes(p) WHERE last(labels(x)) = 'resource') WHERE x.end_time <= {end_time})
{/if}

WITH p, reduce(tfidf=toFloat(0), r in relationships(p)|tfidf + COALESCE(r.tfidf,0.0)) as tfidf
RETURN extract( n IN nodes(p)| {
  id: id(n),
  type: last(labels(n)),
  ghost: 1,
  label: coalesce(n.name, n.title_en, n.title_fr)
}) AS ns, relationships(p) as rels, tfidf, length(p) as lp
ORDER BY length(p) ASC, tfidf DESC
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


// name: get_matching_resources_graph
// e.g. START m=node:node_auto_index('full_search:*goerens*')
START res=node:node_auto_index({query})
{if:with}
  MATCH(res)<-[:appears_in]-(ent:entity)
  WHERE id(ent) IN {with}
  WITH DISTINCT res
{/if}
{?res:start_time__gt}
{AND?res:end_time__lt}
{AND?res:type__in}
WITH DISTINCT res
MATCH (res)<-[r:appears_in]-(ent:person)
WITH ent, collect(DISTINCT res) as resources // only top resources?
  WHERE length(resources) > 1 // get top connected entities in ms
WITH ent, resources UNWIND resources as res
MATCH (res)<-[r:appears_in]-(ent)
RETURN {
  source: {
    id: id(res),
    type: LAST(labels(res)),
    label: COALESCE(res.name, res.title_en, res.title_fr, res.title_de)
  },
  target: {
    id: id(ent),
    type: LAST(labels(ent)),
    label: COALESCE(ent.name, ent.title_en, ent.title_fr, ent.title_de),
    url: ent.thumbnail
  },
  weight: r.frequency
} as result
ORDER BY r.tfidf DESC
LIMIT {limit}

// name: get_matching_entities_graph
// e.g. START m=node:node_auto_index('full_search:*goerens*')
START m=node:node_auto_index({query})
WHERE last(labels(m)) = {entity}
MATCH (m)-[r:appears_in]->(ent)
WITH ent, collect(DISTINCT m) as ms
  WHERE length(ms)>1
MATCH (m)-[r:appears_in]->(ent)
  WHERE m in ms
RETURN {
  source: {
    id: id(m),
    type: LAST(labels(m)),
    label: COALESCE(m.name, m.title_en, m.title_fr, m.title_de)
  },
  target: {
    id: id(ent),
    type: LAST(labels(ent)),
    label: COALESCE(ent.name, ent.title_en, ent.title_fr, ent.title_de)
  }
} as result
ORDER BY length(ms) DESC, r.tfidf DESC
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
WITH DISTINCT res
OPTIONAL MATCH (per:person)-[r_per:appears_in]->(res)
WHERE per.score > -1
WITH res, per, r_per
ORDER BY r_per.tfidf DESC
WITH res, collect({
      id: id(per),
      type: 'person',
      props:per
    })[0..5] as persons
RETURN {
  id: id(res),
  props: res,
  type: 'resource',
  persons: persons
} as result


// name: count_shared_entities
// an overview of how many entities are between two resources (one step), according to filters
MATCH p=(n:resource)-[r1:appears_in]->(res:{:entity})<-[r2:appears_in]-(t:resource)
  WHERE id(n) in {ids}
    AND id(t) in {ids}
    AND id(n) < id(t)
RETURN {
  group: {if:group}res.{:group}{/if}{unless:group}res.type{/unless}, 
  count_items: count(res)
}


// name: get_shared_entities
// an overview of first n entities in between two resources
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

