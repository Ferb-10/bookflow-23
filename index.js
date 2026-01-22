import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios'; 
import pg from 'pg'; 
import dotenv from  'dotenv'; 


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

async function getDashboardData() {
    const {rows: wantBooks} = await db.query(`SELECT id, title, author, cover_url FROM books WHERE status = 'want' ORDER BY id DESC LIMIT 3 `); 
    const {rows: finishedBooks} = await db.query(`SELECT id, title, author, cover_url FROM books WHERE status = 'finished' ORDER BY id DESC LIMIT 3 `); 
    return {wantBooks, finishedBooks}
}; 

app.get('/', async (req, res) => {
    try {
        const { wantBooks, finishedBooks } = await getDashboardData();
        res.render('index.ejs', {
            wantBooks,
            finishedBooks
        }); 
    } catch (err) {
        console.log(err);
        res.status(500).send('Dashboard error');
    };   
}); 

app.get('/want', async (req, res) => {
    try {
        const {rows: wantBooks} = await db.query(`SELECT id, title, author, cover_url FROM books WHERE status = 'want' ORDER BY id DESC`); 
        res.render('want.ejs', {
            wantBooks
        })
    } catch (err) {
        console.log(err);
        res.status(500).send('Dashboard error');   
    };   
}); 

app.get('/review', (req, res) => {
    res.render('review.ejs')
})

app.post('/search', async (req, res) => {
    const bookName = req.body.bookName; 
    console.log(bookName);
    try {
        const { wantBooks, finishedBooks } = await getDashboardData();
        const result = await axios.get(`https://openlibrary.org/search.json?q=${bookName}`); 
        const firstFourResults = result.data.docs.slice(0, 4); 
        // console.log(firstFourResults);
        const {rows: savedBooks} = await db.query('SELECT openlibrary_id, status FROM books')
        const savedMap = new Map(
            savedBooks.map(book => [book.openlibrary_id, book.status])
        ); 
        res.render('index.ejs', {
            wantBooks,
            finishedBooks,
            firstFourResults, 
            savedMap
        }); 
    } catch (err) {
        console.log(err);
    }
})

app.post('/books', async (req, res) => {
    const {title, author, cover_url, status, openlibrary_id} = req.body; 
    try {
        const existing = await db.query("SELECT status FROM books WHERE openlibrary_id = $1", [openlibrary_id]); 
        if (existing.rows.length > 0) {
            return res.redirect('/')
        }
        await db.query("INSERT INTO books (title, author, cover_url, status, openlibrary_id) VALUES ($1, $2, $3, $4, $5)", [title, author, cover_url, status, openlibrary_id]); 
        res.redirect('/')
    } catch (err) {
        console.log(err);
        res.status(500).send('Database error');
    }
}); 




app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})
