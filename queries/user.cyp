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