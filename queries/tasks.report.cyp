// name: count_actions
// count actions
MATCH (a:action) WITH last(labels(a)) as label,a.target as type, count(a) as c RETURN label, type, c ORDER BY label ASC, type ASC

// name: count_daily_actions
// count actions fro 0:00 today
MATCH (a:action) WHERE a.last_modification_time > 1456358400 
WITH a
WITH last(labels(a)) as label,a.target as type, count(a) as c 
RETURN label, type, c ORDER BY label ASC, type ASC

// name: count_appears_in
// count appears_in relationships
MATCH ()-[r:appears_in]->() RETURN count(r)