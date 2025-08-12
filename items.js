import db from '../db.js';

/* Function to add a new book item */
export async function addNewBook({ title, author, yearRead, rating, guidanceNotes, forename, surname }) {
  // 1. Look up userId from forename and surname
  const userQuery = 'SELECT id FROM users WHERE forename ILIKE $1 AND surname ILIKE $2 LIMIT 1';
  const userResult = await db.query(userQuery, [forename, surname]);

  if (userResult.rowCount === 0) {
    throw new Error('User not found with the provided forename and surname');
  }

  const userId = userResult.rows[0].id;

  // 2. Insert the book with found userId
  const insertQuery = `
    INSERT INTO books (title, author, year_read, rating, guidance_notes, user_id)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  await db.query(insertQuery, [title, author, yearRead, rating, guidanceNotes, userId]);
}

/* Function to add a new user */

/* Function to get all book items */

/* Function to get all users */

/* Fucntion to get a specific user */

/* Function to get all book items for a specific user */

/* Function to sort by year read */

/* Function to sort by rating */

/* Function to edit a book item */

/* Function to delete a book item */

