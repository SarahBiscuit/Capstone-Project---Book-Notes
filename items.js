import fetch from 'node-fetch'; 
import db from './db.js';

// Helper: get OLID from Open Library using title and author
async function getOLID(title, author) {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`;

    try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.docs && data.docs.length > 0 && data.docs[0].edition_key) {
      return data.docs[0].edition_key[0]; // return the first OLID
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Error fetching OLID for "${title}" by "${author}":`, error);
    return null;
  }
}


/* 1.  Function to add a new book item */
export async function addNewBook({
  title = '',
  author = '',
  year_i_read_it,
  my_rating,
  guidance_notes = '',
  first_name = '',
  surname = ''
}) {
  try {
    console.log("addNewBook: Start");
    console.log({ title, author, year_i_read_it, my_rating, guidance_notes, first_name, surname });

    // Normalize user input
    const cleanedFirstName = first_name.trim().toUpperCase();
    const cleanedSurname = surname.trim().toUpperCase();

    // Look up user ID
    const userQuery = `
      SELECT id FROM users
      WHERE UPPER(TRIM(first_name)) = $1 AND UPPER(TRIM(surname)) = $2
      LIMIT 1;
    `;
    const userResult = await db.query(userQuery, [cleanedFirstName, cleanedSurname]);

    if (userResult.rowCount === 0) {
      return {
        success: false,
        message: 'User not found with the provided first name and surname.  All user books shown instead.'
      };
    }

    const user_id = userResult.rows[0].id;

    // Normalize title and author
    const cleanedTitle = title.trim().toUpperCase();
    const cleanedAuthor = author.trim().toUpperCase();

    // Check if user and book already exist in userReads
    const userBookMatchQuery = `
      SELECT * FROM userReads
      WHERE user_id = $1 AND book_id = (
        SELECT id FROM titlesAuthors
        WHERE UPPER(TRIM(title)) = $2 AND UPPER(TRIM(author)) = $3
        LIMIT 1
      );
    `;
    const userBookMatch = await db.query(userBookMatchQuery, [user_id, cleanedTitle, cleanedAuthor]);

    if (userBookMatch.rowCount > 0) {
      return {
        success: false,
        message: `This book is already associated with the user ${first_name} ${surname}.  All user books shown.`
      };
    }

    // Insert or get title/author in titlesAuthors
    const findOrInsertTitleAuthorQuery = `
      INSERT INTO titlesAuthors (title, author)
      VALUES ($1, $2)
      ON CONFLICT (title, author) DO UPDATE SET title = EXCLUDED.title
      RETURNING id;
    `;
    const titleAuthorResult = await db.query(findOrInsertTitleAuthorQuery, [cleanedTitle, cleanedAuthor]);
    const titleAuthorId = titleAuthorResult.rows[0].id;

    // Insert userReads entry
    const findOrInsertUserReadsQuery = `
      INSERT INTO userReads (user_id, book_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING id;
    `;
    await db.query(findOrInsertUserReadsQuery, [user_id, titleAuthorId]);

    // Normalize guidance notes
    const cleanedNotes = guidance_notes.trim();

    // Insert book record
    const insertBookQuery = `
      INSERT INTO books (user_id, book_id, year_i_read_it, my_rating, guidance_notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING book_id;
    `;
    const insertBookResult = await db.query(insertBookQuery, [
      user_id,
      titleAuthorId,
      year_i_read_it,
      my_rating,
      cleanedNotes
    ]);

    const bookEntryId = insertBookResult.rows[0].book_id;

    return {
      success: true,
      bookEntryId
    };
  } catch (err) {
    console.error("addNewBook threw an error:", err);
    throw err;
  }
}

