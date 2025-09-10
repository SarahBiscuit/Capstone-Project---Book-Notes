//Main entry point for the application

import express from "express";

import { addNewBook, addNewUser, getAllBooks, getBooksByUser, getAllUsers, getUser, sortByYearRead, sortByRating, editBook, deleteItem, getUserById } from './items.js';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use((req, res, next) => {
  console.log(`🚨 Route not matched: ${req.method} ${req.url}`);
  next();
});

/* Render blank index.js page */
app.get('/', async (req, res) => {
    try {
        //Get all books (no default user selected)//
        const books = await getAllBooks();
        res.render("index", { 
            first_name: '',  // no user yet
            surname: '',
            userId: null,
            books: books || [], 
            activePage: "home"  
        });
    } catch (error) {
        console.error('Error fetching books:', error.stack);
        res.status(500).send('Internal Server Error');
}
});  

app.get('/searchUser', async (req, res) => {
  try {
    const { first_name, surname } = req.query;
    const user = await getUser({ first_name, surname });
    if (!user) {
      return res.status(404).send('User not found');
    }

    let books = [];
    try {
      books = await getBooksByUser({ first_name, surname });
    } catch (err) {
      console.warn('No books found for user:', err.message);
      books = [];
    }

    res.render("index", {
      first_name: user.first_name,
      surname: user.surname,
      userId: user.id,
      books,
      activePage: "home"
    });
  } catch (error) {
    console.error('Error fetching books:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/addBook', async (req, res) => {
  console.log("🛬 /addBook POST route was triggered");
  let first_name, surname, user;
  console.log('🚀 /addBook route hit');
  console.log('✅ Calling addNewBook...');

  try {
   
    const { title, author, year_i_read_it, my_rating, guidance_notes, first_name, surname } = req.body;

    // Continue normally
    const result = await addNewBook({ title, author, year_i_read_it, my_rating, guidance_notes, first_name, surname });

    if (result && result.success === false) {
  user = await getUser({ first_name, surname }); 
  
  let books = [];
  if (user && user.id) {
    books = await getBooksByUser({ first_name, surname });
  }

  return res.status(400).render('index', {
    books,
    first_name,
    surname,
    userId: user ? user.id : null,
    activePage: 'home',
    errorMessage: result.message // ✅ Keep the original error from addNewBook
  });
}

    user = await getUser({ first_name, surname }); 
    const books = await getBooksByUser({ first_name, surname });

    res.render('index', {
      books,
      first_name,
      surname,
      userId: user ? user.id : null,
      activePage: 'home'
    });

  } catch (error) {
    console.error('Error in /addBook:', error);

    res.status(500).render('index', { 
      books: [], 
      first_name: first_name || null,
      surname: surname || null,
      userId: user ? user.id : null,
      errorMessage: `An unexpected error occurred: ${error.message}`,
      activePage: 'home' 
    });
  }
});


app.post('/addUser', async (req, res) => {
  try {
    const { first_name, surname } = req.body;
    await addNewUser({ first_name, surname });

    let books = [];
    try {
      books = await getBooksByUser({ first_name, surname });
    } catch (err) {
      console.warn('No books found or error fetching books:', err.message);
      books = [];
    }

    res.render('index', { books, first_name, surname, userId: null, activePage: 'home' });
  } catch (error) {
    console.error('Error adding user:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/addUser', async (req, res) => {
    /* Renders the new user form page */
    try {
        res.render('addNewUser', { activePage: 'addNewUser' });
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
        res.render('index', { books, userId: user.id, activePage: 'home' });
    } catch (error) {
        console.error('Error fetching books:', error.stack);
        res.status(500).send('Internal Server Error');
}
});  

app.get('/addBook', async (req, res) => {
    /* Renders the new book form page */
    try { 
        res.render('addNewBook', { activePage: 'addNewBook' });
    } catch (error) {
        console.error('Error rendering add book page:', error.stack);
        res.status(500).send('Internal Server Error');
    }
})

app.get('/searchForUser', async (req, res) => {
  try {
    const { first_name, surname } = req.query;

    if (!first_name || !surname) {
      return res.status(400).send('Please provide both first_name and surname');
    }

    // Fetch user first
    const user = await getUser({ first_name, surname });
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Fetch books for the specified user
    let books = [];
    try {
      books = await getBooksByUser({ first_name, surname });
    } catch {
      // No books found, continue with empty array
      books = [];
    }

    res.render('index', {
      books,
      first_name: user.first_name,
      surname: user.surname,
      userId: user.id,
      activePage: 'home'
    });
  } catch (error) {
    console.error('Error fetching books by user:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/sortByYear', async (req, res) => {
    /* Sorts books by year read */
    try {
        const {first_name, surname} = req.query;
        const books = await sortByYearRead({ first_name, surname });
        res.render('index', { books, first_name, surname, userId: user.id, activePage: 'home' });
    } catch (error) {
        console.error('Error sorting books by year:', error.stack);
        res.status(500).send('Internal Server Error');
    }
})

app.get('/sortByRating', async (req, res) => {
    /* Sorts books by rating */
    try {
        const {first_name, surname} = req.query;
        const books = await sortByRating({ first_name, surname });
        res.render('index', { books, first_name, surname, userId: user.id, activePage: 'home' });
    } catch (error) {
        console.error('Error sorting books by rating:', error.stack);
        res.status(500).send('Internal Server Error');
    }
})

app.post('/edit', async (req, res) => {
    /* Allows user to edit book details */
    try {
        const { book_id, title, author, year_i_read_it, my_rating, guidance_notes, first_name, surname } = req.body;
        await editBook({ book_id, title, author, year_i_read_it, my_rating, guidance_notes, first_name, surname });
        const books = await getBooksByUser({ first_name, surname });
        res.render('index', { books, first_name, surname, userId: user.id, activePage: 'home' });
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

    const { first_name, surname } = userResult;

    // Call deleteItem with correct parameters
    await deleteItem(book_id, first_name, surname);

    // Fetch updated books list for the user
    const books = await getBooksByUser({ first_name, surname });

    res.render('index', { books, first_name, surname, userId: user.id, activePage: 'home' });

  } catch (error) {
    console.error('Error deleting book:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});