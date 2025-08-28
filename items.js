import db from './db.js';

/* 1.  Function to add a new book item */
export async function addNewBook({ title, author, yearRead, rating, guidanceNotes, forename, surname }) {
  //Look up userId from forename and surname
  const userQuery = 'SELECT id FROM users WHERE first_name ILIKE $1 AND surname ILIKE $2 LIMIT 1';
  const userResult = await db.query(userQuery, [forename, surname]);

  if (userResult.rowCount === 0) {
    throw new Error('User not found with the provided forename and surname');
  }

  const userId = userResult.rows[0].id;

  //Check if user and book id are already in the userReads table
  const userBookMatchExistsQuery = `
    SELECT * FROM userReads
    WHERE user_id = $1 
      AND book_id = (
        SELECT id FROM titlesAuthors WHERE title ILIKE $2 AND author ILIKE $3 LIMIT 1
      );
  `;
  const userBookMatch = await db.query(userBookMatchExistsQuery, [userId, title, author]);
  if (userBookMatch.rowCount > 0) {
    throw new Error(`This book is already associated with the user ${forename} ${surname}`);
  }

  //Insert or get existing title/author in titlesAuthors
  const findOrInsertTitleAuthorQuery = `
    INSERT INTO titlesAuthors (title, author)
    VALUES ($1, $2)
    ON CONFLICT (title, author) DO UPDATE SET title = EXCLUDED.title
    RETURNING id;
  `;
  const titleAuthorResult = await db.query(findOrInsertTitleAuthorQuery, [title, author]);
  const titleAuthorId = titleAuthorResult.rows[0].id;

  //Insert or get userReads entry linking user and book
  const findOrInsertUserReadsQuery = `
    INSERT INTO userReads (user_id, book_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, book_id) DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING id;
  `;
  const userReadsResult = await db.query(findOrInsertUserReadsQuery, [userId, titleAuthorId]);
  const userReadsId = userReadsResult.rows[0].id;

  //Insert book reading details linked to userReads
  const insertBookQuery = `
    INSERT INTO books (user_id, book_id, year_I_read_it, my_rating, guidance_notes)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id;
  `;

  const insertBookResult = await db.query(insertBookQuery, [userId, titleAuthorId, yearRead, rating, guidanceNotes]);
  const bookEntryId = insertBookResult.rows[0].id;

  return bookEntryId;
}



/* 2.  Function to add a new user */
export async function addNewUser({ forename, surname }) {

  //Check if the user already exists
const checkQuery = 'SELECT id FROM users WHERE first_name ILIKE $1 AND surname ILIKE $2';
const alreadyMatch = await db.query(checkQuery, [forename, surname]);
if (alreadyMatch.rowCount > 0) {
  throw new Error('User already exists with the provided forename and surname');
}

 //Insert the new user
 const insertQuery = `
    INSERT INTO users (first_name, surname)
    VALUES ($1, $2)
    RETURNING id`;
    await db.query(insertQuery, [forename, surname]);
}



/* 3.  Function to get all book items */
export async function getAllBooks() {
  const query = `
  SELECT b.book_id, ta.author, ta.title, b.year_I_read_it, b.my_rating, b.guidance_notes, u.surname, u.first_name
  FROM books b
  JOIN users u on b.user_id = u.id
  JOIN titlesAuthors ta on b.book_id = ta.id
  ORDER BY u.surname ASC, u.first_name ASC, ta.author ASC, ta.title ASC;
  `

  const result = await db.query(query);
  return result.rows;
}



/* 4.  Function to get all book items for a specific user */
export async function getBooksByUser({ forename, surname }) {
  const query = `
  SELECT b.book_id, ta.author, ta.title, b.year_I_read_it, b.my_rating, b.guidance_notes, u.surname, u.first_name
  FROM books b
  JOIN users u on b.user_id = u.id
  JOIN titlesAuthors ta on b.book_id = ta.id
  WHERE u.first_name ILIKE $1 AND u.surname ILIKE $2
  ORDER BY u.surname ASC, u.first_name ASC,ta.author ASC, ta.title ASC;
  `
  const result = await db.query(query, [forename, surname]);
  if (result.rowCount === 0) {
    throw new Error('No books found for the specified user');
  }
  return result.rows;
}


/* 5.  Function to get all users */
export async function getAllUsers() {
  const query = `
    SELECT id, first_name, surname
    FROM users
    ORDER BY surname ASC, first_name ASC
  `;
  const result = await db.query(query);  // no parameters needed
  if (result.rowCount === 0) {
    throw new Error('No users found');
  }
  return result.rows;
}



