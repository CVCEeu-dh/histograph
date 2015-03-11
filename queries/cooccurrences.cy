
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