CREATE TABLE books (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('want', 'finished')),
  review INTEGER CHECK (review BETWEEN 1 AND 5),
  comment TEXT
);