/* 2.  Function to add a new user */
export async function addNewUser({ first_name, surname }) {
  try {
    // Normalize input early
    const cleanedFirstName = first_name.trim().toUpperCase();
    const cleanedSurname = surname.trim().toUpperCase();

    // Check if user exists (using normalized input)
    const checkQuery = `
      SELECT id FROM users 
      WHERE UPPER(TRIM(first_name)) = $1 AND UPPER(TRIM(surname)) = $2
      LIMIT 1
    `;
    const alreadyMatch = await db.query(checkQuery, [cleanedFirstName, cleanedSurname]);

    if (alreadyMatch.rowCount > 0) {
      return {
        success: false,
        message: 'User already exists with the provided first name and surname.  All user books shown instead.'
      };
    }

    // Insert the new user
    const insertQuery = `
      INSERT INTO users (first_name, surname)
      VALUES ($1, $2)
      RETURNING id
    `;
    const insertResult = await db.query(insertQuery, [cleanedFirstName, cleanedSurname]);

    return {
      success: true,
      user_id: insertResult.rows[0].id
    };

  } catch (error) {
    console.error("Error in addNewUser:", error);
    return {
      success: false,
      message: `Database error: ${error.message}`
    };
  }
}

/* 3.  Function to get all book items */
export async function getAllBooks() {
  const query = `
    SELECT b.book_id, ta.author, ta.title, b.year_i_read_it, b.my_rating, b.guidance_notes, u.surname, u.first_name, b.user_id
    FROM books b
    JOIN users u on b.user_id = u.id
    JOIN titlesAuthors ta on b.book_id = ta.id
    ORDER BY u.surname ASC, u.first_name ASC, ta.author ASC, ta.title ASC;
  `;

  try {
    const result = await db.query(query);

    return {
      success: true,
      books: result.rows
    };

  } catch (error) {
    console.error("Error in getAllBooks:", error);

    return {
      success: false,
      message: "Unable to load books at this time.",
      books: [] // optional: provide fallback empty array
    };
  }
}

/* 4.  Function to get all book items for a specific user */
export async function getBooksByUser({ first_name, surname }) {
  const query = `
    SELECT b.book_id, ta.author, ta.title, b.year_i_read_it, b.my_rating, b.guidance_notes, b.user_id, u.surname, u.first_name
    FROM books b
    JOIN users u on b.user_id = u.id
    JOIN titlesAuthors ta on b.book_id = ta.id
    WHERE UPPER(TRIM(u.first_name)) ILIKE UPPER(TRIM($1)) AND UPPER(TRIM(u.surname)) ILIKE UPPER(TRIM($2))
    ORDER BY u.surname ASC, u.first_name ASC, ta.author ASC, ta.title ASC;
  `;
  
  const result = await db.query(query, [first_name, surname]);
  
  if (result.rowCount === 0) {
    return {
      success: false,
      message: 'No books found for the specified user.  All books shown instead.',
      books: []
    };
  }

  return {
    success: true,
    books: result.rows
  };
}

/* 5. Function to get all users */
export async function getAllUsers() {
  const query = `
    SELECT id, first_name, surname
    FROM users
    ORDER BY surname ASC, first_name ASC
  `;
  const result = await db.query(query);

  if (result.rowCount === 0) {
    return {
      success: false,
      message: 'No users found',
      users: []
    };
  }

  return {
    success: true,
    users: result.rows
  };
}

//6. Function to get user by name
export async function getUser({ first_name, surname }) {
  const query = `
    SELECT id, first_name, surname
    FROM users 
    WHERE TRIM(first_name) ILIKE TRIM($1) 
      AND TRIM(surname) ILIKE TRIM($2)
    ORDER BY surname ASC, first_name ASC
    LIMIT 1
  `;

  try {
    const result = await db.query(query, [first_name, surname]);

    if (result.rowCount === 0) {
      return {
        success: false,
        message: 'No user found.  Showing all user books instead.',
        user: null
      };
    }

    return {
      success: true,
      user: result.rows[0]
    };
  } catch (error) {
    console.error('Error in getUser:', error);

    return {
      success: false,
      message: 'Database error when fetching user',
      user: null
    };
  }
}


