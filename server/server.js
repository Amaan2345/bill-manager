// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// require('dotenv').config();

// const app = express();
// const port = process.env.PORT || 5000;

// // Middleware
// app.use(cors());
// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ limit: '50mb', extended: true }));


// // MongoDB Connection
// const uri = process.env.MONGODB_URI;
// mongoose.connect(uri)
//   .then(() => console.log('Connected to MongoDB Atlas'))
//   .catch(err => console.error('Could not connect to MongoDB Atlas:', err));

// // Define a Mongoose Schema for your bills
// const billSchema = new mongoose.Schema({
//     id: String,
//     fileName: String,
//     mimeType: String,
//     fileData: Buffer, // Use Buffer to store binary file data
//     text: String,
//     date: String,
//     invoiceNumber: String,
//     createdAt: Number,
// });

// const Bill = mongoose.model('Bill', billSchema);

// // API Routes (Endpoints)

// // GET all bills
// app.get('/api/bills', async (req, res) => {
//     try {
//         const bills = await Bill.find({}).sort({ createdAt: -1 });
//         res.json(bills);
//     } catch (err) {
//         res.status(500).json({ message: 'Error fetching bills', error: err });
//     }
// });

// // POST a new bill
// // app.post('/api/bills', async (req, res) => {
// //     try {
// //         const newBill = new Bill(req.body);
// //         const savedBill = await newBill.save();
// //         res.status(201).json(savedBill);
// //     } catch (err) {
// //         res.status(400).json({ message: 'Error saving bill', error: err });
// //     }
// // });

// app.post('/api/bills', async (req, res) => {
//     try {
//         const { fileName, mimeType, fileData, text, date, invoiceNumber, createdAt } = req.body;

//         // Check if fileData is a Base64 string
//         if (!fileData || typeof fileData !== 'string') {
//             return res.status(400).json({ message: 'Invalid file data format.' });
//         }

//         // Split the Base64 string to get the content type and the data part
//         const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
//         if (!matches || matches.length !== 3) {
//             // If it's not a Data URL, it might be a raw Base64 string.
//             // Let's assume the mimeType is correct and try parsing the whole string.
//             // If you want to be stricter, you can return an error here.
//             console.warn("Received fileData that is not a standard data URL. Attempting to parse as a raw Base64 string.");
//         }
        
//         const base64Content = matches ? matches[2] : fileData; // Use the parsed data part
//         const buffer = Buffer.from(base64Content, 'base64'); // This is the crucial step

//         const newBill = new Bill({
//             fileName,
//             mimeType,
//             fileData: buffer, // Store the newly created Buffer
//             text,
//             date,
//             invoiceNumber,
//             createdAt
//         });
        
//         const savedBill = await newBill.save();
//         res.status(201).json(savedBill);
//     } catch (err) {
//         console.error('Error saving bill:', err);
//         res.status(400).json({ message: 'Error saving bill', error: err.message });
//     }
// });

// // DELETE a bill
// // app.delete('/api/bills/:id', async (req, res) => {
// //     try {
// //         const result = await Bill.findOneAndDelete({ id: req.params.id });
// //         if (!result) {
// //             return res.status(404).json({ message: 'Bill not found' });
// //         }
// //         res.status(200).json({ message: 'Bill deleted successfully' });
// //     } catch (err) {
// //         res.status(500).json({ message: 'Error deleting bill', error: err });
// //     }
// // });
// // DELETE a bill - CORRECTED
// app.delete('/api/bills/:id', async (req, res) => {
//     try {
//         // Use `_id` as the query key. Mongoose handles the ObjectId conversion.
//         const result = await Bill.findOneAndDelete({ _id: req.params.id });
        
//         if (!result) {
//             return res.status(404).json({ message: 'Bill not found' });
//         }
//         res.status(200).json({ message: 'Bill deleted successfully' });
//     } catch (err) {
//         // Handle potential errors like invalid ObjectId format
//         console.error('Error deleting bill:', err);
//         res.status(500).json({ message: 'Error deleting bill', error: err.message });
//     }
// });

// app.listen(port, () => {
//     console.log(`Server is running on port: ${port}`);
// });
//above code without authentication!!!




const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB Connection
const uri = process.env.MONGODB_URI;
mongoose.connect(uri)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Could not connect to MongoDB Atlas:', err));

// === Schemas and Models ===

// User Schema to store email and hashed password
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

// Bill Schema with a userId field to link to the user
const billSchema = new mongoose.Schema({
  fileName: { type: String, required: true },
  mimeType: String,
  fileData: Buffer,
  text: String,
  date: String,
  invoiceNumber: String,
  createdAt: { type: Number, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});
const Bill = mongoose.model('Bill', billSchema);

// === Authentication Middleware ===
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.status(401).json({ message: 'Authorization token required.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
};

// === API Routes ===

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();
    
    const token = jwt.sign({ userId: newUser._id, email: newUser.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ message: 'User registered successfully', token, user: { userId: newUser._id, email: newUser.email } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration.', error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }
    
    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ message: 'Login successful', token, user: { userId: user._id, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.', error: err.message });
  }
});

// --- Bill Routes (Protected by Authentication) ---

// GET all bills for the authenticated user
app.get('/api/bills', authenticateToken, async (req, res) => {
  try {
    const bills = await Bill.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    console.error('Error fetching bills:', err);
    res.status(500).json({ message: 'Error fetching bills', error: err.message });
  }
});

// POST a new bill for the authenticated user
app.post('/api/bills', authenticateToken, async (req, res) => {
  try {
    const { fileName, mimeType, fileData, text, date, invoiceNumber, createdAt } = req.body;

    if (!fileData || typeof fileData !== 'string') {
      return res.status(400).json({ message: 'Invalid file data format.' });
    }

    const matches = fileData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    const base64Content = matches ? matches[2] : fileData;
    const buffer = Buffer.from(base64Content, 'base64');

    const newBill = new Bill({
      fileName,
      mimeType,
      fileData: buffer,
      text,
      date,
      invoiceNumber,
      createdAt,
      userId: req.user.userId // Use the user ID from the authenticated token
    });
    
    const savedBill = await newBill.save();
    res.status(201).json(savedBill);
  } catch (err) {
    console.error('Error saving bill:', err);
    res.status(400).json({ message: 'Error saving bill', error: err.message });
  }
});

// DELETE a bill for the authenticated user
app.delete('/api/bills/:id', authenticateToken, async (req, res) => {
  try {
    const result = await Bill.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    
    if (!result) {
      return res.status(404).json({ message: 'Bill not found or you do not have permission to delete it.' });
    }
    res.status(200).json({ message: 'Bill deleted successfully' });
  } catch (err) {
    console.error('Error deleting bill:', err);
    res.status(500).json({ message: 'Error deleting bill', error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
