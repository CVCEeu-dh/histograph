// name: create_constraint_resource_slug
// create slug constraint for resource
CREATE CONSTRAINT ON (res:resource) ASSERT res.slug IS UNIQUE

// name: create_constraint_resource_doi
// create slug constraint for resource
CREATE CONSTRAINT ON (res:resource) ASSERT res.doi IS UNIQUE

// name: create_constraint_user_username
// create email constraint for user
CREATE CONSTRAINT ON (u:user) ASSERT u.username IS UNIQUE

// name: create_constraint_user_uuid
CREATE CONSTRAINT ON (u:user) ASSERT u.uuid IS UNIQUE

// name: create_constraint_resource_uuid
CREATE CONSTRAINT ON (res:resource) ASSERT res.uuid IS UNIQUE

// name: create_constraint_entity_uuid
CREATE CONSTRAINT ON (ent:entity) ASSERT ent.uuid IS UNIQUE

// name: create_constraint_action_uuid
CREATE CONSTRAINT ON (act:action) ASSERT act.uuid IS UNIQUE

// name: create_constraint_version_uuid
CREATE CONSTRAINT ON (ver:version) ASSERT ver.uuid IS UNIQUE

// name: create_index_on_start_time
// create index on start date to group / filter result by timestamp
CREATE INDEX ON :resource(start_time)

// name: create_index_on_last_modification_time
// create index on start date to group / filter result by timestamp
CREATE INDEX ON :resource(last_modification_time)

// name: create_index_on_start_month
// create index on start date to group / filter result by date
CREATE INDEX ON :resource(start_month)

// name: create_index_on_end_time
// create index on start date to group / filter result by date
CREATE INDEX ON :resource(end_time)

// name: create_index_on_end_month
// create index on start date to group / filter result by date
CREATE INDEX ON :resource(end_month)

// name: create_index_on_entity_status
// create index
CREATE INDEX ON :entity(status)

// name: create_index_on_entity_common
// create index
CREATE INDEX ON :entity(common)

// name: create_index_on_df
// create index
CREATE INDEX ON :entity(df)

// name: create_index_on_scope
// create index on variables scope
CREATE INDEX ON :variables(scope)