//7. Function to sort books by year read   
 export async function sortByYearRead({ first_name, surname }) {
  // CASE 1: No user provided – return all books
  if (!first_name || !surname) {
    const query = `
      SELECT b.book_id, ta.title, ta.author, b.year_i_read_it, b.my_rating, b.guidance_notes, b.user_id
      FROM books b
      JOIN users u ON b.user_id = u.id
      JOIN titlesAuthors ta ON b.book_id = ta.id
      ORDER BY b.year_i_read_it DESC, ta.author ASC, ta.title ASC;
    `;
    const result = await db.query(query);

    if (result.rowCount === 0) {
      return {
        success: false,
        message: 'No books found',
        books: []
      };
    }

    return {
      success: true,
      books: result.rows
    };
  }

  // CASE 2: User provided – get user ID
  const user = await getUser({ first_name, surname });

  if (!user.success) {
    return {
      success: false,
      message: 'User not found.  Showing all user books instead.',
      user: null,
      books: []
    };
  }

  // Get books for the specific user
  const userQuery = `
    SELECT b.book_id, ta.title, ta.author, b.year_i_read_it, b.my_rating, b.guidance_notes, b.user_id
    FROM books b
    JOIN users u ON b.user_id = u.id
    JOIN titlesAuthors ta ON b.book_id = ta.id
    WHERE b.user_id = $1
    ORDER BY b.year_i_read_it DESC, ta.author ASC, ta.title ASC;
  `;

  const userResult = await db.query(userQuery, [user.user.id]);

  if (userResult.rowCount === 0) {
    return {
      success: false,
      message: 'No books found for this user.  Showing all user books instead.',
      user: user.user,
      books: []
    };
  }

  return {
    success: true,
    user: user.user,
    books: userResult.rows
  };
}

//8. Function to sort books by rating
 export async function sortByRating({ first_name, surname }) {
  // CASE 1: No user provided – return all books
  if (!first_name || !surname) {
    const query = `
      SELECT b.book_id, ta.title, ta.author, b.year_i_read_it, b.my_rating, b.guidance_notes, b.user_id
      FROM books b
      JOIN users u ON b.user_id = u.id
      JOIN titlesAuthors ta ON b.book_id = ta.id
      ORDER BY b.my_rating DESC, ta.author ASC, ta.title ASC;
    `;
    const result = await db.query(query);

    if (result.rowCount === 0) {
      return {
        success: false,
        message: 'No books found',
        books: []
      };
    }

    return {
      success: true,
      books: result.rows
    };
  }

  // CASE 2: User provided – get user ID
  const user = await getUser({ first_name, surname });

  if (!user.success) {
    return {
      success: false,
      message: 'User not found.  Showing all user books instead.',
      user: null,
      books: []
    };
  }

  // Get books for the specific user
  const userQuery = `
    SELECT b.book_id, ta.title, ta.author, b.year_i_read_it, b.my_rating, b.guidance_notes, b.user_id
    FROM books b
    JOIN users u ON b.user_id = u.id
    JOIN titlesAuthors ta ON b.book_id = ta.id
    WHERE b.user_id = $1
    ORDER BY b.my_rating DESC, ta.author ASC, ta.title ASC;
  `;

  const userResult = await db.query(userQuery, [user.user.id]);

  if (userResult.rowCount === 0) {
    return {
      success: false,
      message: 'No books found for this user.  Showing all user books instead.',
      user: user.user,
      books: []
    };
  }

  return {
    success: true,
    user: user.user,
    books: userResult.rows
  };
}


