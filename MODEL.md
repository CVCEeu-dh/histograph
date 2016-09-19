# Model Schema
Or how to prepare a neo4j db to be compatible with histograph.

## The :resource node
The nodes labelled `resource` represent any kind of document: pictures, news articles, book chapter etc...
Here the main properties:

|name  |value |description
|----------|-------|-----------
|name      |string | a generic name for the oblject
|slug      |string UNIQUE| the slugified version of the name field 
|type      |string | according to your resource type described in your settings.js file
|languages |array | available languages for the fields `title`, `caption` and `url`(if used, it's optional)
|title_\<lang\> |string | one `title` for each of the languages specified in languages field, e.g. `title_en` and/or `title_fr`
|caption_\<lang\>|string |  one `caption` for each of the languages specified in languages field, see title above
|full_search| string/text | useful for lucene
|creation_date| ISO date|
|creation_time| UNIX time in milliseconds|
|start_time|UNIX TIME | the date used in the corpus timeline, in ms from EPOCH
|end_time|UNIX TIME |the date used in the corpus timeline, in ms from EPOCH

Please note the coexistence of two UNIQUE properties: the `uuid` value, representing the identifier and the `slug` that can be used to require the resource as human readable index.
The UNIQUE fields are enforced by UNIQUE index.


Optional fields are:

|name  |value |description
|----------|-------|-----------
|url |url string| LOCAL url of the resource, cfr your settings.paths configuration
|url_\<lang\>|string | language specific representation of url, e.g. transcription of interviews for each of the languages specified in languages field|
|ipr_\<lang\>|string | one copyright/property rights for each of the languages specified in languages field|
|start_date|ISO DATE |the date used in the corpus timeline, isoformat
|end_date|ISO DATE |the date used in the corpus timeline, isoformat


The cypher query should be something like this:

```
MERGE (res:resource {uuid:{uuid}})
  SET res.uuid = {uuid},
      res.name = {name},
      res.slug = {slug},
      res.type = {type},
      res.languages = {languages},
      res.title_en = {title_en},
      res.caption_en = {caption_en},
      res.creation_date = {creation_date}
      res.creation_time = {creation_time}
      res.full_search = {full_search}
```

## 1. The :entity node and the `[:appears_in]`relationship

Each resource can be linked via an `appears_in` relationship to nodes labelled `entity` and sublabelled wit more specific type, among that:`person`, `location`, `theme`, `institution` or `social_group`:

```
(ent:entity:person)-[r:appears_in]-(res:resource)
```

### 1.2 :entity nodes
The gene

### 1.3 Tfidf calculation
This relationship `(ent:entity:person)-[r:appears_in]-(res:resource)` is used to computate similarity index between two resources or two entities and must contain the property `frequency`, an **integer number** stating the *number of occurrences* for that entity in the document context (i.e. at least 1). 
The frequence is used to calculate specific **tfidf** values. This is normally done by the **tfidf script** accessible via the command line:

```
$ cd histograph
$ node scripts/manage.js --task=entity.tfidf
```

Once the script has calculated the tfidf value, entity nodes are enriched with the `df` value (document frequency) namely the number of docs where the entity appears and the `specificity` value, normalizing the df value to the total number of document. The tf and the tfidf values are then stored as relationship properties.



Each resource has one ore more `annotation` node (a subtype of `version`) where a yaml field contain starting and ending position of entities; moreover, a `resource` can have a 