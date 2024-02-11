// Required Package Import
import express from "express";
const route = express.Router();
import mainController from "../Controllers/controller";
import { authenticateUser, verifyAdminToken, verifyToken } from "../middleware/authenticate";

// Login Token Generator;
route.post('/login', authenticateUser);

//Home Getting Book based On Requirement
route.get('/home', verifyToken, mainController.home);

//Add New Book
route.post('/addBook', verifyAdminToken, mainController.addBook);

//Delete Book
route.delete('/deleteBook',verifyAdminToken,mainController.deleteBook);

export default route;
