// name: create_constraint_resource_slug
// create slug constraint for resource
CREATE CONSTRAINT ON (res:resource) ASSERT res.slug IS UNIQUE

// name: create_constraint_resource_doi
// create slug constraint for resource
CREATE CONSTRAINT ON (res:resource) ASSERT res.doi IS UNIQUE

// name: create_constraint_user_username
// create email constraint for user
CREATE CONSTRAINT ON (u:user) ASSERT u.username IS UNIQUE