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
// usage:
// $ node scripts/manage.js --task=common.cypher.query --cypher=similarity/computate_cosine_similarity --limit=10 --offset=0 --entity=person

MATCH (p1:{:entity})
WITH p1
  SKIP {offset}
  LIMIT {limit}
WITH p1
MATCH (p1)-[x:appears_in]->(res:resource)<-[y:appears_in]-(p2:{:entity})
 WHERE id(p1) < id(p2) AND x.score > -2 AND y.score > -2
 WITH x, y, p1,p2

 WITH  SUM(toFloat(x.tf * y.tf)) AS xyDotProduct,
       SQRT(REDUCE(xDot = 0.0, a IN COLLECT(x.tf) | xDot + a^2)) AS xLength,
       SQRT(REDUCE(yDot = 0.0, b IN COLLECT(y.tf) | yDot + b^2)) AS yLength,
       p1, p2
 WITH  p1, p2, xyDotProduct, xLength, yLength, toFloat(xLength * yLength) AS d
 WHERE d > 0
 WITH  p1, p2, d, toFloat(xyDotProduct / d) as cosine_similarity
 WHERE cosine_similarity > 0 AND cosine_similarity < 1
  WITH  p1, p2,cosine_similarity,d
   MERGE (p1)-[r:appear_in_same_document]-(p2)
   SET r.cosine_similarity = cosine_similarity
 RETURN r.cosine_similarity,d

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
// usage:
// $ node scripts/manage.js --task=common.cypher.query --cypher=similarity/computate_jaccard_distance --limit=10 --offset=0 --entity=person
MATCH (p1:{:entity})
WHERE p1.score > -2
WITH p1
SKIP {offset}
LIMIT {limit}
WITH p1
MATCh (p1)-[r1:appears_in]->(res:resource)
WHERE r1.score > -2
WITH p1, res // res where p1 is

MATCH (res)<-[r2:appears_in]-(p2:{:entity})
WHERE id(p1) <> id(p2) AND p2.score > -2 AND r2.score > -2
WITH p1, p2, count(DISTINCT res) as intersections // count res. group by p2
WHERE intersections > 2                  // filter ... ?
WITH p1, p2, intersections

MATCH (p1)-[rel:appears_in]->(res1:resource)
WITH p1,p2, intersections, count(DISTINCT res1) as H1
WITH p1,p2, intersections, H1, H1 - intersections as c1diff

MATCH (p2)-[rel:appears_in]->(res2:resource)
WITH p1,p2, intersections, H1, c1diff, count(DISTINCT res2) as H2
WITH p1,p2, intersections, H1, c1diff, H2, H2 - intersections as c2diff
WITH p1, p2, intersections, H1 + H2 - intersections as U, // union
  [c1diff, c2diff] as cdiffs,
  reduce(x=[999999999999,0], cdiff IN [c1diff, c2diff] | 
    CASE WHEN cdiff < x[0] THEN [cdiff, x[1]+1] ELSE [x[0], x[1]+1] END 
  )[0] as cdiff

WITH p1, p2, intersections, U, cdiff, toFloat(intersections)/toFloat(U) as jaccard

MERGE (p1)-[r:appear_in_same_document]-(p2)
  SET
    r.jaccard        = jaccard,
    r.intersections  = intersections,
    r.cdiff          = cdiff,
    r.union          = U