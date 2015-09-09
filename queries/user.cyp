// name: merge_user
// to be used with OAuth2provider
MERGE (k:user { email:{email} })
  ON CREATE SET
    k.status={status},
    k.picture={picture},
    k.username={username},
    k.firstname={firstname},
    k.strategy={strategy},
    k.about={about},
    k.salt={salt},
    k.password={password},
    k.gender={gender}
  ON MATCH SET
    k.picture={picture},
    k.gender={gender}
  RETURN k


// name: count_pulse
// get total number of user activities/notifications
MATCH (u:user {username: '@danieleguido'})-[r]-(n)
RETURN count(DISTINCT n) as count_items


// name: get_pulse
// get user activity (filter by relationship creation date OR other user relationship on "users's items")
MATCH (u:user {username: '@danieleguido'})-[r]-(n)
OPTIONAL MATCH (n)-[r2]-()
WITH u, r, r2, n

ORDER BY r2.creation_time DESC, r.creation_time DESC
SKIP {offset}
LIMIT {limit}
WITH {
    id: id(n),
    type: last(labels(n)),
    props: n,
    rel: r
  } as target

RETURN DISTINCT target



// name: remove_user
// WARNING!!!! destroy everything related to the user, as if it never existed.
MATCH (n:user {email:{email}})
OPTIONAL MATCH (n)-[r]-()
DELETE n, r


