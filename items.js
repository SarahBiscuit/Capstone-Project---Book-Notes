import db from '../db.js';

/* Function to add a new book item */
export async function addNewBook({ title, author, yearRead, rating, guidanceNotes, forename, surname }) {
  // 1. Look up userId from forename and surname
  const userQuery = 'SELECT user_id FROM users WHERE forename ILIKE $1 AND surname ILIKE $2 LIMIT 1';
  const userResult = await db.query(userQuery, [forename, surname]);

  if (userResult.rowCount === 0) {
    throw new Error('User not found with the provided forename and surname');
  }

  const userId = userResult.rows[0].user_id;

  //Check if user and book id are already in the userReads table
  const userBookMatchExistsQuery = `
  SELECT * from userReads
  WHERE user_id = $1 AND book_id = (SELECT id FROM books WHERE title ILIKE $2 AND author ILIKE $3 LIMIT 1);`
  const userBookMatch = await db.query(userBookMatchExistsQuery, [userId, title, author});
  if (userBookMatch.rowCount > 0) {
    throw new Error(`This book is already associated with the user ${forename} ${surname}`);
  }

  // 2. Insert the book with found userId into the books table
  const insertQuery = `
    INSERT INTO books (title, author, year_read, rating, guidance_notes, user_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `;
  const insertBookResult = await db.query(insertQuery, [title, author, yearRead, rating, guidanceNotes, userId]);
  const bookId = insertBookResult.rows[0].book_id;

  //3. Link the book and the user in the userReads table
  const userReadsInsertQuery = `
    INSERT INTO userReads (user_id, book_id)
    VALUES ($1, $2)
  `;
  await db.query(userReadsInsertQuery, [userId, bookId]);
}



/* Function to add a new user */
export async function addNewUser({ forename, surname }) {

  //1. Check if the user already exists
const checkQuery = 'SELECT id FROM users WHERE forename ILIKE $1 AND surname ILIKE $2';
const alreadyMatch = await db.query(checkQuery, [forename, surname]);
if (alreadyMatch.rowCount > 0) {
  throw new Error('User already exists with the provided forename and surname');
}

 //2. Insert the new user
 const insertQuery = `
    INSERT INTO users (forename, surname)
    VALUES ($1, $2)`;
    await db.query(insertQuery, [forename, surname]);
}



/* Function to get all book items */
export async function getAllBooks() {
  const query = `
  SELECT b.book_id, b.title, b.author, b.year_read, b.rating, b.guidance_notes, u.surname, u.forename
  FROM books b
  JOIN users u on b.user_id = u.user_id
  ORDER BY u.surname ASC, u.forename ASC, b.author ASC, b.title ASC;
  `

  const result = await db.query(query);
  return result.rows;
}



/* Function to get all book items for a specific user */
export async function getBooksByUser({ forename, surname }) {
  const query = `
  SELECT b.book_id, b.title, b.author, b.year_read, b.rating, b.guidance_notes, u.surname, u.forename
  FROM books b
  JOIN users u on b.user_id = u.user_id
  WHERE u.forename ILIKE $1 AND u.surname ILIKE $2
  ORDER BY u.surname ASC, u.forename ASC, b.author ASC, b.title ASC;
  `
  const result = await db.query(query, [forename, surname]);
  if (result.rowCount === 0) {
    throw new Error('No books found for the specified user');
  }
  return result.rows;
}


/* Function to get all users */
export async function getAllUsers() {
  const query = `
  SELECT user_id, forename, surname
  FROM users
  ORDER BY surname ASC, forename ASC
  `;
  const result = await db.query(query, [forename, surname]);
  if (result.rowCount === 0) {
    throw new Error('No users found]');
  }
  return result.rows;
}



/* Function to get a specific user */
export async function getUser({ forename, surname }) {
  const query = `
  SELECT user_id, forename, surname
  FROM users 
  WHERE forename ILIKE $1 AND surname ILIKE $2
  ORDER BY surname ASC, forename ASC
  `;
  const result = await db.query(query, [forename, surname]);
  if (result.rowCount === 0) {
    throw new Error('No user found with the provided forename and surname');
  }
  return result.rows[0];
}


/* Function to sort all books by year read */
export async function sortByYearRead(forename, surname) {
  if (!forename || !surname) {
    // No user selected – return all books sorted by year read
    const query = `
      SELECT b.book_id, b.title, b.author, b.year_read, b.rating, b.guidance_notes
      FROM books b
      ORDER BY b.year_read DESC, b.author ASC, b.title ASC;
    `;
    const result = await db.query(query);

    if (result.rowCount === 0) {
      throw new Error('No books found');
    }

    return result.rows;

  } else {
    // User selected – return only that user's books
    const user = await getUser({ forename, surname });

    if (!user) {
      throw new Error('User not found');
    }

    const userId = user.user_id;
    const query = `
      SELECT b.book_id, b.title, b.author, b.year_read, b.rating, b.guidance_notes
      FROM books b
      WHERE b.user_id = $1
      ORDER BY b.year_read DESC, b.author ASC, b.title ASC;
    `;

    const result = await db.query(query, [userId]);

    if (result.rowCount === 0) {
      throw new Error('No books found for this user');
    }

    return result.rows;
  }
}



/* Function to sort by rating */
//Can I make this function shorter and less repetitive?//
export async function sortByRating(forename, surname) {
  if (!forename || !surname) {
    // No user selected – return all books sorted by rating
    const query = `
      SELECT b.book_id, b.title, b.author, b.year_read, b.rating, b.guidance_notes
      FROM books b
      ORDER BY b.rating ASC, b.author ASC, b.title ASC;
    `;
    const result = await db.query(query);

    if (result.rowCount === 0) {
      throw new Error('No books found');
    }

    return result.rows;

  } else {
    // User selected – return only that user's books
    const user = await getUser({ forename, surname });

    if (!user) {
      throw new Error('User not found');
    }

    const userId = user.user_id;
    const query = `
      SELECT b.book_id, b.title, b.author, b.year_read, b.rating, b.guidance_notes
      FROM books b
      WHERE b.user_id = $1
      ORDER BY b.rating ASC, b.author ASC, b.title ASC;
    `;

    const result = await db.query(query, [userId]);

    if (result.rowCount === 0) {
      throw new Error('No books found for this user');
    }

    return result.rows;
  }
}



/* Function to edit a book item */
export async function editBook({ bookId, title, author, yearRead, rating, guidancenotes}) {
  const query = `
    UPDATE books
    SET title = $1, author = $2, year_read = $3, rating = $4, guidance_notes = $5`;
    await db.query(query, [title, author, yearRead, rating, guidanceNotes]);
}


/* Function to delete a book item */
// Function to delete an item by id
export async function deleteItem(bookId) {
  const query = `DELETE FROM books WHERE book_id = $1`;
  await db.query(query, [bookId]);
}
