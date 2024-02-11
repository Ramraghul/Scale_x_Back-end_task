import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import fs from 'fs';

// Define a new interface extending the Request interface
interface AuthenticatedRequest extends Request {
    user?: { username: string; userType: string };
}

interface Book {
    BookName: string;
    Author: string;
    PublicationYear: number;
}

// JWT secret key
const secretKey = "!hu$C`6tVJC[{Ai2qY(9k71]Xx5+qWiO0}%;#:';ZP13%Axw5n<Ir$S[>`$q5ya";

// Sample user data from JSON file
const jsonData = JSON.parse(fs.readFileSync('src/data/userJson.json', 'utf-8'));

// Extracting users from JSON data
const users: Record<string, { hashedPassword: string; role: string }> = {};
jsonData.forEach((user: any) => {
    users[user.userName] = {
        hashedPassword: bcrypt.hashSync(user.password, 10),
        role: user.role
    };
});

// Middleware to authenticate user and generate JWT token
export function authenticateUser(req: Request, res: Response, next: NextFunction) {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
        return res.status(400).json({ message: 'Username, password, and role are required' });
    }

    const user = users[username];
    if (!user || !bcrypt.compareSync(password, user.hashedPassword)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.role !== role) {
        return res.status(403).json({ message: 'Unauthorized role' });
    }

    const token = jwt.sign({ username, userType: role }, secretKey);
    res.json({ token });
}

// Middleware to verify JWT token Admin and User 
export function verifyToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.status(403).json({ message: 'Forbidden' });
        // Cast the user object to AuthenticatedRequest type to avoid TypeScript error
        (req as AuthenticatedRequest).user = user as { username: string; userType: string };
        next();
    });
}

//// Middleware to verify JWT token only allow Admin
export function verifyAdminToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.status(403).json({ message: 'Forbidden' });

        const { userType } = user as { userType: string };
        if (userType !== 'Admin') {
            return res.status(403).json({ message: 'Forbidden - Admin access required' });
        }

        // Cast the user object to AuthenticatedRequest type to avoid TypeScript error
        (req as AuthenticatedRequest).user = user as { username: string; userType: string };
        next();
    });
}


export async function addBookToCSV(filePath: string, book: Book): Promise<void> {
    return new Promise((resolve, reject) => {
        // Create a writable stream to append the book to the CSV file
        const writeStream = fs.createWriteStream(filePath, { flags: 'a' });

        // Write the book data to the CSV file
        writeStream.write(`${book.BookName},${book.Author},${book.PublicationYear}\n`);


        // Handle stream events
        writeStream.on('finish', () => {
            resolve(); // Resolve the promise when writing is complete
        });
        writeStream.on('error', (error) => {
            reject(error); // Reject the promise if an error occurs
        });

        // Close the write stream
        writeStream.end();
    });
}