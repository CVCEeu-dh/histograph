// name: clear_appear_in_same_document
MATCH ()-[r:appear_in_same_document]-()
DELETE r

// name: computate_tfidf
// tfidf computation based on entity frequence, keep also the number used to calculate them
MATCH (res:resource)<-[r:appears_in]-()
  WITH count(DISTINCT res) as num_of_docs
MATCH (res:resource)<-[r:appears_in]-()
  SET r.frequency = COALESCE(r.frequency, 1)
  WITH num_of_docs, res, sum(r.frequency) as num_of_ents_per_doc
MATCH (e:entity)-[r2:appears_in]->(res)
  
    SET
      r2.tf  = toFloat(r2.frequency) / num_of_ents_per_doc,
      r2.tdf = num_of_ents_per_doc
  WITH num_of_docs, e, count(r2) as num_of_docs_per_ent
MATCH (e)-[r3:appears_in]->(res:resource)
  WHERE has(r3.frequency) AND r3.tf < 1
    SET
      r3.tfidf = r3.tf * log(num_of_docs/num_of_docs_per_ent),
      e.df = num_of_docs_per_ent,
      e.specificity = toFloat(num_of_docs_per_ent)/toFloat(num_of_docs)





// name: computate_cosine_similarity
// Cfr. http://gist.neo4j.org/?8173017
// Note that tfidf should be computated already. Calculate the cosine similarity between coappearing entities
MATCH (p1:{:entity})-[x:appears_in]->(res:resource)<-[y:appears_in]-(p2:{:entity})
WHERE id(p1) < id(p2)
WITH  SUM(toFloat(x.tf * y.tf)) AS xyDotProduct,
      SQRT(REDUCE(xDot = 0.0, a IN COLLECT(x.tf) | xDot + a^2)) AS xLength,
      SQRT(REDUCE(yDot = 0.0, b IN COLLECT(y.tf) | yDot + b^2)) AS yLength,
      p1, p2
WITH  p1, p2, xyDotProduct, xLength, yLength, toFloat(xLength * yLength) AS d
WHERE d > 0
MERGE (p1)-[r:appear_in_same_document]-(p2)
SET   r.cosine = xyDotProduct / d


// name: count_computate_jaccard_distance
MATCH (p1:{:entity})-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(p2:{:entity})
WHERE id(p1) < id(p2)
RETURN count(*) as total_count

// name: computate_jaccard_distance
// For the "WHERE id(p1) < id(p2)" part, see:
// https://stackoverflow.com/questions/33083491/how-to-get-a-unique-set-of-node-pairs-for-undirected-relationships/33084035#33084035
MATCH (p1:{:entity})-[r1:appears_in]->(res:resource)<-[r2:appears_in]-(p2:{:entity})
WHERE id(p1) < id(p2)
// WITH r1, r2, p1, p2, count(*) as intersection
WITH p1, p2, count(*) as intersection
SKIP {offset}
LIMIT {limit}
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



// name: get_clones
// get copuples of person having same specificity, sorted by jaccard and union
MATCH (p1)-[r:appear_in_same_document]-(p2)
WHERE id(p1) < id(p2) AND r.union > 2 AND r.intersections > 2 AND p2.specificity = p1.specificity
WITH p1, p2, r
RETURN p1.name, p2.name, p1.specificity, p2.specificity, r.jaccard, r.union, r.intersections
ORDER BY r.jaccard DESC, r.union DESC
LIMIT 500

// name: get_top_similar_entity
MATCH (p1)-[r:appear_in_same_document]-(p2)
WHERE id(p1) = {id}
WITH p1, p2, r
RETURN p1.name, p2.name, p2.wiki_id, p1.specificity, p2.specificity, r.jaccard, r.union, r.intersections, r.difference
ORDER BY r.jaccard DESC, r.union DESC
LIMIT 1

//