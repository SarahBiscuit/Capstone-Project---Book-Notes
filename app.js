//Main entry point for the application

import express from "express";
import methodOverride from 'method-override';

import { addNewBook, addNewUser, getAllBooks, getBooksByUser, getAllUsers, getUser, sortByYearRead, sortByRating, editBook, deleteItem, getUserById } from './items.js';

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Method Override middleware (important: add this BEFORE your routes)
app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
app.use(express.static('public'));

/* Render blank index.js page */
app.get('/', async (req, res) => {
  try {
    const result = await getAllBooks();
const books = result.success ? result.books : [];
const errorMessage = result.success ? null : result.message;

res.render("index", {
  first_name: '',
  surname: '',
  user_id: null,
  books,
  activePage: "home",
  errorMessage
    });

  } catch (error) {
    console.error('Unexpected error in GET / route:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/searchUser', async (req, res) => {
  try {
    const { first_name, surname } = req.query;

    // Initialize these before usage
    let books = [];
    let errorMessage = null;

    const userResult = await getUser({ first_name, surname });

    if (!userResult.success) {
      // User not found — show all books and error
      const allBooksResult = await getAllBooks();
      books = allBooksResult.success ? allBooksResult.books : [];

      return res.status(400).render('index', {
        books,
        first_name,
        surname,
        user_id: null,
        activePage: 'home',
        errorMessage: userResult.message || 'User not found'
      });
    }

    const user = userResult.user;

    try {
      const booksResult = await getBooksByUser({ first_name, surname });

      if (booksResult.success === false) {
        // No books found but user exists
        errorMessage = booksResult.message || 'No books found for this user';
        books = [];
      } else {
        books = booksResult.books || booksResult; // depends on your data structure
      }
    } catch (err) {
      console.warn('Error fetching books:', err.message);
      errorMessage = 'Error retrieving books for this user';
      books = [];
    }

    res.render('index', {
      first_name: user.first_name,
      surname: user.surname,
      user_id: user.id,
      books,
      activePage: 'home',
      errorMessage
    });

  } catch (error) {
    console.error('Error fetching user:', error.stack);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/addBook', async (req, res) => {
  console.log("🛬 /addBook POST route was triggered");

  let user = null;
  let books = [];
  let errorMessage = null;

  try {
    // Normalize input
    let { title, author, year_i_read_it, my_rating, guidance_notes, first_name, surname } = req.body;
    first_name = first_name.trim();
    surname = surname.trim();

    // Try to find the user
    const userResult = await getUser({ first_name, surname });

    if (!userResult.success) {
      const allBooksResult = await getAllBooks();
      books = allBooksResult.success ? allBooksResult.books : [];

    return res.status(400).render('index', {
      books,
      first_name,
      surname,
      user_id: null,
      activePage: 'home',
      errorMessage: userResult.message
    });
    }

    user = userResult.user;


    // Try to add the book
    const result = await addNewBook({
      title,
      author,
      year_i_read_it,
      my_rating,
      guidance_notes,
      first_name,
      surname
    });

    if (result && result.success === false) {
      // ❌ Book not added (duplicate etc.) → show user's existing books
      const booksResult = await getBooksByUser({ first_name, surname });
      books = booksResult.success ? booksResult.books : [];
      errorMessage = result.message;

      return res.status(400).render('index', {
        books,
        first_name,
        surname,
        user_id: user.id,
        activePage: 'home',
        errorMessage
      });
    }

    // ✅ Book added successfully → show updated user's books
    const booksResult = await getBooksByUser({ first_name, surname });
    books = booksResult.success ? booksResult.books : [];
    errorMessage = booksResult.success ? null : booksResult.message;

    return res.render('index', {
      books,
      first_name,
      surname,
      user_id: user.id,
      activePage: 'home',
      errorMessage
    });

  } catch (error) {
    console.error('Error in /addBook:', error);

    // fallback: show all books if something goes wrong
    try {
      const allBooksResult = await getAllBooks();
      books = allBooksResult.success ? allBooksResult.books : [];
    } catch (e) {
      books = [];
    }

    return res.status(500).render('index', {
      books,
      first_name: req.body.first_name || null,
      surname: req.body.surname || null,
      user_id: user ? user.id : null,
      activePage: 'home',
      errorMessage: `An unexpected error occurred: ${error.message}`
    });
  }
});


app.post('/addUser', async (req, res) => {
  try {
    const { first_name, surname } = req.body;

    const result = await addNewUser({ first_name, surname });

    let books = [];
    let errorMessages = [];
    let user_id = null;

    if (!result.success) {
      // User creation failed
      errorMessages.push(result.message || 'Failed to add user');

      try {
        const allBooksResult = await getAllBooks();
        if (!allBooksResult.success) {
          errorMessages.push(allBooksResult.message || 'Failed to fetch books');
        }
        books = allBooksResult.books || [];
      } catch (err) {
        console.warn('Error fetching all books:', err.message);
        errorMessages.push('Error fetching all books');
        books = [];
      }

    } else {
      // User creation succeeded
      user_id = result.user_id;

      try {
        const booksResult = await getBooksByUser({ first_name, surname });
        books = booksResult.success ? booksResult.books : [];
        if (!booksResult.success) {
          errorMessages.push(booksResult.message || 'No books found for user');
        }
      } catch (err) {
        console.warn('Error fetching books by user:', err.message);
        errorMessages.push('Error fetching books by user');
        books = [];
      }
    }

    const errorMessage = errorMessages.length > 0 ? errorMessages.join('. ') : null;

    res.render('index', {
      books,
      first_name,
      surname,
      user_id,
      activePage: 'home',
      errorMessage
    });

  } catch (error) {
    console.error('Error adding user:', error.stack);
    res.status(500).render('index', {
      books: [],
      first_name: req.body.first_name || null,
      surname: req.body.surname || null,
      user_id: null,
      activePage: 'home',
      errorMessage: `Internal Server Error: ${error.message}`
    });
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
    const result = await getAllBooks();
const books = result.success ? result.books : [];
const errorMessage = result.success ? null : result.message;

res.render("index", {
  first_name: '',
  surname: '',
  user_id: null,
  books,
  activePage: "home",
  errorMessage
});

  } catch (error) {
    console.error('Unexpected error in GET / route:', error.stack);
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

app.get('/sortByYear', async (req, res) => {
  try {
    const { first_name, surname} = req.query;

    let books = [];
    let user = null;
    let user_id = null;
    let errorMessage = null;

    const result = await sortByYearRead({ first_name, surname });

    if (!result.success) {
      // Something went wrong — either no user, or no books
      errorMessage = result.message || 'Failed to retrieve books';
    }

    books = result.books || [];

    if (result.user) {
      user = result.user;
      user_id = user.id;
    }

    return res.render('index', {
      books,
      first_name,
      surname,
      user_id,
      activePage: 'home',
      errorMessage
    });

  } catch (error) {
    console.error('Error sorting books by year:', error.stack);

    return res.status(500).render('index', {
      books: [],
      first_name: '',
      surname: '',
      user_id: null,
      activePage: 'home',
      errorMessage: 'Internal Server Error'
    });
  }
});




app.get('/sortByRating', async (req, res) => {
    /* Sorts books by rating */
    try {
    const { first_name, surname} = req.query;

    let books = [];
    let user = null;
    let user_id = null;
    let errorMessage = null;

    const result = await sortByRating({ first_name, surname });

    if (!result.success) {
      // Something went wrong — either no user, or no books
      errorMessage = result.message || 'Failed to retrieve books';
    }

    books = result.books || [];

    if (result.user) {
      user = result.user;
      user_id = user.id;
    }

    return res.render('index', {
      books,
      first_name,
      surname,
      user_id,
      activePage: 'home',
      errorMessage
    });

  } catch (error) {
    console.error('Error sorting books by rating:', error.stack);

    return res.status(500).render('index', {
      books: [],
      first_name: '',
      surname: '',
      user_id: null,
      activePage: 'home',
      errorMessage: 'Internal Server Error'
    });
  }
});


app.post('/edit', async (req, res) => {
  const {
    book_id,
    title,
    author,
    year_i_read_it,
    my_rating,
    guidance_notes,
    user_id, // NOTE: must be passed from form as hidden input
    first_name,
    surname
  } = req.body;

  let books = [];
  let errorMessage = null;
  let finalUserId = user_id; // we may need to null this if no user

  try {
    // ✅ Attempt to edit the book (or fetch all books if no user_id)
    const editResult = await editBook({
      book_id,
      title,
      author,
      year_i_read_it,
      my_rating,
      guidance_notes,
      user_id
    });

    if (editResult && !editResult.success && editResult.books) {
      // ⚠️ No user_id provided — fallback case
      books = editResult.books;
      errorMessage = editResult.message || 'User not identified. Showing all books.';
      finalUserId = null;

      if (!editResult) {
        console.error('editBook() returned nothing or threw an uncaught error.');
        errorMessage = 'Unexpected error during book update.';
      }
    } else {
      // ✅ Successful update — now fetch the user's sorted book list
      const result = await sortByRating({ first_name, surname });

      if (result.success) {
        books = result.books;
      } else {
        errorMessage = result.message || 'Could not sort books.';
      }
    }
  } catch (error) {
    console.error('Error in edit or fetch:', error);
    errorMessage = 'Internal server error while editing or retrieving books';
  }

  // ✅ Render the page regardless of success/failure
  return res.render('index', {
    books,
    first_name,
    surname,
    user_id: finalUserId,
    activePage: 'home',
    errorMessage
  });
});



app.delete('/books/:book_id', async (req, res) => {
  const book_id = parseInt(req.params.book_id, 10);
  const user_id_raw = req.body.user_id;

  let books = [];
  let errorMessage = null;

  try {
    if (!user_id_raw) {
      // Let deleteItem handle missing user_id case and return all books
      const result = await deleteItem(book_id, null);
      books = result.books || [];
      errorMessage = result.message;

      return res.render('index', {
        books,
        first_name: '',
        surname: '',
        user_id: null,
        activePage: 'home',
        errorMessage
      });
    }

    // Parse user_id properly
    const user_id = typeof user_id_raw === 'string'
      ? parseInt(user_id_raw, 10)
      : user_id_raw;

    if (isNaN(user_id)) {
      // Render homepage with error message instead of sending 400
      const result = await getAllBooks();
      books = result.success ? result.books : [];
      errorMessage = 'Invalid user ID provided';

      return res.render('index', {
        books,
        first_name: '',
        surname: '',
        user_id: null,
        activePage: 'home',
        errorMessage
      });
    }

    const user = await getUserById(user_id);
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Attempt to delete the book
    const deleteResult = await deleteItem(book_id, user_id);
    if (!deleteResult.success) {
      errorMessage = deleteResult.message || 'Failed to delete book';
    }

    // Fetch updated books
    const updatedBooks = await getAllBooks();
    books = updatedBooks.books || [];
    if (!updatedBooks.success && !errorMessage) {
      errorMessage = updatedBooks.message || 'Could not retrieve updated books';
    }

    return res.render('index', {
      books,
      first_name: user.first_name || '',
      surname: user.surname || '',
      user_id,
      activePage: 'home',
      errorMessage
    });

  } catch (error) {
    console.error('Error deleting book:', error.stack);
    return res.status(500).render('index', {
      books: [],
      first_name: '',
      surname: '',
      user_id: null,
      activePage: 'home',
      errorMessage: 'Internal Server Error'
    });
  }
});


// Catch-all for unmatched routes (404)
app.use((req, res, next) => {
  console.log(`🚨 Route not matched: ${req.method} ${req.url}`);
  res.status(404).send('404 Not Found');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
