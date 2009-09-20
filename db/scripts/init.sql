DROP TABLE IF EXISTS task;
CREATE TABLE task (
  id INTEGER PRIMARY KEY,
  label TEXT,
  frequency INTEGER,
  due TEXT
);
