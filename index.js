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


// let items = [
//   { id: 1, title: "Buy milk" },
//   { id: 2, title: "Finish homework" },
// ];

app.get('/', async (req, res) => {
    res.render('index.ejs')
}); 

app.get('/want', (req, res) => {
    res.render('want.ejs')
})

app.get('/review', (req, res) => {
    res.render('review.ejs')
})

app.post('/search', async (req, res) => {
    const bookName = req.body.bookName; 
    console.log(bookName);
    try {
        const result = await axios.get(`https://openlibrary.org/search.json?q=${bookName}`); 
        const firstFourResults = result.data.docs.slice(0, 4); 
        // console.log(firstFourResults);
        res.render('index.ejs', {
            firstFourResults
        })
    } catch (err) {
        console.log(err);
    }
})

app.post('/books', async (req, res) => {
    try {
        const {title, author, cover_URL, status} = req.body; 
        console.log(title, author, cover_URL, status);
        await db.query("INSERT INTO books (title, author, cover_url, status) VALUES ($1, $2, $3, $4)", [title, author, cover_URL, status]); 
        res.redirect('/')
    } catch (err) {
        console.log(err);
        res.status(500).send('Database error');
    }
}); 




app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})
