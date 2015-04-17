// create contstraints
CREATE CONSTRAINT ON (u:user) ASSERT u.email IS UNIQUE
CREATE CONSTRAINT ON (u:user) ASSERT u.username IS UNIQUE

CREATE(u1:user  {name: 'user1', email:'user1@email.com'})
CREATE(r1:resource  {name:'r1'})
CREATE(v1:version {name:'v1 on r1', reference: '', copyright:'', content: 'e1 e2'})
CREATE(i1:inquiry {name:'i1', target: 'users', task: 'check', content: 'Please check (!place)[places] and (!title)[event title]'})
CREATE (v1)-[:describes {first:true}]->(r1)
CREATE (i1)-[:questions]->(v1)
CREATE (u1)-[:proposes]->(v1)
CREATE (u1)-[:launches]->(i1)
CREATE(e1:entity:person {name:'e1'})
CREATE(e2:entity:person {name:'e2'})
CREATE (e1)-[:appears_in]->(r1)
CREATE (e2)-[:appears_in]->(r1)
CREATE(r2:resource {name:'r2'})
CREATE(v2:version {name:'v2 on r2', content: ''})
CREATE (v2)-[:describes  {first:true}]->(r2)
CREATE (u1)-[:proposes]->(v2)
CREATE(r3:resource {name:'r3'})
CREATE(v3:version {name:'v3 on r3', content: ''})
CREATE (v3)-[:describes  {first:true}]->(r3)
CREATE(e3:entity:person {name:'e3'})
CREATE (e1)-[:appears_in]->(r3)
CREATE (e3)-[:appears_in]->(r3)
CREATE (u1)-[:proposes]->(v3)

CREATE(u2:user {name: 'user2', email:'user2@email.com'})
CREATE(r4:resource {name:'r4'})
CREATE(v4:version {name:'v4 on r4', content: ''})
CREATE (v4)-[:describes  {first:true}]->(r4)
CREATE (u2)-[:proposes]->(v4)
CREATE(e4:entity:place {name:'e4'})
CREATE (e3)-[:appears_in]->(r4)
CREATE (e4)-[:appears_in]->(r2)
CREATE(i2:inquiry {name:'i2 from user u2 on r1', target: 'users', task:'check', content: 'Someone should check (!entity:person#18)[if Mitterand really participated that event]'})
CREATE (i2)-[:questions]->(v1)
CREATE (u2)-[:launches]->(i2)
CREATE(i3:inquiry {name:'i3 from user u2 on r4', target: 'world', task:'fill', content: 'Call for entities! Tag (!entity)[people for this resource]'})
CREATE(i3)-[:questions]->(v4)
CREATE (u2)-[:launches]->(i3)

CREATE(u3:user {name: 'user3', email:'user3@email.com'})
CREATE(v5:version {name:'v5 answers i2', reference: '', copyright:'', content: 'e1 e2 places 2'})
CREATE(v5)-[:answers]->(i1)
CREATE(v5)-[:describes]->(r1)
CREATE(u3)-[:proposes]->(v5)


CREATE(u4:user {name: 'user4', email:'user4@email.com'})
CREATE(v6:version {name:'v6 MOD answers i2', reference: '', copyright:'', content: 'e1 e2 places 2'})
CREATE(u4)-[:proposes]->(v6)
CREATE(v6)-[:answers]->(i2)
CREATE(v5)-[:describes]->(r1)

CREATE(u5:user {name: 'user5', email:'user5@email.com'})
CREATE(v7:version {name:'v7 contribute to crowdsourcing',  reference: '', copyright:'', content: 'e1 e2 places 2'})
CREATE(u5)-[:proposes]->(v7)
CREATE(v7)-[:answers]->(i3)
CREATE(v7)-[:describes]->(r4)


// first slide: user resources and their versions for whatsoever purposes
// this query matches all users
// 1. having proposed a version to ra:describe resource (result) OR
// 2. having proposed a varsion to ra:answers an inquiry (result)
MATCH (u)-[pr:proposes]-(v)-[ra]-(result) RETURN u,pr,v,ra,result LIMIT 1000;

