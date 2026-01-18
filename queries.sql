CREATE TABLE books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  cover_url TEXT,
  status TEXT NOT NULL CHECK(status IN ('want', 'finished')),
  review INTEGER CHECK(review BETWEEN 1 AND 5),
  comment TEXT
);