/* 9.  Function to edit a book item */
export async function editBook({
  book_id,         // ID from 'books' table
  title,
  author,
  year_i_read_it,
  my_rating,
  guidance_notes,
  user_id          // ✅ Now passed directly instead of name
}) {
  if (!user_id) {
    try {
      const books = await getAllBooks();  // ✅ Use your existing function
      return {
        success: false,
        message: 'No user ID provided – returning all books instead of updating',
        user: null,
        books
      };
    } catch (error) {
      console.error('Failed to fetch all books:', error);
      return {
        success: false,
        message: 'Failed to fetch books',
        error
      };
    }
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    let newTitlesAuthorsId;

    // If both title and author are provided, we're updating the book reference
    if (title && author) {
      const checkQuery = `
        SELECT id FROM titlesAuthors
        WHERE TRIM(title) ILIKE TRIM($1)
          AND TRIM(author) ILIKE TRIM($2)
      `;

      const titleTrimmed = title.trim();
      const authorTrimmed = author.trim();

      const result = await client.query(checkQuery, [titleTrimmed, authorTrimmed]);

      if (result.rowCount > 0) {
        newTitlesAuthorsId = result.rows[0].id;
      } else {
        const insertQuery = `
          INSERT INTO titlesAuthors (title, author)
          VALUES ($1, $2)
          RETURNING id
        `;
        const insertResult = await client.query(insertQuery, [titleTrimmed, authorTrimmed]);
        newTitlesAuthorsId = insertResult.rows[0].id;
      }

      // ✅ Update the books table to reference the new title-author ID
      const updateBooksQuery = `
        UPDATE books
        SET
          book_id = $1,
          year_i_read_it = COALESCE($2, year_i_read_it),
          my_rating = COALESCE($3, my_rating),
          guidance_notes = COALESCE($4, guidance_notes)
        WHERE book_id = $5 AND user_id = $6
      `;

      await client.query(updateBooksQuery, [
        newTitlesAuthorsId,
        year_i_read_it,
        my_rating,
        guidance_notes,
        book_id,
        user_id
      ]);

      // ✅ Ensure entry exists in userReads
      const insertUserReadsQuery = `
        INSERT INTO userReads (user_id, book_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, book_id) DO NOTHING
      `;
      await client.query(insertUserReadsQuery, [user_id, newTitlesAuthorsId]);
    } else {
      // ✅ No title/author change, just update the book record
      const updateOnlyBookDetailsQuery = `
        UPDATE books
        SET
          year_i_read_it = COALESCE($1, year_i_read_it),
          my_rating = COALESCE($2, my_rating),
          guidance_notes = COALESCE($3, guidance_notes)
        WHERE book_id = $4 AND user_id = $5
      `;

      await client.query(updateOnlyBookDetailsQuery, [
        year_i_read_it,
        my_rating,
        guidance_notes,
        book_id,
        user_id
      ]);
    }

    await client.query('COMMIT');
  } catch (error) {
     await client.query('ROLLBACK');
  console.error('editBook failed:', error);
  return {
    success: false,
    message: 'Failed to update book',
    error
  };
  } finally {
    client.release();
  }
}



// 10. Function to delete a book item
export async function deleteItem(book_id, user_id) {
  if (!user_id) {
    try {
      const books = await getAllBooks(); // ✅ Fetch all books
      return {
        success: false,
        message: 'No user ID provided – book not deleted. Returning all books instead.',
        user: null,
        books
      };
    } catch (error) {
      console.error('Failed to fetch all books:', error);
      return {
        success: false,
        message: 'Failed to fetch books after missing user ID',
        error
      };
    }
  }

  try {
    const query = `
      DELETE FROM books 
      WHERE book_id = $1 AND user_id = $2
    `;

    const result = await db.query(query, [book_id, user_id]);

    if (result.rowCount === 0) {
      return {
        success: false,
        message: 'No matching book found to delete'
      };
    }

    return {
      success: true,
      message: 'Book deleted successfully'
    };

  } catch (error) {
    console.error('Error deleting book:', error);
    return {
      success: false,
      message: 'Database error during deletion',
      error
    };
  }
}


// 11. Function to get user by id
export async function getUserById(user_id) {
  const result = await db.query('SELECT first_name, surname FROM users WHERE id = $1', [user_id]);
  return result.rows[0];
}
