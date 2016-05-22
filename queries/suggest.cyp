// name: lucene_query
//
start n=node:node_auto_index({resource_query})
WITH n
LIMIT {limit}
RETURN {
  id: n.uuid,
  props: n,
  type: 'resource'
} AS result
UNION
start n=node:node_auto_index({entity_query})
WITH n
MATCH (n)-[r:appears_in]->()
WITH n, count(r) as distribution
ORDER BY n.celebrity DESC, distribution DESC
LIMIT {limit}
RETURN {
  id: n.uuid,
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
  id: n.uuid,
  type: last(labels(n)),
  label: coalesce(n.name, n.title_en, n.title_fr)
}) AS paths, relationships(p) as rels, length(p) as count
ORDER BY count
SKIP {offset}
LIMIT {limit}


// name: count_all_in_between_resources
// return grouped by resource type (picture, treaty ...)
MATCH (ent:entity)
  WHERE ent.uuid in {ids}
WITH ent
MATCH (ent)-[r:appears_in]->(res:resource)
{?res:start_time__gt} {AND?res:end_time__lt} {AND?res:mimetype__in} {AND?res:type__in}
WITH res, count(ent) as c
WITH res 
RETURN {
  group: res.type, 
  count_items: count(res)
}


// name: get_all_in_between_resources
// return a set of id for the all-in-between resource.
MATCH (ent:entity)
  WHERE ent.uuid in {ids}
WITH ent
MATCH (ent)-[r:appears_in]->(res:resource)
{?res:start_time__gt} {AND?res:end_time__lt} {AND?res:mimetype__in} {AND?res:type__in}
WITH res, sum(r.tf) as stf, collect({
    id: ent.uuid,
    type: last(labels(ent)),
    props: ent,
    rel: r
  })  as matches 
WITH res,matches,stf
ORDER BY size(matches) DESC, stf DESC
WITH res, matches
SKIP {offset}
LIMIT {limit}
WITH res, matches
  OPTIONAL MATCH (res)<-[r_per:appears_in]-(per:`person`)
  WITH res, matches, r_per, per
  ORDER BY  r_per.score DESC, 
            r_per.tfidf DESC, 
            r_per.frequency DESC
WITH res, matches, filter(x in collect({  
      id: per.uuid,
      type: 'person',
      props: per,
      rel: r_per
    }) WHERE has(x.id))[0..5] as people
  OPTIONAL MATCH (res)<-[r_the:appears_in]-(the:`theme`)
  WITH res, matches, people, r_the, the
  ORDER BY  r_the.score DESC, 
            r_the.tfidf DESC, 
            r_the.frequency DESC
WITH res, matches, people, filter(x in collect({    
      id: the.uuid,
      type: 'theme',
      props: the,
      rel: r_the
    }) WHERE has(x.id))[0..5] as themes

RETURN {
  id: res.uuid,
  type: 'resource',
  props: res,
  persons:     people,
  themes:     themes,
  matches: matches
} as resource



// name: get_all_in_between_graph
// get relationships between the elements of your choice
MATCH (ent:entity)
  WHERE ent.uuid in {ids}
WITH ent
  MATCH (ent)-[r:appears_in]->(res:resource)
  {?res:start_time__gt} {AND?res:end_time__lt} {AND?res:mimetype__in} {AND?res:type__in}
WITH res, sum(r.tf) as stf, count(ent)  as c 
WHERE c > 1
WITH res, c, stf
ORDER BY c DESC, stf DESC
LIMIT 50
WITH res 
  MATCH (A:person)-[r1:appears_in]->(res)<-[:appears_in]-(B:person)
  WHERE id(A) > id(B) WITH A,B, count(res) as w 
  ORDER BY w DESC
  LIMIT {limit}
RETURN {
  source: {
    id: A.uuid,
    type: last(labels(A)),
    label: A.name
  },
  target: {
    id: B.uuid,
    type: last(labels(B)),
    label: B.name
  },
  weight: w
} as result


// name: get_all_in_between_timeline
// get relationships between the elements of your choice
MATCH (ent:entity)
  WHERE ent.uuid in {ids}
WITH ent
  MATCH (ent)-[r:appears_in]->(res:resource)
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
WITH res, sum(r.tf) as stf, count(ent)  as c 
WHERE c > 1
WITH res.start_month as tm, min(res.start_time) as t,  count(res) as weight
RETURN tm, t, weight
ORDER BY tm ASC




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
MATCH (a), (b)
WHERE a.uuid IN {ids} AND b.uuid IN {ids}
WITH a,b
MATCH p = allShortestPaths((a)-[*..4]-(b))
WITH p, 
  length(FILTER(x IN NODES(p) WHERE x.uuid in {ids})) - {threshold} as coherence,
  length(FILTER(x IN NODES(p) WHERE last(labels(x)) in {labels})) as purity,
  length(p) as distance
