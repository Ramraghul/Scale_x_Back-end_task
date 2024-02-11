import { Request, Response } from 'express';
import fs from 'fs';
import csv from 'csv-parser';
import { Validator } from 'node-input-validator';
import path from 'path'
import { addBookToCSV } from '../middleware/authenticate';

// Define the Request interface
interface AuthenticatedRequest extends Request {
    user?: { userType: string };
}

// Define a function to read books from a CSV file
function readBooksFromFile(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const books: any[] = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row: any) => {
                books.push({ bookName: row.BookName, author: row.Author, publicationYear: row.PublicationYear });
            })
            .on('end', () => {
                resolve(books);
            })
            .on('error', (error: Error) => {
                reject(error);
            });
    });
}

// Main Controller
const mainController = {
    async home(req: AuthenticatedRequest, res: Response) {
        try {
            const { userType } = req.user as { userType: string };
            let books: string[] = [];

            // Read user books for all users
            books = await readBooksFromFile('src/data/user.book.csv');

            // If user is admin, read admin books as well
            if (userType === 'Admin') {
                const adminBooks = await readBooksFromFile('src/data/admin.book.csv');
                books = [...books, ...adminBooks];
            }

            res.json({ books });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    async addBook(req: AuthenticatedRequest, res: Response) {
        try {
            const { BookName, Author, PublicationYear } = req.body;

            // Validate request body
            const v = new Validator(req.body, {
                BookName: 'required|string',
                Author: 'required|string',
                PublicationYear: 'required|integer|min:1900|max:9999'
            });

            const matched = await v.check();
            if (!matched) {
                return res.status(400).json({ message: v.errors });
            }

            // Construct file paths
            // const adminFilePath = path.join(__dirname, '..', 'data', 'admin.book.csv');
            const userFilePath = path.join(__dirname, '..', 'data', 'user.book.csv');

            const filePaths = [userFilePath];

            // Add the book to each CSV file
            for (const filePath of filePaths) {
                await addBookToCSV(filePath, { BookName, Author, PublicationYear });
            }

            res.json({ success: true, message: 'Book added successfully' });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    async deleteBook(req: AuthenticatedRequest, res: Response) {
        try {
            const { BookName } = req.body;
            if (!BookName) return res.status(400).json({ message: 'Book Name is required' });
    
            const filePath = path.join(__dirname, '..', 'data', 'user.book.csv');
            const tempFilePath = `${filePath}.tmp`;
            const readStream = fs.createReadStream(filePath);
            const writeStream = fs.createWriteStream(tempFilePath);
    
            let headerWritten = false;
            let found = false; // Flag to check if the book has been found
    
            readStream.pipe(csv())
                .on('data', (row: any) => {
                    if (!headerWritten) {
                        writeStream.write(`${Object.keys(row).join(',')}\n`);
                        headerWritten = true;
                    }
                    if (row.BookName && row.BookName.toLowerCase() === BookName.toLowerCase()) {
                        found = true; // Set found flag if book is found
                    } else {
                        writeStream.write(`${Object.values(row).join(',')}\n`);
                    }
                })
                .on('end', () => {
                    if (!found) {
                        fs.unlinkSync(tempFilePath); // Delete temp file if book not found
                        return res.status(404).json({ message: 'Book not found' });
                    }
                    fs.unlinkSync(filePath);
                    fs.renameSync(tempFilePath, filePath);
                    res.json({ message: 'Book deleted successfully' });
                });
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    
    
    

}

export default mainController;
