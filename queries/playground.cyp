// name: computate_tfidf
// tfidf computation based on entity frequence, keep also the number used to calculate them
MATCH (res:resource)<-[r:appears_in]-()
  WITH count(DISTINCT res) as num_of_docs
MATCH (res:resource)<-[r:appears_in]-()
  WITH num_of_docs, res, sum(r.frequency) as num_of_ents_per_doc
MATCH (e:entity)-[r2:appears_in]->(res)
  WHERE has(r2.frequency)
    SET
      r2.tf  = toFloat(r2.frequency) / num_of_ents_per_doc,
      r2.tdf = num_of_ents_per_doc
  WITH num_of_docs, e, count(r2) as num_of_docs_per_ent
MATCH (e)-[r3:appears_in]->(res:resource)
  WHERE has(r3.frequency) AND r3.tf < 1
    SET r3.tfidf = r3.tf * log(num_of_docs/num_of_docs_per_ent),
    e.df = num_of_docs_per_ent
RETURN e.name, r3.frequency, r3.tdf, r3.tf, r3.tfidf, res.name ORDER BY r3.tfidf DESC 
SKIP {offset}
LIMIT {limit}


// name: get_entities_sorted_by_tfidf
// //
MATCH (res:resource)<-[r:appears_in]-(ent:{:entity})
WHERE
  {if:id}
    id(res) = {id} AND
  {/if}
  has(r.tfidf) AND r.tf < 1 AND r.tdf > {threshold}
RETURN {
  id:    id(res),
  res:   COALESCE(res.name, res.title_en, res.title_fr),
  ent:   ent.name,
  tf:    r.tf, 
  tfidf: r.tfidf,
  tdf:   r.tdf
}
ORDER BY r.tfidf DESC
LIMIT 10


// name: demo
//
MATCH (ent:person)-[:appears_in]->(res)<-[:appears_in]-(ent2:person)
RETURN {
  source: id(ent),
  target: id(ent2),
  int:  count(DISTINCT res)
} as comparable
ORDER BY comparable.int DESC
SKIP {offset}
LIMIT {limit}


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


// name: resource_get_related_entities_graph
// monopartite graph of entities related to a specific resoruce
//
MATCH (n)<-[r1:appears_in]-(ent:{:entity})-[r2:appears_in]->(res:resource)
  WHERE id(n) = {id}
WITH res
MATCH (p1:{:entity})-[:appears_in]->(res)<-[:appears_in]-(p2:{:entity})
 WHERE p1.score > -1 AND p2.score > -1
WITH p1, p2, count(DISTINCT res) as w
RETURN {
    source: {
      id: id(p1),
      type: LAST(labels(p1)),
      label: COALESCE(p1.name, p1.title_en, p1.title_fr,p1.title, '')
    },
    target: {
      id: id(p2),
      type: LAST(labels(p2)),
      label: COALESCE(p2.name, p2.title_en, p2.title_fr,p2.title, '')
    },
    weight: w 
  } as result
ORDER BY w DESC
LIMIT 500


// name: resource_get_related_resources_graph
//
MATCH (n)<-[r1:appears_in]-(ent)-[r2:appears_in]->(res:resource)
  WHERE id(n) = {id}
WITH res
  ORDER BY r1.tfidf DESC, r2.tfidf DESC
  LIMIT 100
WITH res
MATCH (res)<-[:appears_in]-(ent)-[:appears_in]->(res2:resource)
 
WITH res, res2, count(DISTINCT ent) as w
RETURN {
    source: {
      id: id(res),
      type: 'resource',
      label: COALESCE(res.name, res.title_en, res.title_fr,res.title, '')
    },
    target: {
      id: id(res2),
      type: 'resource',
      label: COALESCE(res2.name, res2.title_en, res2.title_fr,res2.title, '')
    },
    weight: w 
  } as result
ORDER BY w DESC
LIMIT 500

// name: cosine_similarity
//
MATCH (p1:resource)<-[x:appears_in]-(m:entity)-[y:appears_in]->(p2:resource)
WHERE id(p1) = {id}

WITH  SUM(toFloat(x.tfidf * y.tfidf)) AS xyDotProduct,
      SQRT(REDUCE(xDot = 0.0, a IN COLLECT(x.tfidf) | xDot + a^2)) AS xLength,
      SQRT(REDUCE(yDot = 0.0, b IN COLLECT(y.tfidf) | yDot + b^2)) AS yLength,
      p1, p2