WITH p, coherence, distance, purity - length(nodes(p)) as adequancy,
  EXTRACT(n IN NODES(p)|{id:n.uuid, name:n.name, type: last(labels(n))}) as candidate
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
OPTIONAL MATCH (res:resource {uuid:{id}})
OPTIONAL MATCH (ent:entity {uuid:{id}})
WITH coalesce(res, ent) as n 
RETURN {
  id: n.uuid,
  props: n,
  type: LAST(labels(n)) 
} as result


// name: get_unknown_nodes
// given a list of IDs, return the complete nodes (id, props)
OPTIONAL MATCH (res:resource)
WHERE res.uuid IN {ids}
WITH res
OPTIONAL MATCH (ent:entity)
WHERE ent.uuid IN {ids}
WITH coalesce(res, ent) as n 
RETURN {
  id: n.uuid,
  props: n,
  type: LAST(labels(n)) 
} as result
LIMIT 500

// name: get_neighbors
// [33828,26750,26389,33759,33758, 26441, 27631, 11173]
MATCH (a:resource)
WHERE a.uuid IN {ids}
WITH a
OPTIONAL MATCH (a1:entity)
WHERE a1.uuid IN {ids}
wITH coalesce(a, a1) as n
MATCH (n)-[r:appears_in]-(b)
WHERE last(labels(b)) in {labels}
RETURN {
  source: {
    id: n.uuid,
    label: COALESCE(n.name, n.title_en, n.title_fr),
    start_time: n.start_time,
    end_time: n.end_time,
    type: last(labels(n))
  },
  target: {
    id: b.uuid,
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
WITH res
{if:with}
  MATCH (ent:entity)-[r:appears_in]->(res)
  WHERE ent.uuid IN {with}
  WITH res, count(r) as strict
  WHERE strict = size({with})
  WITH res
{/if}
{if:without}
  OPTIONAL MATCH  (res)<-[r:appears_in]-(ent:entity)
  WHERE ent.uuid IN {without}
  WITH res, r
  WHERE r is null
  WITH res
{/if}

WITH collect(res) as resources
WITH resources, length(resources) as total_items
UNWIND resources as res

RETURN {
  group: res.type,
  count_items: count(res),
  total_items: total_items
} // count per type


// name: get_resources
// get resources by query
start res=node:node_auto_index({query})
WITH res
{?res:start_time__gt}
{AND?res:end_time__lt}
{AND?res:type__in}
WITH res
{if:with}
  MATCH (ent:entity)-[r:appears_in]->(res)
  WHERE ent.uuid IN {with}
  WITH res, count(r) as strict
  WHERE strict = size({with})
  WITH res
{/if}
{if:without}
  OPTIONAL MATCH  (res)<-[r:appears_in]-(ent:entity)
  WHERE ent.uuid IN {without}
  WITH res, r
  WHERE r is null
  WITH res
{/if}
SKIP {offset}
LIMIT {limit}
WITH res

OPTIONAL MATCH (res)<-[r_the:appears_in]-(the:`theme`)
WITH res, r_the, the
ORDER BY r_the.score DESC, r_the.tfidf DESC, r_the.frequency DESC
WITH res, collect({  
      id: the.uuid,
      type: 'theme',
      props: the,
      rel: r_the
    })[0..5] as themes
      
OPTIONAL MATCH (res)-[r_per:appears_in]-(per:`person`)
WITH res, themes, r_per, per
ORDER BY r_per.score DESC, r_per.tfidf DESC, r_per.frequency DESC
WITH res, themes, collect({
      id: per.uuid,
      type: 'person',
      props: per,
      rel: r_per
    })[0..5] as persons

RETURN {
  id: res.uuid,
  props: res,
  type: 'resource',
  persons: persons,
  themes: themes
} AS result


// name: get_resources_elastic
// get facets by query
start res=node:node_auto_index({query})
WITH res
{?res:start_time__gt}
{AND?res:end_time__lt}
{AND?res:type__in}
WITH res
{if:with}
  MATCH (res)<-[r:appears_in]-(ent2:entity) 
  WHERE ent2.uuid IN {with}
  WITH res, count(r) as strict
  WHERE strict = size({with})
  WITH res
{/if}
{if:without}
  OPTIONAL MATCH  (res)<-[r:appears_in]-(ent:entity)
  WHERE ent.uuid IN {without}
  WITH res, r
  WHERE r is null
  WITH res
{/if}
MATCH (res)<-[r:appears_in]-(ent:{:entity})
WHERE r.score > -1
WITH ent, count(r) as df
ORDER BY df desc, ent.name ASC
LIMIT 100 
RETURN {
  id: ent.uuid,
  label: last(labels(ent)),
  name: ent.name,
  w:df
}


// name: get_resources_timeline
// get facets by query
start res=node:node_auto_index({query})
WITH res
{?res:start_time__gt}
{AND?res:end_time__lt}
{AND?res:type__in}
WITH res
WHERE exists(res.start_month)
WITH res
{if:with}
  MATCH (res)<-[r:appears_in]-(ent2:entity) 
  WHERE ent2.uuid IN {with}
  WITH res, count(r) as strict
  WHERE strict = size({with})
  WITH res
{/if}
{if:without}
  OPTIONAL MATCH  (res)<-[r:appears_in]-(ent:entity)
  WHERE ent.uuid IN {without}
  WITH res, r
  WHERE r is null
  WITH res
{/if}
WITH  res.start_month as tm, min(res.start_time) as t, count(res) as weight
RETURN tm, t, weight
ORDER BY tm ASC


// name: get_matching_entities_count
// get resources by query, will suggest other enpoint too
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
WITH (n)
MATCH (n)-[r:appears_in]->()
WITH n, count(r) as df
RETURN {
  id: n.uuid,
  props: n,
  // appearing: last_resource,
  type: last(labels(n))
} AS result
ORDER BY n.score DESC, df DESC
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
    id: res.uuid,
    type: LAST(labels(res)),
    label: COALESCE(res.name, res.title_en, res.title_fr, res.title_de)
  },
  target: {
    id: ent.uuid,
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
    id: m.uuid,
    type: LAST(labels(m)),
    label: COALESCE(m.name, m.title_en, m.title_fr, m.title_de)
  },
  target: {
    id: ent.uuid,
    type: LAST(labels(ent)),
    label: COALESCE(ent.name, ent.title_en, ent.title_fr, ent.title_de)
  },
  weight: r.frequency
} as result
ORDER BY length(ms) DESC, r.tfidf DESC
LIMIT {limit}


