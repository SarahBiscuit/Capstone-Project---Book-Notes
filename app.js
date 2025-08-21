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
    try { 
        const { forename, surname } = req.query;

        if (!forename || !surname) {
      return res.status(400).send('Please provide both forename and surname');
    }

    //Fetch books for the specified user
        const books = await getBooksByUser({ forename, surname });
        res.render('index', { books, forename, surname });
    } catch (error) {
        console.error('Error fetching books by user:', error.stack);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/sortByYear', async (req, res) => {
    /* Sorts books by year read */
    try {
        const {forename, surname} = req.body;
        const books = await sortByYearRead({ forename, surname });
        res.render('index', { books, forename, surname });
    } catch (error) {
        console.error('Error sorting books by year:', error.stack);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/sortByRating', async (req, res) => {
    /* Sorts books by rating */
    try {
        const {forename, surname} = req.body;
        const books = await sortByRating({ forename, surname });
        res.render('index', { books, forename, surname });
    } catch (error) {
        console.error('Error sorting books by rating:', error.stack);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/edit', async (req, res) => {
    /* Allows user to edit book details */
    try {
        const { book_id, title, author, yearRead, rating, guidanceNotes, forename, surname } = req.body;
        await editBook({ book_id, title, author, yearRead, rating, guidanceNotes, forename, surname });
        const books = await getBooksByUser({ forename, surname });
        res.render('index', { books, forename, surname });
        } catch (error) {
            console.error('Error editing book:', error.stack);
            res.status(500).send('Internal Server Error');
        }
})

app.post('/delete', async (req, res) => {
  try {
    const { book_id, user_id } = req.body;

    const userResult = await getUserById(user_id);

    if (!userResult) {
      return res.status(404).send('User not found');
    }

    const { forename, surname } = userResult;

    // Call deleteItem with correct parameters
    await deleteItem(book_id, forename, surname);

    // Fetch updated books list for the user
    const books = await getBooksByUser({ forename, surname });

    res.render('index', { books, forename, surname });

  } catch (error) {
    console.error('Error deleting book:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});