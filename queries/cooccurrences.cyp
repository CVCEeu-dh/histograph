
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
MATCH (n:`resource`)
WHERE n.start_time >= '796694400' AND n.end_time <= '875750400'
MATCH (n)-[r]-(t) 
RETURN n,r,t;

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