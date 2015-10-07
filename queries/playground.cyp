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
    r3.df = num_of_docs_per_ent
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


// name: jaccard
MATCH (ent:person)-[:appears_in]->(res)<-[:appears_in]-(ent2:person)
WITH {
  source: id(ent),
  target: id(ent2),
  int:  count(DISTINCT res)
} as comparable
ORDER BY comparable.int DESC
LIMIT 10

MATCH (ent)-[r1:appears_in]->(res), (ent2)-[r2:appears_in]->(res)

RETURN comparable


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