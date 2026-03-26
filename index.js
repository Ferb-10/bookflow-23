import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios'; 
import pg from 'pg'; 
import dotenv from  'dotenv'; 
import fs from 'fs'; 
import path from 'path'; 

dotenv.config(); 
const app = express(); 
const port = 3000; 

app.use(express.static('public')); 
app.use(bodyParser.urlencoded({ extended: true }));

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST, 
    database: process.env.DB_NAME, 
    password: process.env.DB_PASSWORD
}); 
db.connect(); 

// index.ejs用　一覧関数
async function getDashboardData() {
    const {rows: wantBooks} = await db.query(`SELECT id, title, author, cover_url FROM books WHERE status = 'want' ORDER BY id DESC LIMIT 3 `); 
    const {rows: finishedBooks} = await db.query(`SELECT id, title, author, cover_url, review FROM books WHERE status = 'finished' ORDER BY id DESC LIMIT 3 `); 
    return {wantBooks, finishedBooks}
}; 

// 画像保存関数
async function downloadImage(imageUrl, filename) {
    const dir = "public/covers";
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    const filePath = path.join(dir, filename);
    const response = await axios({
        url: imageUrl,
        method: 'GET',
        responseType: 'stream'
    });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(`/covers/${filename}`));
        writer.on('error', reject);
    });
};

// 件数カウント関数
async function getBookCounts() {
    const { rows: wantCountResult } = await db.query(`SELECT COUNT(*) FROM books WHERE status = 'want'`);
    const { rows: finishedCountResult } = await db.query(`SELECT COUNT(*) FROM books WHERE status = 'finished'`);
    return {
        wantCount: wantCountResult[0].count,
        finishedCount: finishedCountResult[0].count
    };
};

// index.ejs
app.get('/', async (req, res) => {
    try {
        const { wantBooks, finishedBooks } = await getDashboardData();
        const { wantCount, finishedCount } = await getBookCounts();
        res.render('index.ejs', {
            wantBooks,
            finishedBooks,
            wantCount,
            finishedCount,
            error: null
        }); 
    } catch (err) {
        console.log(err);
        res.status(500).send('Dashboard error');
    };   
}); 

// wantのページ
app.get('/want', async (req, res) => {
    const reviewBookId = req.query.review || null; 
    try {
        const {rows: wantBooks} = await db.query(`SELECT id, title, author, cover_url FROM books WHERE status = 'want' ORDER BY id DESC`); 
        let reviewBook = null; 
        if (reviewBookId) {
            const result = await db.query(`SELECT * FROM books WHERE id = $1`, [reviewBookId]); 
            reviewBook = result.rows[0]; 
            console.log(reviewBook);
        }
        res.render('want.ejs', {
            wantBooks,
            reviewBook
        })
    } catch (err) {
        console.log(err);
        res.status(500).send('Dashboard error');   
    };   
}); 

// reviewのページ
app.get('/review', async (req, res) => {
    const viewBookId = req.query.view || null;
    const updateBookId = req.query.update || null; 
    try {
        const { rows: finishedBooks } = await db.query(`SELECT id, title, author, cover_url, review FROM books WHERE status = 'finished' ORDER BY id DESC`);
        let viewBook = null;
        if (viewBookId) {
            const result = await db.query(`SELECT * FROM books WHERE id = $1`,[viewBookId]);
            viewBook = result.rows[0];
        }
        let updateBook = null;
        if (updateBookId) {
            const result = await db.query(`SELECT * FROM books WHERE id = $1`,[updateBookId]);
            updateBook = result.rows[0];
        }
        res.render('review.ejs', {
            finishedBooks,
            viewBook,
            updateBook
        });
    } catch (err) {
        console.log(err);
        res.status(500).send('Review page error');
    }
});

// 検索機能
app.post('/search', async (req, res) => {
    const bookName = req.body.bookName; 
    try {
        const { wantBooks, finishedBooks } = await getDashboardData();
        const { wantCount, finishedCount } = await getBookCounts();
        const result = await axios.get(`https://openlibrary.org/search.json?q=${bookName}`); 
        const firstFourResults = result.data.docs.slice(0, 4); 
        const {rows: savedBooks} = await db.query(`SELECT work_id, status FROM books`);
        const savedMap = new Map(
            savedBooks.map(book => [book.work_id, book.status])
        ); 
        res.render('index.ejs', {
            wantBooks,
            finishedBooks,
            firstFourResults, 
            wantCount,
            finishedCount,
            savedMap,
            error: null
        }); 
    } catch (err) {
        console.log(err);
        const { wantBooks, finishedBooks } = await getDashboardData();
        res.render('index.ejs', {
            wantBooks, 
            finishedBooks,
            error: 'Book Not Found'
        });
    }
});

// 本の追加
app.post('/books', async (req, res) => {
    const {title, author, work_id, cover_edition_id, status} = req.body;
    try {
        const existing = await db.query(`SELECT status FROM books WHERE work_id = $1`, [work_id]); 
        if (existing.rows.length > 0) {
            return res.redirect('/')
        }
        let localCoverPath = null;
        if (cover_edition_id) {
            const coverUrl = `https://covers.openlibrary.org/b/olid/${cover_edition_id}.jpg`;
            const filename = `${cover_edition_id}.jpg`; 
            localCoverPath = await downloadImage(coverUrl, filename);
        }
        await db.query(`INSERT INTO books (title, author, work_id, cover_edition_id, cover_url, status) VALUES ($1, $2, $3, $4, $5, $6)`, [title, author, work_id, cover_edition_id, localCoverPath, status]); 
        res.redirect('/')
    } catch (err) {
        console.log(err);
        res.status(500).send('Database error');
    }
}); 

// review機能 
app.post('/want/:id/review', async (req, res) => {
    const bookId = req.params.id; 
    const {review, comment} = req.body; 
    try {
        await db.query(`UPDATE books SET status = 'finished', review = $1, comment = $2, review_date = CURRENT_DATE WHERE id = $3`, [review, comment, bookId]); 
        res.redirect('/')
    } catch (err) {
        console.log(err);
        res.status(500).send('Database error')
    }
}); 

// update機能
app.post('/review/:id/update', async (req, res) => {
    const bookId = req.params.id;
    const review = req.body.review;
    const comment = req.body.comment;
    try {
        await db.query(`UPDATE books SET review = $1, comment = $2 WHERE id = $3`, [review, comment, bookId]);
        res.redirect('/review');
    } catch (err) {
        console.log(err);
        res.status(500).send('Update error');
    }
});

// delete機能
app.post("/books/:id/delete", async (req, res) => {
  const bookId = req.params.id;
  try {
        const result = await db.query(`SELECT cover_url FROM books WHERE id = $1`, [bookId]);
        const coverUrl = result.rows[0]?.cover_url;
        if (coverUrl && coverUrl !== '/img/no-cover.png') {
            const filePath = path.join("public", coverUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        await db.query(`DELETE FROM books WHERE id = $1`, [bookId]);
        res.redirect('/')
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting book');
    }
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
