// name: count_appear_in_same_document
MATCH ()-[r:appear_in_same_document]-()
RETURN count(r) as total_count

// name: clear_appear_in_same_document
MATCH ()-[r:appear_in_same_document]-()
WITH r LIMIT {limit}
DELETE r

// name: count_appears_in
// count possible combination (perf preventing java heap error)
MATCH (res:resource)
WITH res, size((res)<-[:appears_in]-()) as z
RETURN sum(z) as total_count

// name: prepare_resource_tfidf_variables
// add or update global variables (count etc.)
MATCH (res:resource) WITH res, size((res)<-[:appears_in]-()) as z
WHERE z > 0
WITH res, z
WITH count(*) as num_of_docs
MERGE (v:variables {scope:'tfidf'})
  SET v.num_of_docs = num_of_docs
WITH v
MATCH (res:resource)<-[r:appears_in]-()
  WITH v, res, sum(r.frequency) as stdf
  SET res.stdf = stdf

// name: prepare_entity_tfidf_variables
// add or update global variables (count etc.)
MATCH (ent:entity)
WITH ent, size((ent)-[:appears_in]->()) as df
  SET ent.df = df

// name: computate_tfidf
// tfidf computation based on entity frequence, keep also the number used to calculate them
MATCH (v:variables {scope:'tfidf'})
  WITH v.num_of_docs as num_of_docs
MATCH (ent:entity)-[r:appears_in]->(res:resource)
WITH ent, r, res, num_of_docs
  SKIP {offset}
  LIMIT {limit}
WITH ent, r, 
  num_of_docs,
  res.stdf as stdf,
  toFloat(r.frequency) / res.stdf as tf
  SET
    r.tf  = tf,
    r.tdf = stdf,
    r.tfidf = tf * log(num_of_docs/ent.df)




// name: computate_cosine_similarity
// NO MORE USED Cfr. http://gist.neo4j.org/?8173017
// Note that tfidf should be computated already. Calculate the cosine similarity between coappearing entities
// MATCH (p1:{:entity})-[x:appears_in]->(res:resource)<-[y:appears_in]-(p2:{:entity})
// WHERE id(p1) < id(p2)
// WITH  SUM(toFloat(x.tf * y.tf)) AS xyDotProduct,
//       SQRT(REDUCE(xDot = 0.0, a IN COLLECT(x.tf) | xDot + a^2)) AS xLength,
//       SQRT(REDUCE(yDot = 0.0, b IN COLLECT(y.tf) | yDot + b^2)) AS yLength,
//       p1, p2
// WITH  p1, p2, xyDotProduct, xLength, yLength, toFloat(xLength * yLength) AS d
// WHERE d > 0
// MERGE (p1)-[r:appear_in_same_document]-(p2)
// SET   r.cosine = toFloat(xyDotProduct / toFloat(d))


// name: count_entities
MATCH (p1:{:entity})
WITH p1, size((p1)-[:appears_in]->()) as num_of_docs
WHERE num_of_docs > 0
WITH distinct p1
RETURN count(p1) as total_count

// name: count_computate_jaccard_distance
MATCH (p1:{:entity})-[r1:appears_in]->(res:resource)
WHERE p1.score > -2 AND r1.score > -2
WITH p1, res
MATCH (res)<-[r2:appears_in]-(p2:{:entity})
WHERE id(p1) < id(p2) AND p2.score > -2 AND r2.score > -2
WITH p1, p2, count(*) as intersection
WHERE intersection > 2
RETURN count(*) as total_count

// name: computate_jaccard_distance
// dep. For the "WHERE id(p1) < id(p2)" part, see:
// dep. https://stackoverflow.com/questions/33083491/how-to-get-a-unique-set-of-node-pairs-for-undirected-relationships/33084035#33084035
MATCH (p1:{:entity})
WHERE p1.score > -2
WITH p1
SKIP {offset}
LIMIT {limit}
WITH p1
MATCh (p1)-[r1:appears_in]->(res:resource)
WHERE r1.score > -2
WITH p1, res

MATCH (res)<-[r2:appears_in]-(p2:{:entity})
WHERE id(p1) < id(p2) AND p2.score > -2 AND r2.score > -2
WITH p1, p2, count(*) as intersection
WHERE intersection > 2
WITH p1, p2, intersection


MATCH (p1)-[rel:appears_in]->(res1:resource)
WITH p1,p2, intersection, collect(res1) as H1

MATCH (p2)-[rel:appears_in]->(res2:resource)
WITH p1,p2, intersection, H1, collect(res2) as H2

WITH p1, p2, intersection, ABS(length(H1)-intersection - length(H2)-intersection) as cdiff, H1+H2 as U UNWIND U as res
WITH p1, p2, intersection, cdiff, count(distinct res) as union
WITH p1, p2, intersection,  union, toFloat(intersection)/toFloat(union) as jaccard, cdiff
WITH p1, p2, intersection,  union, jaccard, cdiff, toFloat(cdiff)/toFloat(union) as overlapping

MERGE (p1)-[r:appear_in_same_document]-(p2)
  SET
    r.jaccard     = jaccard,
    r.intersections  = intersection,
    r.union       = union,
    r.overlapping = overlapping,
    r.cdiff       = cdiff