// name: count_shared_resources
// an overview of how many resources are between two entities (one step), according to filters
{if:center}
  MATCH (ent:entity {uuid: {center}})-[:appears_in]->(res:resource)
  WITH res
{/if}
MATCH (n:entity)-[r1:appears_in]->{if:center}(res){/if}{unless:center}(res:resource){/unless}
WHERE n.uuid IN {ids}
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
WITH res, count(r1) as z
  WHERE z = size({ids})
WITH res
{if:with}
  MATCH (res)<-[r:appears_in]-(ent:entity)
    WHERE ent.uuid in {with}
  WITH res, count(r) as df
{/if}

RETURN {
  group: {if:group}res.{:group}{/if}{unless:group}res.type{/unless}, 
  count_items: count(res)
}


// name: get_shared_resources
// an overview of first n resources in between two entities
{if:center}
  MATCH (ent:entity {uuid: {center}})-[:appears_in]->(res:resource)
  WITH res
{/if}
MATCH (n:entity)-[r1:appears_in]->{if:center}(res){/if}{unless:center}(res:resource){/unless}
WHERE n.uuid IN {ids}
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
WITH res, max(coalesce(r1.frequency,0)) as ms, count(r1) as z
  WHERE z = size({ids})
WITH res, ms
{if:with}
  MATCH (res)<-[r:appears_in]-(ent:entity)
    WHERE ent.uuid in {with}
  WITH res, ms, count(r) as df
{/if}
ORDER BY ms DESC
SKIP {offset}
LIMIT {limit}

WITH res
OPTIONAL MATCH (per:person)-[r_per:appears_in]->(res)
WHERE per.score > -1
WITH res, per, r_per
ORDER BY r_per.score DESC, r_per.tfidf DESC
WITH res, collect({
      id:   per.uuid,
      type: 'person',
      props: per,
      rel: r_per
    })[0..5] as persons
RETURN {
  id: res.uuid,
  props: res,
  type: 'resource',
  persons: persons
} as result


// name: count_shared_entities
// an overview of how many entities are between two resources (one step), according to filters
MATCH p=(n:resource)<-[r1:appears_in]-(ent:entity)-[r2:appears_in]->(t:resource)
  WHERE id(n) in {ids}
    AND id(t) in {ids}
    AND id(n) < id(t)
WITH collect(ent) as entities
WITH entities, length(entities) as total_items
UNWIND entities as ent
RETURN {
  group: last(labels(ent)), 
  count_items: count(ent),
  total_items: total_items
}


// name: get_shared_entities
// an overview of first n entities in between two resources
MATCH p=(n:resource)<-[r1:appears_in]->(ent:{:entity})<-[r2:appears_in]->(t:resource)
  WHERE id(n) in {ids}
    AND id(t) in {ids}
    AND id(n) < id(t)
WITH ent, r1, r2
ORDER BY ent.specificity DESC
SKIP {offset}
LIMIT {limit}
WITH distinct ent
RETURN {
  id: id(ent),
  slug: ent.slug,
  name: ent.name,
  type: LAST(labels(ent)),
  props: ent
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

