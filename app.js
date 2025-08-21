//Main entry point for the application

import express from "express";
import bodyParser from "body-parser";

import { addNewBook, addNewUser, getAllBooks, getBooksByUser, getAllUsers, getUser, sortByYearRead, sortByRating, editBook, deleteItem } from './api/items.js';

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

/* Render blank index.js page */
app.get('/', async (req, res) => {
    try {
        //Get all books (no default user selected)//
        const books = await getAllBooks();
        res.render('index', { books });
    } catch (error) {
        console.error('Error fetching books:', error.stack);
        res.status(500).send('Internal Server Error');
}
});  

app.get('/searchUser', async (req, res) => {
    /* Gets a specific user's book items using the form in the header.ejs file */
    try {
        const { forename, surname } = req.query;
        const books = await getBooksByUser({ forename, surname});
        res.render('index', { books});
    } catch (error) {
        console.error('Error fetching books:', error.stack);
        res.status(500).send('Internal Server Error');
    }
    }
})

app.post('/addBook', async (req, res) => {
  /* Handles form submission for adding a book */
  try {
        const { title, author, yearRead, rating, guidanceNotes, forename, surname } = req.body;
        await addNewBook({ title, author, yearRead, rating, guidanceNotes, forename, surname });
    // Redirect to show that specific user's book list
        const books = await getBooksByUser({ forename, surname });
        res.render('index', { books, forename, surname });
  } catch (error) {
        console.error('Error adding book:', error.stack);
        res.status(500).send('Internal Server Error');
  }
});

app.post ('/addUser', async (req, res) => {
    /* Handles form submission for adding a user */
    try {
        const { forename, surname } = req.body;
        await addNewUser({ forename, surname });
        const books = await getBooksByUser({ forename, surname });
        res.render('index', {books, forename, surname });
    } catch (error) {
        console.error('Error adding user:', error.stack);
        res.status(500).send('Internal Server Error');
    }
    }
})

app.get('/addUser', async (req, res) => {
    /* Renders the new user form page */
    try {
        res.render('/addNewUser');
    } catch (error) {
        console.error('Error rendering add user page:', error.stack);
        res.status(500).send('Internal Server Error');
    }
})

app.get('/Home', async (req, res) => {
    /* renders the home page */
    try {
        //Get all books (no default user selected)//
        const books = await getAllBooks();
        res.render('index', { books });
    } catch (error) {
        console.error('Error fetching books:', error.stack);
        res.status(500).send('Internal Server Error');
}
});  

app.get('/addBook', async (req, res) => {
    /* Renders the new book form page */
    try { 
        res.render('/addNewBook');
    } catch (error) {
        console.error('Error rendering add book page:', error.stack);
        res.status(500).send('Internal Server Error');
    }
})

app.get('/searchUser', async (req, res) => {
    //Handles the search for a user in the header.ejs file
})

app.post('/sortByYear', async (req, res) => {
    /* Sorts books by year read */
})

app.post('/sortByRating', async (req, res) => {
    /* Sorts books by rating */
})

app.post('/edit', async (req, res) => {
    /* Allows user to edit book details */
})

app.post('/delete', async (req, res) => {
    /* Allows user to delete a book */
})

app.listen(3000, () => {
  console.log('Server running on port 3000');
});