// name: get_automatic_inquiries
// get 
MATCH (n:`inquiry` {strategy:'reconciliation'})-[*2]->(r:resource)
RETURN n,r

// name: merge_geocoding_entity
// get 
MERGE (k:entity:location { place_id:{place_id}})
  ON CREATE SET
   k.creation_date = timestamp(),
   k.geocode_query = {q},
   k.geocode_countryId = {countryId},
   k.geocode_countryName = {countryName},
   k.geocode_toponymName = {toponymName},
   k.geocode_formatted_address = {formatted_address},
   k.geocode_lat = {lat},
   k.geocode_lng = {lng},
   k.geocode_bounds_ne_lat = {ne_lat},
   k.geocode_bounds_ne_lng = {ne_lng},
   k.geocode_bounds_sw_lat = {sw_lat},
   k.geocode_bounds_sw_lng = {sw_lng}
  ON MATCH SET
   k.last_modification_date = timestamp(),
   k.geocode_query = {q},
   k.geocode_countryId = {countryId},
   k.geocode_countryName = {countryName},
   k.geocode_toponymName = {toponymName},
   k.geocode_formatted_address = {formatted_address},
   k.geocode_lat = {lat},
   k.geocode_lng = {lng},
   k.geocode_bounds_ne_lat = {ne_lat},
   k.geocode_bounds_ne_lng = {ne_lng},
   k.geocode_bounds_sw_lat = {sw_lat},
   k.geocode_bounds_sw_lng = {sw_lng}