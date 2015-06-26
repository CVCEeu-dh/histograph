// name: get_inquiry
// get inquiry by id or slug title
MATCH (inq:inquiry)--(u:user)
WHERE id(inq) = {id}
RETURN {
  id: id(inq),
  props: inq,
  user: {
    id: id(u),
    props: u
  }
}

// name: merge_inquiry
// create inquiry (safely merge if the inquiry already exists by slug title.
MERGE (inq:inquiry {name: {name}})
ON CREATE SET
  inq.description   = {description},
  inq.language      = {language},
  inq.creation_date = {creation_date},
  inq.creation_time = {creation_time}
RETURN inq