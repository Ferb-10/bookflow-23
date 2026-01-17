import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios'; 


const app = express(); 
const port = 3000; 

app.use(express.static('public')); 
app.use(bodyParser.urlencoded({ extended: true }));


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
        console.log(firstFourResults);
        res.render('index.ejs', {
            firstFourResults
        })
    } catch (err) {
        console.log(err);
    }
})




app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})
