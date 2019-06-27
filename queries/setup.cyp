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

// name: update_constraint_user_uuid
// create index on start date to group / filter result by date
MATCH (u:user) WHERE exists(u.uuid) WITH u SET u.uuid=u.uuid

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

// name: update_index_on_last_modification_time
MATCH (res:resource) WHERE exists(res.last_modification_time) WITH res SET res.last_modification_time=res.last_modification_time

// name: create_index_on_start_year
// create index on start date to group / filter result by date
CREATE INDEX ON :resource(start_year)

// name: update_index_on_start_year
// create index on start date to group / filter result by date
MATCH (res:resource) WHERE exists(res.start_year) WITH res SET res.start_year=toInt(res.start_year)

// name: create_index_on_start_month
// create index on start date to group / filter result by date
CREATE INDEX ON :resource(start_month)

// name: update_index_on_start_month
// create index on start date to group / filter result by date
MATCH (res:resource) WHERE exists(res.start_month) WITH res SET res.start_month=toInt(res.start_month)

// name: create_index_on_end_time
// create index on start date to group / filter result by date
CREATE INDEX ON :resource(end_time)

// name: create_index_on_end_month
// create index on start date to group / filter result by date
CREATE INDEX ON :resource(end_month)

// name: update_index_on_end_month
// create index on start date to group / filter result by date
MATCH (res:resource) WHERE exists(res.end_month) WITH res SET res.end_month=toInt(res.end_month)

// name: create_index_on_end_year
// create index on start date to group / filter result by date
CREATE INDEX ON :resource(end_year)

// name: update_index_on_end_year
// create index on start date to group / filter result by date
MATCH (res:resource) WHERE exists(res.end_year) WITH res SET res.end_year=toInt(res.end_year)

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

// name: update_auto_index_on_resource_full_search
// create index on variables scope
MATCH (res:resource) WHERE exists(res.full_search) WITH res SET res.full_search=res.full_search

// name: update_auto_index_on_entity_name_search
// create index on variables scope
MATCH (ent:entity) WHERE exists(ent.name_search) WITH ent SET ent.name_search=ent.name_search


// name: create_full_text_index
CALL db.index.fulltext.createNodeIndex("full_text_index",["entity", "resource"],["name_search","full_search"])
CALL db.index.fulltext.createNodeIndex("resource_text_index_en", ["resource"], ["title_en", "caption_en", "content_en"])