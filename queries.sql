CREATE TABLE books (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  cover_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('want', 'finished')),
  review INTEGER CHECK (review BETWEEN 1 AND 5),
  comment TEXT
);



-- openlibrary_id を追加
ALTER TABLE books
ADD COLUMN openlibrary_id TEXT NOT NULL;

-- unique 制約
CREATE UNIQUE INDEX unique_openlibrary_book
ON books (openlibrary_id);


-- delete
DELETE FROM books WHERE id = 1;