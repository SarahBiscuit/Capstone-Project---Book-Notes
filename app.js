//Main entry point for the application

import express from "express";
import bodyParser from "body-parser";

/* Lifted from my to do list website.

Add a version of this for the book notes website, once I have written the items.js.

import { addItem, getItems, deleteItem } from './api/items.js'; */

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

/* Render blank index.js page with default user */
app.get('/', (req, res) => {
  /* ADD THE RES.RENDER IN HERE */
  });

app.get('/searchUser', async (req, res) => {
    /* Gets a specific user's book items using the form in the header.ejs file */
})

app.post('/addBook', async (req, res) => {
  /* Handles form submission for adding a book */
});

app.post ('/addUser', async (req, res) => {
    /* Handles form submission for adding a user */
})

app.post('/addUserPage', async (req, res) => {
    /* Renders the new user form page */
})

app.post('/addBookPage', async (req, res) => {
    /* Renders the new book form page */
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