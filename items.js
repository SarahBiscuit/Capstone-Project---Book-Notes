import db from './db.js';

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
        message: 'User not found with the provided first name and surname'
      };
    }

    const userId = userResult.rows[0].id;

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
    const userBookMatch = await db.query(userBookMatchQuery, [userId, cleanedTitle, cleanedAuthor]);

    if (userBookMatch.rowCount > 0) {
      return {
        success: false,
        message: `This book is already associated with the user ${first_name} ${surname}`
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
    await db.query(findOrInsertUserReadsQuery, [userId, titleAuthorId]);

    // Normalize guidance notes
    const cleanedNotes = guidance_notes.trim();

    // Insert book record
    const insertBookQuery = `
      INSERT INTO books (user_id, book_id, year_i_read_it, my_rating, guidance_notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING book_id;
    `;
    const insertBookResult = await db.query(insertBookQuery, [
      userId,
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
        message: 'User already exists with the provided first name and surname'
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
      userId: insertResult.rows[0].id
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
    SELECT b.book_id, ta.author, ta.title, b.year_i_read_it, b.my_rating, b.guidance_notes, u.surname, u.first_name
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
    SELECT b.book_id, ta.author, ta.title, b.year_i_read_it, b.my_rating, b.guidance_notes, u.surname, u.first_name
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
      message: 'No books found for the specified user',
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

/* 6.  Function to get a specific user */
export async function getUser({ first_name, surname }) {
  const query = `
    SELECT id, first_name, surname
    FROM users 
    WHERE first_name ILIKE $1 AND surname ILIKE $2
    ORDER BY surname ASC, first_name ASC
    LIMIT 1
  `;
  const result = await db.query(query, [first_name, surname]);

  if (result.rowCount === 0) {
    return {
      success: false,
      message: 'No user found with the provided first_name and surname'
    };
  }

  return {
    success: true,
    user: result.rows[0]
  };
}

/* 7.  Function to sort all books by year read */
export async function sortByYearRead({ first_name, surname }) {
  // no user found - return all books sorted by year read
  if (!first_name || !surname) {
    const query = `
      SELECT b.book_id, ta.title, ta.author, b.year_i_read_it, b.my_rating, b.guidance_notes
      FROM books b
      JOIN users u ON b.user_id = u.id
      JOIN titlesAuthors ta ON b.book_id = ta.id
      ORDER BY b.year_i_read_it DESC, ta.author ASC, ta.title ASC;
    `;
    const result = await db.query(query);

    if (result.rowCount === 0) {
      throw new Error('No books found');
    }

    return result.rows;
  }

  // if user found - return only that user's books

  const user = await getUser({ first_name, surname });

  if (!user) {
    throw new Error('User not found');
  }

  const query = `
    SELECT b.book_id, ta.title, ta.author, b.year_i_read_it, b.my_rating, b.guidance_notes
    FROM books b
    JOIN users u ON b.user_id = u.id
    JOIN titlesAuthors ta ON b.book_id = ta.id
    WHERE b.user_id = $1
    ORDER BY b.year_i_read_it DESC, ta.author ASC, ta.title ASC;
  `;

  const result = await db.query(query, [user.id]);

  if (result.rowCount === 0) {
    throw new Error('No books found for this user');
  }

  return result.rows;
}

/* 8.  Function to sort by rating */
export async function sortByRating({ first_name, surname }) {
  // no user found - return all books sorted by rating
  if (!first_name || !surname) {
    const query = `
      SELECT b.book_id, ta.title, ta.author, b.year_i_read_it, b.my_rating, b.guidance_notes
      FROM books b
      JOIN users u ON b.user_id = u.id
      JOIN titlesAuthors ta ON b.book_id = ta.id
      ORDER BY b.my_rating DESC, ta.author ASC, ta.title ASC;
    `;
    const result = await db.query(query);

    if (result.rowCount === 0) {
      throw new Error('No books found');
    }

    return result.rows;
  }

  // if user found - return only that user's books

  const user = await getUser({ first_name, surname });

  if (!user) {
    throw new Error('User not found');
  }

  const query = `
    SELECT b.book_id, ta.title, ta.author, b.year_i_read_it, b.my_rating, b.guidance_notes
    FROM books b
    JOIN users u ON b.user_id = u.id
    JOIN titlesAuthors ta ON b.book_id = ta.id
    WHERE b.user_id = $1
    ORDER BY b.my_rating DESC, ta.author ASC, ta.title ASC;
  `;

  const result = await db.query(query, [user.id]);

  if (result.rowCount === 0) {
    throw new Error('No books found for this user');
  }

  return result.rows;
}

/* 9.  Function to edit a book item */
export async function editBook({
  bookId, // ID from 'books' table
  title,
  author,
  year_i_read_it,
  my_rating,
  guidance_notes,
  first_name,
  surname
}) {
  const user = await getUser({ first_name, surname });
  if (!user) {
    throw new Error('User not found');
  }

  const client = await db.connect();

  try {
    await client.query('BEGIN');

    let newTitlesAuthorsId;

    // If both title and author are provided, we're updating the book reference
    if (title && author) {
      // Check if that title/author already exists
      const checkQuery = `
        SELECT id FROM titlesAuthors WHERE title ILIKE $1 AND author ILIKE $2
      `;
      const result = await client.query(checkQuery, [title, author]);

      if (result.rowCount > 0) {
        // Reuse the existing title-author ID
        newTitlesAuthorsId = result.rows[0].id;
      } else {
        // Insert a new title-author pair
        const insertQuery = `
          INSERT INTO titlesAuthors (title, author)
          VALUES ($1, $2)
          RETURNING id
        `;
        const insertResult = await client.query(insertQuery, [title, author]);
        newTitlesAuthorsId = insertResult.rows[0].id;
      }

      /* Update the books table to reference the new title-author*/
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
        bookId,
        user.id
      ]);

      // Ensure entry exists in userReads
      const insertUserReadsQuery = `
        INSERT INTO userReads (user_id, book_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, book_id) DO NOTHING
      `;
      await client.query(insertUserReadsQuery, [user.id, newTitlesAuthorsId]);
    } else {
      // If no title/author change, just update other fields
      const updateOnlyBookDetailsQuery = `
        UPDATE books
        SET
          year_I_read_it = COALESCE($1, year_i_read_it),
          my_rating = COALESCE($2, my_rating),
          guidance_notes = COALESCE($3, guidance_notes)
        WHERE book_id = $4 AND user_id = $5
      `;
      await client.query(updateOnlyBookDetailsQuery, [
        year_i_read_it,
        my_rating,
        guidance_notes,
        bookId,
        user.id
      ]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/* 10.  Function to delete a book item */
// Function to delete an item by id
export async function deleteItem(book_id, first_name, surname) {
  const user = await getUser({ first_name, surname });
  // Get user id for the above
  if (!user) {
    throw new Error('User not found');
  }
  const userId = user.id;
  const query = `DELETE FROM books WHERE book_id = $1 AND user_id = $2`;
  await db.query(query, [book_id, userId]);
}

// 11. Function to get user by id
export async function getUserById(user_id) {
  const result = await db.query('SELECT first_name, surname FROM users WHERE id = $1', [user_id]);
  return result.rows[0];
}
