
// cooccurrences
MATCH (a:`entity`)-[R1:appears_in]-(p:`resource`)-[R2:appears_in]-(b:`entity`) RETURN a,b, count(*)

// simple co-occurrence
MATCH (a:`entity`)-[R1:appears_in]-(p:`resource`)-[R2:appears_in]-(b:`entity`)
WHERE a <> b
RETURN a,b, length(collect(p.name)), collect(p.name)
ORDER BY length(collect(p.name)) DESC

// similar picture profile
MATCH (a:`resource`)-[R1:appears_in]-(p:`entity`)-[R2:appears_in]-(b:`resource`)
WHERE a <> b
RETURN a,b, length( collect(DISTINCT p.name)), collect(DISTINCT p.name)
ORDER BY length(collect( DISTINCT p.name)) DESC

MATCH (a:`resource`)-[R1:appears_in]-(p:`entity`)-[R2:appears_in]-(b:`resource`)
WHERE a <> b
RETURN a,b, length( collect(DISTINCT p.name)), collect(DISTINCT p.name)
ORDER BY length(collect( DISTINCT p.name)) DESC

// all user activities
MATCH (u)-[pr:proposes]-(v)-[ra]-(result) RETURN u,pr,v,ra,result LIMIT 1000;

// timewindow for resources date
MATCH (a:`entity`)-[R1:appears_in]-(p:`resource`)-[R2:appears_in]-(b:`entity`)
WHERE a <> b AND a.name = 'Joseph Bech' AND  p.start_time >= -591840000 AND p.end_time <= -586569600
RETURN a,b,R1, R2,p

// betwenness centrality measurement
MATCH p = allShortestPaths(a:`entity`-[r..*]->b:`entity`)
WHERE a <> b  AND LENGTH(NODES(p)) > 2
WITH EXTRACT(n IN NODES(p): n.name) AS nodes
RETURN HEAD(nodes) AS source, HEAD(TAIL(TAIL(nodes))) AS destination, COLLECT(nodes) AS paths

// entity cooccurrence for a specific entity
MATCH (a:`entity`)-[R1:appears_in]-(p:`resource`)-[R2:appears_in]-(b:`entity`)
WHERE a <> b AND a.name = 'Joseph Bech'
RETURN a,b, length(collect(p.url)), collect(p.url)
ORDER BY length(collect(p.url)) DESC

// ego network
MATCH (a:`entity`)-[R1:appears_in]-(p:`resource`)-[R2:appears_in]-(b:`entity`)
WHERE a <> b AND a.name = 'Joseph Bech'
RETURN a,b,R1, R2,p

// find IRRECONCILIABLE places
MATCH (a:location)-[r1]-(n:`resource`)-[r2]-(b:location)
WHERE a <> b AND has(a.geonames_id) AND has(b.geocode_id) AND a.geonames_countryCode <> b.geocode_countryId RETURN a,r1,n,r2,b;

// find IRRECONCILIABLE places
MATCH (a:location)-[r1]-(n:`resource`)-[r2]-(b:location)
WHERE a <> b AND has(a.geonames_id)
AND has(b.geocode_id)
AND a.geonames_countryCode = b.geocode_countryId
AND a.geonames_toponymName <> b.geocode_toponymName RETURN a,r1,n,r2,b;

// networks of resource without "leaves" (just connected nodes)
MATCH (res:resource)-[r:belongs_to]-()
  WITH res, collect(r) as rr WHERE length(rr) > 1
MATCH (res)-[r1:belongs_to]-(n)
  RETURN n,res,r1;

// the same network, but filtered
MATCH (res:resource {mimetype:'image'})-[r:belongs_to]-() WITH res, collect(r) as rr WHERE length(rr) > 1 MATCH (res)-[r1:belongs_to]-(n) RETURN n,res,r1;


// get stats for resources
MATCH (n:`resource`)--(loc:location)
WHERE has(n.stakeholders)
  and has(loc.geocode_id)
  and LENGTH(n.place) > 2
    WITH loc
    RETURN COUNT(distinct loc)

//
//
//  Test history
//   
//
MATCH (a:`entity`)-[R1:appears_in]-(p:`resource`)-[R2:appears_in]-(b:`entity`)
WHERE a <> b AND a.name = 'Joseph Bech'
RETURN a,b,R1, R2,p

// omonyms
MATCH (n:person)
OPTIONAL MATCH (per:person)
WHERE per <> n
AND n.name = per.name
WITH per, n
MATCH (per)-[r1]-(res:resource)-[r2]-(n)
RETURN per, r1, res, r2, n

// recommendation system ,et oui
START res=node(3168)
MATCH (res)-[r1:appears_in]-(ent:entity)-[r2:appears_in]-(res2:resource)
WITH res, res2, collect(ent) as entities, length(collect(ent)) as similarity
ORDER BY similarity DESC
RETURN res2, similarity
LIMIT 20