/* 6.  Function to get a specific user */
export async function getUser({ forename, surname }) {
  const query = `
  SELECT id, first_name, surname
  FROM users 
  WHERE first_name ILIKE $1 AND surname ILIKE $2
  ORDER BY surname ASC, first_name ASC
  LIMIT 1`;
  const result = await db.query(query, [forename, surname]);
  if (result.rowCount === 0) {
    throw new Error('No user found with the provided forename and surname');
  }
  return result.rows[0];
}


/* 7.  Function to sort all books by year read */
  export async function sortByYearRead({ forename, surname }) {
    //no user found - return all books sorted by year read
  if (!forename || !surname) {
    const query = `
      SELECT b.book_id, ta.title, ta.author, b.year_I_read_it, b.my_rating, b.guidance_notes
      FROM books b
      JOIN users u ON b.user_id = u.id
      JOIN titlesAuthors ta ON b.book_id = ta.id
      ORDER BY b.year_I_read_it DESC, ta.author ASC, ta.title ASC;
    `;
    const result = await db.query(query);

    if (result.rowCount === 0) {
      throw new Error('No books found');
    }

    return result.rows;
  }

//if user found - return only that user's books

  const user = await getUser({ forename, surname });

  if (!user) {
    throw new Error('User not found');
  }

  const query = `
    SELECT b.book_id, ta.title, ta.author, b.year_I_read_it, b.my_rating, b.guidance_notes
    FROM books b
    JOIN users u ON b.user_id = u.id
    JOIN titlesAuthors ta ON b.book_id = ta.id
    WHERE b.user_id = $1
    ORDER BY b.year_I_read_it DESC, ta.author ASC, ta.title ASC;
  `;

  const result = await db.query(query, [user.id]);

  if (result.rowCount === 0) {
    throw new Error('No books found for this user');
  }

  return result.rows;
}



/* 8.  Function to sort by rating */
export async function sortByRating(forename, surname) {
    //no user found - return all books sorted by rating
  if (!forename || !surname) {
    const query = `
      SELECT b.book_id, ta.title, ta.author, b.year_I_read_it, b.my_rating, b.guidance_notes
      FROM books b
      JOIN users u ON b.user_id = u.id
      JOIN titlesAuthors ta ON b.book_id = ta.id
      ORDER BY b.rating DESC, ta.author ASC, ta.title ASC;
    `;
    const result = await db.query(query);

    if (result.rowCount === 0) {
      throw new Error('No books found');
    }

    return result.rows;
  }
  
//if user found - return only that user's books

  const user = await getUser({ forename, surname });

  if (!user) {
    throw new Error('User not found');
  }

  const query = `
    SELECT b.book_id, ta.title, ta.author, b.year_I_read_it, b.my_rating, b.guidance_notes
    FROM books b
    JOIN users u ON b.user_id = u.id
    JOIN titlesAuthors ta ON b.book_id = ta.id
    WHERE b.user_id = $1
    ORDER BY b.rating DESC, ta.author ASC, ta.title ASC;
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
  yearRead,
  rating,
  guidanceNotes,
  forename,
  surname
}) {
  const user = await getUser({ forename, surname });
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
          year_I_read_it = COALESCE($2, year_I_read_it),
          my_rating = COALESCE($3, my_rating),
          guidance_notes = COALESCE($4, guidance_notes)
        WHERE book_id = $5 AND user_id = $6
      `;
      await client.query(updateBooksQuery, [
        newTitlesAuthorsId,
        yearRead,
        rating,
        guidanceNotes,
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
          year_I_read_it = COALESCE($1, year_I_read_it),
          my_rating = COALESCE($2, my_rating),
          guidance_notes = COALESCE($3, guidance_notes)
        WHERE book_id = $4 AND user_id = $5
      `;
      await client.query(updateOnlyBookDetailsQuery, [
        yearRead,
        rating,
        guidanceNotes,
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
export async function deleteItem(book_id, forename, surname) {
  const user = await getUser({ forename, surname });
  //Get user id for the above
  if (!user) {
   throw new Error('User not found');
  }
  const userId = user.id;
  const query = `DELETE FROM books WHERE book_id = $1 AND user_id = $2`;
  await db.query(query, [book_id, userId]);
}

//11. Function to get user by id
export async function getUserById(user_id) {
  const result = await db.query('SELECT first_name, surname FROM users WHERE id = $1', [user_id]);
  return result.rows[0];
}
