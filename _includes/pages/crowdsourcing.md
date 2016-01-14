Crowd-sourced indexation
---

HistoGraph combines tools like [YAGO-AIDA](link) for the automatic detection and disambiguation of **named entities** - people, places, institutions and dates - with crowd-based annotations. Thanks to the enrichment with [DBPedia](link) and [VIAF](link) links, histoGraph can handle multilanguage documents flawlessly. By default, every automatically detected entity is pending validation by a human user.

Automatic entity detection works very well overall but will always remain imperfect in places. To address this, HistoGraph depends on human validation and error correction. 

Three different systems are in place to collect user input: Questions on the overall validity of an entity (“Is this a person?”), questions on the validity of an entity annotation in an object (“Is this person mentioned here?”) and personalised notifications based and previous actions of a user (“User x added a person to a document you worked on. Can you confirm this annotation?”).