WITH  p1, p2, xyDotProduct, xLength, yLength, toFloat(xLength * yLength) AS d
WHERE d > 0
return {
  source: {
    id: id(p1)
  },
  target: {
    id: id(p2)
  },
  x:xLength,
  y:yLength,//,
  xyDotProduct: xyDotProduct,
  similarity: toFloat(xyDotProduct /d)
} as result
ORDER BY result.similarity DESC
LIMIT 20



// name: get_related_resources_graph
//
MATCH (p1:resource)<-[x:appears_in]-(m:entity)-[y:appears_in]->(p2:resource)
WHERE id(p1) = {id}

WITH  SUM(toFloat(x.tfidf * y.tfidf)) AS xyDotProduct,
      SQRT(REDUCE(xDot = 0.0, a IN COLLECT(x.tfidf) | xDot + a^2)) AS xLength,
      SQRT(REDUCE(yDot = 0.0, b IN COLLECT(y.tfidf) | yDot + b^2)) AS yLength,
      p1, p2, m
WITH  p1, p2, m, xyDotProduct, xLength, yLength, toFloat(xLength * yLength) AS d
WHERE d > 0
return {
  source: {
    id: id(p1),
    type: 'resource',
    label: COALESCE(p1.name, p1.title_en, p1.title_fr)
  },
  target: {
    id: id(p2),
    type: 'resource',
    label: COALESCE(p2.name, p2.title_en, p2.title_fr)
  },
  //x:xLength,
  //y:yLength,//,
  //xyDotProduct: xyDotProduct,
  similarity: toFloat(xyDotProduct /d),
  weight: count(distinct m)
} as result
ORDER BY result.weight DESC, result.similarity DESC
LIMIT {limit}


// name: cosine_sim_get_related_resources_graph
// similarity between the similars. more than 10 second!
MATCH (p1:resource)<-[x:appears_in]-(m:{:entity})-[y:appears_in]->(p2:resource)
WHERE id(p1) = {id}

WITH  SUM(toFloat(x.tfidf * y.tfidf)) AS xyDotProduct,
      SQRT(REDUCE(xDot = 0.0, a IN COLLECT(x.tfidf) | xDot + a^2)) AS xLength,
      SQRT(REDUCE(yDot = 0.0, b IN COLLECT(y.tfidf) | yDot + b^2)) AS yLength,
      p1, p2, m
WITH  p1, p2, m, xyDotProduct, xLength, yLength, toFloat(xLength * yLength) AS d
WHERE d > 0
WITH  p1, p2, m, toFloat(xyDotProduct /d) as similarity
ORDER BY similarity DESC
LIMIT {limit}
WITH p2, m
MATCH (p2)<-[x:appears_in]-(m)-[y:appears_in]->(p3:resource)
WITH p2,x,m,y,p3

WITH  SUM(toFloat(x.tfidf * y.tfidf)) AS xyDotProduct,
      SQRT(REDUCE(xDot = 0.0, a IN COLLECT(x.tfidf) | xDot + a^2)) AS xLength,
      SQRT(REDUCE(yDot = 0.0, b IN COLLECT(y.tfidf) | yDot + b^2)) AS yLength,
      p2, p3, m
WITH  p2, p3, m, xyDotProduct, xLength, yLength, toFloat(xLength * yLength) AS d
WHERE d > 0
return {
  source: {
    id: id(p2),
    type: 'resource',
    label: COALESCE(p2.name, p2.title_en, p2.title_fr)
  },
  target: {
    id: id(p2),
    type: 'resource',
    label: COALESCE(p3.name, p3.title_en, p3.title_fr)
  },
  //x:xLength,
  //y:yLength,//,
  //xyDotProduct: xyDotProduct,
  similarity: toFloat(xyDotProduct /d),
  weight: count(distinct m)
} as result
ORDER BY result.weight DESC, result.similarity DESC
LIMIT {limit}





// Bertjan's playground

// name: get_cooccurrences
//
MATCH (p1:person)-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(p2:person)
{?res:start_time__gt} {AND?res:end_time__lt}
WITH p1, p2, res
ORDER BY r1.tfidf DESC, r2.tfidf DESC

WITH p1, p2, count(DISTINCT res) as w
RETURN {
    source: {
      id: id(p1),
      type: 'resource',
      label: COALESCE(p1.name, p1.title_en, p1.title_fr)
    },
    target: {
      id: id(p2),
      type: 'resource',
      label: COALESCE(p2.name, p2.title_en, p2.title_fr)
    },
    weight: w
  } as result
ORDER BY w DESC


// name: get_related_resources_graph
//
MATCH (res:resource)<-[:appears_in]-(ent:entity)
  WHERE id(res) = 4416 AND ent.df > 1 AND ent.score > -1
WITH ent
MATCH (ent)-[:appears_in]->(res:resource)
  WHERE ent.df > 1
WITH count(distinct res) as total_docs
MATCH (ent)-[rel:appears_in]->(res:resource)
  WHERE ent.df > 1
WITH distinct(ent), rel.tf * log(toFloat(total_docs)/toFloat(ent.df)) as tfidf
  ORDER BY tfidf DESC
  // Rough estimate, 50 entities is typically enough to get a graph of 500
  // resources.
  // TODO: This must become a sensitivity parameter, probably expressed as
  //       percentage of available entities for subset
  LIMIT 50
WITH ent
MATCH (res1:resource)<--(ent)-->(res2:resource)
  WHERE res1 <> res2
WITH res1, res2, count(distinct ent) as intersection
RETURN {
  source: {
    id: id(res1),
    type: LAST(labels(res1)),
    label: COALESCE(res1.name, res1.title_en, res1.title_fr)
  },
  target: {
    id: id(res2),
    type: LAST(labels(res2)),
    label: COALESCE(res2.name, res2.title_en, res2.title_fr)
  },
  weight: intersection
} as result
ORDER BY intersection DESC
LIMIT 500





// name: get_similar_resource_ids_by_entities
// get top 100 similar resources sharing the same persons, orderd by time proximity if this info is available
// First get all entities in our document of interest
MATCH (res:resource)<-[:appears_in]-(ent:entity)
  WHERE id(res) = {id} AND ent.df > 1 AND ent.score > -1
WITH ent

// Count all unique documents that have one or more entities of interest
MATCH (ent)-[:appears_in]->(res:resource)
  WHERE ent.df > 1
WITH count(distinct res) as total_docs

// Get again the entities that appear in our document of interest, together with
// all relations from these entities to any other document.
MATCH (res:resource)<-[:appears_in]-(ent:entity)-[rel:appears_in]->(res2:resource)
  WHERE id(res) = {id} AND ent.df > 1 AND ent.score > -1
WITH res, max(rel.tf * log(toFloat(total_docs)/toFloat(ent.df))) as tfidf
  ORDER BY tfidf DESC
  // Rough estimate, 50 entities is typically enough to get a graph of 500
  // resources.
  // TODO: This must become a sensitivity parameter, probably expressed as
  //       percentage of available entities for subset
  LIMIT 50
WITH rel
MATCH (res:resource)<-[rel]-(ent:entity)

WITH res1, ent, res2, R1, R2, {
  target: id(res2),
  dst : abs(coalesce(res1.start_time, 1000000000) - coalesce(res2.start_time, 0)),
  det : abs(coalesce(res1.end_time, 1000000000) - coalesce(res2.end_time, 0)),
  int : count(DISTINCT ent)
} as candidate
RETURN candidate
ORDER BY
{unless:orderby}
  R1.tfidf DESC, R2.tfidf DESC, candidate.dst ASC, candidate.det ASC
{/unless}
{if:orderby}
  {:orderby}
{/if}
SKIP {offset}
LIMIT {limit}



// name: get_related_resources_graph
//
MATCH (res:resource)<-[:appears_in]-(ent:entity)
  WHERE id(res) = {id} AND ent.df > 1 AND ent.score > -1
WITH ent
MATCH (ent)-[:appears_in]->(res:resource)
  WHERE ent.df > 1
WITH count(distinct res) as total_docs

MATCH (res:resource)<-[:appears_in]-(ent:entity)-[rel:appears_in]->()
  WHERE id(res) = {id} AND ent.df > 1 AND ent.score > -1
  
WITH ent, max(rel.tf * log(toFloat(total_docs)/toFloat(ent.df))) as tfidf
  ORDER BY tfidf DESC
  // Rough estimate, 50 entities is typically enough to get a graph of 500
  // resources.
  // TODO: This must become a sensitivity parameter, probably expressed as
  //       percentage of available entities for subset
  LIMIT 50
WITH ent
MATCH (res1:resource)<--(ent)-->(res2:resource)
  WHERE res1 <> res2
WITH res1, res2, count(distinct ent) as intersection
RETURN {
  source: {
    id: id(res1),
    type: LAST(labels(res1)),
    label: COALESCE(res1.name, res1.title_en, res1.title_fr)
  },
  target: {
    id: id(res2),
    type: LAST(labels(res2)),
    label: COALESCE(res2.name, res2.title_en, res2.title_fr)
  },
  weight: intersection
} as result
ORDER BY intersection DESC
LIMIT 500
