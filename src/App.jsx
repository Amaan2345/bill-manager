

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import Tesseract from "tesseract.js";
// import axios from 'axios';
// import * as pdfjs from 'pdfjs-dist';
// // At the top of your App.jsx file
// import superExportsLogo from './assets/super-exports-logo.png';

// // ... inside your component's JSX

// // Define the backend API URL
// const API_URL = 'http://localhost:5000/api/bills';

// // Configure PDF.js worker with a known stable version
// pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.9.179/pdf.worker.min.js`;

// // === Utilities ===

// /**
//  * Normalizes a raw date string into the 'YYYY-MM-DD' format.
//  * @param {string} raw The raw date string from OCR.
//  * @returns {string|null} The normalized date or null if parsing fails.
//  */
// const normalizeDate = (raw) => {
//   if (!raw) return null;
//   console.log('normalizeDate: Input raw string:', raw);

//   const monthMap = {
//     jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
//     jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
//   };

//   const parts = raw.split(/[-\/.\s]/).filter(Boolean);
//   let day, month, year;

//   if (parts.length === 3) {
//     let [p1, p2, p3] = parts;

//     if (p1.length === 4) { [year, month, day] = [p1, p2, p3]; }
//     else if (p3.length === 4) { [day, month, year] = [p1, p2, p3]; }
//     else if (p3.length === 2) {
//       day = p1;
//       month = p2;
//       year = `20${p3}`;
//     }
//   }

//   if (month && isNaN(parseInt(month))) {
//     const monthKey = month.toLowerCase().substring(0, 3);
//     month = monthMap[monthKey];
//   } else if (month) {
//     month = String(month).padStart(2, '0');
//   }

//   if (!day || !month || !year) {
//     console.log('normalizeDate: Failed to parse all date parts.');
//     return null;
//   }

//   const normalizedDate = `${year}-${month}-${String(day).padStart(2, '0')}`;
//   console.log('normalizeDate: Normalized date:', normalizedDate);
//   return normalizedDate;
// };

// /**
//  * Extracts key fields (invoice number, date) from OCR text.
//  * @param {string} text The full OCR text.
//  * @returns {object} An object with extracted fields.
//  */
// const extractFields = (text) => {
//   let rawDate = null;
//   let invoiceNumber = null;
  
//   console.log('--- Starting OCR field extraction ---');
//   console.log('Raw OCR Text:');
//   console.log(text);
//   console.log('-------------------------------------');

//   const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

//   // --- Invoice Number Extraction ---
//   const invLabelRegexes = [
//     /(?:invoice\s*no\.?|invoice\s*number|inv\s*no\.?|ar\s*no\.?|ref\s*no\.?)\s*[:#-]?\s*([A-Z0-9\/\.-]{2,})/i,
//     /invoice\s+([A-Z0-9\/\.-]{2,})/i,
//   ];

//   for (const r of invLabelRegexes) {
//     const m = text.match(r);
//     if (m) {
//       invoiceNumber = m[1].replace(/[^A-Z0-9/\.-]/gi, "");
//       break;
//     }
//   }

//   if (!invoiceNumber) {
//     const invLineIndex = lines.findIndex(line => line.toLowerCase().includes('invoice'));
//     if (invLineIndex !== -1) {
//       const currentLine = lines[invLineIndex];
//       let m = currentLine.match(/\b([A-Z0-9\/\.-]{2,})\b/i);
//       if (m && m[1].toLowerCase() !== 'invoice') {
//         invoiceNumber = m[1];
//       }
//       if (!invoiceNumber && lines[invLineIndex + 1]) {
//         m = lines[invLineIndex + 1].match(/\b([A-Z0-9\/\.-]{2,})\b/i);
//         if (m) {
//           invoiceNumber = m[1];
//         }
//       }
//     }
//   }

//   // --- Date Extraction ---
//   const dateRegexes = [
//     /(?:date|invoice\s*date|inv\s*date)\s*[:\-]?\s*([0-9]{1,2}[-\/\.](?:[a-zA-Z]{3,}|[0-9]{1,2})[-\/\.][0-9]{2,4})/i,
//     /\b([0-9]{1,2}[-\/\.](?:[a-zA-Z]{3,9}|[0-9]{1,2})[-\/\.][0-9]{2,4})\b/i,
//     /\b([0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{4})\b/i,
//   ];

//   for (const r of dateRegexes) {
//     const m = text.match(r);
//     if (m) {
//       rawDate = m[1];
//       break;
//     }
//   }

//   console.log('Extracted raw date string:', rawDate);
//   console.log('Extracted invoice number:', invoiceNumber);

//   return {
//     date: normalizeDate(rawDate),
//     invoiceNumber: invoiceNumber || null,
//   };
// };

// /**
//  * New helper function to read the file as a Base64 Data URL.
//  * @param {File} file The file to read.
//  * @returns {Promise<string>} A promise that resolves with the Data URL.
//  */
// const readFileAsDataURL = (file) =>
//   new Promise((resolve, reject) => {
//     const fr = new FileReader();
//     fr.onload = () => resolve(fr.result);
//     fr.onerror = reject;
//     fr.readAsDataURL(file);
//   });

// /**
//  * Renders the first page of a PDF file to an image blob.
//  * @param {File} file The PDF file to process.
//  * @returns {Promise<Blob>} A promise that resolves with the image Blob.
//  */
// const processPdfPageToImage = async (file) => {
//   const fileReader = new FileReader();
//   return new Promise((resolve, reject) => {
//     fileReader.onload = async () => {
//       try {
//         const typedArray = new Uint8Array(fileReader.result);
//         const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
//         const page = await pdf.getPage(1);
//         const viewport = page.getViewport({ scale: 2 });
//         const canvas = document.createElement('canvas');
//         const canvasContext = canvas.getContext('2d');
//         canvas.height = viewport.height;
//         canvas.width = viewport.width;

//         await page.render({ canvasContext, viewport }).promise;
        
//         canvas.toBlob((blob) => {
//           resolve(blob);
//         }, 'image/png');

//       } catch (error) {
//         reject(error);
//       }
//     };
//     fileReader.onerror = reject;
//     fileReader.readAsArrayBuffer(file);
//   });
// };

// // === UI ===
// export default function BillScannerApp() {
//   const [bills, setBills] = useState([]);
//   const [status, setStatus] = useState("");
//   const [searchDate, setSearchDate] = useState("");
//   const [searchInv, setSearchInv] = useState("");
//   const [busy, setBusy] = useState(false);
//   const inputRef = useRef(null);
//   const [searchCompany, setSearchCompany] = useState("");
//   const [searchFileName, setSearchFileName] = useState(""); // New state for file name search

//   useEffect(() => {
//     const fetchBills = async () => {
//       try {
//         const response = await axios.get(API_URL);
//         // The data is already sorted by the backend
//         setBills(response.data);
//       } catch (error) {
//         console.error("Error fetching bills:", error);
//         setStatus("Failed to load bills.");
//       }
//     };
//     fetchBills();
//   }, []);

//   const filtered = useMemo(() => {
//     const lowerSearchInv = (searchInv || "").toLowerCase();
//     const lowerSearchCompany = (searchCompany || "").toLowerCase();
//     const lowerSearchFileName = (searchFileName || "").toLowerCase();

//     return bills
//       .filter((b) => {
//         const dateOk = !searchDate || b.date === searchDate;
//         const invOk = !searchInv || (b.invoiceNumber || "").toLowerCase().includes(lowerSearchInv);
//         const compOk = !searchCompany || (b.text || "").toLowerCase().includes(lowerSearchCompany);
//         const fileNameOk = !searchFileName || (b.fileName || "").toLowerCase().includes(lowerSearchFileName);
        
//         return dateOk && invOk && compOk && fileNameOk;
//       })
//       .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
//   }, [bills, searchDate, searchInv, searchCompany, searchFileName]);


//   const handleFiles = async (files) => {
//     if (!files?.length) return;

//     for (const file of files) {
//       if (!/^image\/(png|jpeg|webp)$/.test(file.type) && file.type !== 'application/pdf') {
//         alert("Only image files (JPG/PNG/WEBP) and PDFs are supported.");
//         continue;
//       }
//       setBusy(true);
//       setStatus(`Scanning: ${file.name}`);

//       try {
//         let fileToProcess = file;
//         let isPdf = false;

//         if (file.type === 'application/pdf') {
//           isPdf = true;
//           // Process the first page of the PDF to an image for Tesseract
//           fileToProcess = await processPdfPageToImage(file);
//           setStatus(`Converting PDF page to image...`);
//         }

//         const { data } = await Tesseract.recognize(fileToProcess, "eng", {
//           logger: (m) => {
//             if (m.status === "recognizing text") setStatus(`OCR ${(m.progress * 100).toFixed(0)}% - ${file.name}`);
//           },
//         });

//         const fields = extractFields(data.text || "");
//         const base64Data = await readFileAsDataURL(file);

//         const bill = {
//           fileName: file.name,
//           mimeType: file.type,
//           fileData: base64Data, // Store the original file data
//           text: data.text,
//           ...fields,
//           createdAt: Date.now(),
//         };

//         console.log('Final bill object to be saved:', bill);

//         const response = await axios.post(API_URL, bill);
//         setBills((prev) => [response.data, ...prev]);
//         setStatus(`Saved: ${file.name}`);

//       } catch (e) {
//         console.error(e);
//         setStatus(`Failed to process ${file.name}: ${e.message}`);
//       } finally {
//         setBusy(false);
//         setTimeout(() => setStatus(""), 3000);
//       }
//     }
//     if (inputRef.current) inputRef.current.value = "";
//   };

//   const onDrop = (e) => {
//     e.preventDefault();
//     handleFiles(Array.from(e.dataTransfer.files || []));
//   };

//   /**
//    * Correctly creates a Blob URL for display from the Mongoose buffer object.
//    * @param {object} bill The bill object from MongoDB.
//    * @returns {string|null} The object URL for the image or null on failure.
//    */
//   const createObjectURL = (bill) => {
//     try {
//       if (!bill.fileData || !bill.fileData.data) {
//         return null;
//       }
//       const buffer = bill.fileData.data;
//       const blob = new Blob([new Uint8Array(buffer)], { type: bill.mimeType || "application/octet-stream" });
//       return URL.createObjectURL(blob);
//     } catch (e) {
//       console.error("Error creating object URL:", e);
//       return null;
//     }
//   };

//   const removeBill = async (id) => {
//     if (!window.confirm("Delete this bill?")) return;
//     try {
//       await axios.delete(`${API_URL}/${id}`);
//       setBills((prev) => prev.filter((b) => b._id !== id));
//     } catch (error) {
//       console.error("Error deleting bill:", error);
//       setStatus("Failed to delete bill.");
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
//       <div className="max-w-5xl mx-auto">
//         <header className="mb-6 flex items-center justify-between">
//           <h1 className="text-2xl md:text-3xl font-bold">Super Exports</h1>
      
//           <div className="text-sm text-gray-500">
//           </div>
//         </header>

//         <section
//           onDragOver={(e) => e.preventDefault()}
//           onDrop={onDrop}
//           className={`border-2 wrapper border-dashed rounded-2xl p-6 md:p-10 bg-white shadow-sm ${busy ? "opacity-70" : ""}`}
//         >
//           <div className="flex flex-col items-center gap-4">
//             <div className="text-center">
//               <div className="text-xl font-semibold">Upload your bill image or PDF</div>
//               <div className="text-sm text-gray-500">JPEG/PNG/WEBP/PDF</div>
//             </div>
//             <div className="flex gap-3">
//               <button
//                 onClick={() => inputRef.current?.click()}
//                 disabled={busy}
//                 className="px-4 py-2 rounded-2xl bg-black text-white shadow hover:opacity-90 disabled:opacity-40"
//               >
//                 Choose File
//               </button>
//               <input
//                 ref={inputRef}
//                 type="file"
//                 accept="image/*, application/pdf"
//                 multiple
//                 hidden
//                 onChange={(e) => handleFiles(Array.from(e.target.files || []))}
//               />
//             </div>
//             <div className="text-xs text-gray-600">or drag & drop here</div>
//             {status && <div className="mt-2 text-sm font-medium">{status}</div>}
//           </div>
//         </section>

//         <section className="mt-8 bg-white rounded-2xl shadow-sm p-5 filterss">
//           <div className="grid md:grid-cols-4 gap-3 items-end">
//             <div>
//               <label className="text-sm text-gray-600">Search by Date</label>
//               <input
//                 type="date"
//                 value={searchDate}
//                 onChange={(e) => setSearchDate(e.target.value)}
//                 className="w-full mt-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring"
//               />
//             </div>
//             {/* <div>
//               <label className="text-sm text-gray-600">Search by Invoice Number</label>
//               <input
//                 type="text"
//                 value={searchInv}
//                 onChange={(e) => setSearchInv(e.target.value)}
//                 placeholder="e.g., AR25263/302973"
//                 className="w-full mt-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring"
//               />
//             </div> */}
//             <div>
//               <label className="text-sm text-gray-600">Search by Company</label>
//               <input
//                 type="text"
//                 value={searchCompany}
//                 onChange={(e) => setSearchCompany(e.target.value)}
//                 placeholder="e.g., Mitsu Chem"
//                 className="w-full mt-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring"
//               />
//             </div>
//             <div>
//               <label className="text-sm text-gray-600">Search by File Name</label>
//               <input
//                 type="text"
//                 value={searchFileName}
//                 onChange={(e) => setSearchFileName(e.target.value)}
//                 placeholder="e.g., invoice_2023.pdf"
//                 className="w-full mt-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring"
//               />
//             </div>
//             <div className="flex gap-3 md:col-span-4 justify-end">
//               <button
//                 onClick={() => {
//                   setSearchDate("");
//                   setSearchInv("");
//                   setSearchCompany("");
//                   setSearchFileName(""); // New reset for file name
//                 }}
//                 className="px-4 py-2 rounded-2xl border"
//               >
//                 Clear Filters
//               </button>
//             </div>
//           </div>
//         </section>

//         <section className="mt-6 bills-wrapper">
//           {filtered.length === 0 ? (
//             <div className="text-center text-gray-500 py-10 bg-white rounded-2xl border">
//               No bills found.
//             </div>
//           ) : (
//             <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 bills-data">
//               {filtered.map((b) => {
//                 const url = createObjectURL(b);
//                 const isPdf = b.mimeType === 'application/pdf';
//                 const displayCompanyName = searchCompany;
//                 return (
//                   <li key={b._id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
//                     <div className="aspect-video bg-gray-100 flex items-center justify-center">
//                       {isPdf ? (
//                         <div className="text-center">
//                           <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#dc2626" className="w-16 h-16 mx-auto">
//                             <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
//                             <polyline points="14 2 14 8 20 8" />
//                           </svg>
//                           <div className="text-sm text-gray-500 mt-2">PDF Document</div>
//                         </div>
//                       ) : url ? (
//                         <img src={url} alt={b.fileName} className="w-full h-full object-contain" />
//                       ) : (
//                         <div className="text-sm text-gray-500 p-6">Preview unavailable</div>
//                       )}
//                     </div>
//                     <div className="p-4 space-y-2">
//                       <div className="font-semibold text-sm break-all">{b.fileName}</div>
//                       <div className="text-sm">Date: <span className="font-medium">{b.date || "(not found)"}</span></div>
//                       <div className="text-sm">Invoice #: <span className="font-medium">{b.invoiceNumber || "(not found)"}</span></div>
//                       {searchCompany && (
//                         <div className="text-sm">
//                           Company: <span className="font-medium">{displayCompanyName}</span>
//                         </div>
//                       )}
//                       <div className="flex gap-2 pt-2">
//                         {url && (
//                           <a href={url} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-sm rounded-xl bg-black text-white">
//                             View {isPdf ? 'PDF' : 'Image'}
//                           </a>
//                         )}
//                         {/* <button
//                           onClick={() => navigator.clipboard.writeText(b.text || "")}
//                           className="px-3 py-1.5 text-sm rounded-xl border"
//                         >
//                           Copy OCR Text
//                         </button> */}
//                         <button
//                           onClick={() => removeBill(b._id)}
//                           className="px-3 py-1.5 text-sm rounded-xl border text-red-600"
//                         >
//                           Delete
//                         </button>
//                       </div>
//                     </div>
//                   </li>
//                 );
//               })}
//             </ul>
//           )}
//         </section>
//       </div>
//           <footer>
//         <p>&copy; 2025 Super Exports. All rights reserved.</p>
//     </footer>
//     </div>

//   );
// }
//up code is without authentication



import React, { useEffect, useMemo, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import axios from 'axios';
import * as pdfjs from 'pdfjs-dist';

// Define the backend API URL. This is a placeholder and should point to your live server.
const API_URL = 'https://bill-manager-api.onrender.com';

// Configure PDF.js worker with a known stable version
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// === Utilities ===

/**
 * Normalizes a raw date string into the 'YYYY-MM-DD' format.
 * @param {string} raw The raw date string from OCR.
 * @returns {string|null} The normalized date or null if parsing fails.
 */
const normalizeDate = (raw) => {
  if (!raw) return null;
  console.log('normalizeDate: Input raw string:', raw);

  const monthMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  const parts = raw.split(/[-\/.\s]/).filter(Boolean);
  let day, month, year;

  if (parts.length === 3) {
    let [p1, p2, p3] = parts;

    if (p1.length === 4) { [year, month, day] = [p1, p2, p3]; }
    else if (p3.length === 4) { [day, month, year] = [p1, p2, p3]; }
    else if (p3.length === 2) {
      day = p1;
      month = p2;
      year = `20${p3}`;
    }
  }

  if (month && isNaN(parseInt(month))) {
    const monthKey = month.toLowerCase().substring(0, 3);
    month = monthMap[monthKey];
  } else if (month) {
    month = String(month).padStart(2, '0');
  }

  if (!day || !month || !year) {
    console.log('normalizeDate: Failed to parse all date parts.');
    return null;
  }

  const normalizedDate = `${year}-${month}-${String(day).padStart(2, '0')}`;
  console.log('normalizeDate: Normalized date:', normalizedDate);
  return normalizedDate;
};

/**
 * Extracts key fields (invoice number, date) from OCR text.
 * @param {string} text The full OCR text.
 * @returns {object} An object with extracted fields.
 */
const extractFields = (text) => {
  let rawDate = null;
  let invoiceNumber = null;
  
  console.log('--- Starting OCR field extraction ---');
  console.log('Raw OCR Text:');
  console.log(text);
  console.log('-------------------------------------');

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // --- Invoice Number Extraction ---
  const invLabelRegexes = [
    /(?:invoice\s*no\.?|invoice\s*number|inv\s*no\.?|ar\s*no\.?|ref\s*no\.?)\s*[:#-]?\s*([A-Z0-9\/\.-]{2,})/i,
    /invoice\s+([A-Z0-9\/\.-]{2,})/i,
  ];

  for (const r of invLabelRegexes) {
    const m = text.match(r);
    if (m) {
      invoiceNumber = m[1].replace(/[^A-Z0-9/\.-]/gi, "");
      break;
    }
  }

  if (!invoiceNumber) {
    const invLineIndex = lines.findIndex(line => line.toLowerCase().includes('invoice'));
    if (invLineIndex !== -1) {
      const currentLine = lines[invLineIndex];
      let m = currentLine.match(/\b([A-Z0-9\/\.-]{2,})\b/i);
      if (m && m[1].toLowerCase() !== 'invoice') {
        invoiceNumber = m[1];
      }
      if (!invoiceNumber && lines[invLineIndex + 1]) {
        m = lines[invLineIndex + 1].match(/\b([A-Z0-9\/\.-]{2,})\b/i);
        if (m) {
          invoiceNumber = m[1];
        }
      }
    }
  }

  // --- Date Extraction ---
  const dateRegexes = [
    /(?:date|invoice\s*date|inv\s*date)\s*[:\-]?\s*([0-9]{1,2}[-\/\.](?:[a-zA-Z]{3,}|[0-9]{1,2})[-\/\.][0-9]{2,4})/i,
    /\b([0-9]{1,2}[-\/\.](?:[a-zA-Z]{3,9}|[0-9]{1,2})[-\/\.][0-9]{2,4})\b/i,
    /\b([0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{4})\b/i,
  ];

  for (const r of dateRegexes) {
    const m = text.match(r);
    if (m) {
      rawDate = m[1];
      break;
    }
  }

  console.log('Extracted raw date string:', rawDate);
  console.log('Extracted invoice number:', invoiceNumber);

  return {
    date: normalizeDate(rawDate),
    invoiceNumber: invoiceNumber || null,
  };
};

/**
 * New helper function to read the file as a Base64 Data URL.
 * @param {File} file The file to read.
 * @returns {Promise<string>} A promise that resolves with the Data URL.
 */
const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

/**
 * Renders the first page of a PDF file to an image blob.
 * @param {File} file The PDF file to process.
 * @returns {Promise<Blob>} A promise that resolves with the image Blob.
 */
const processPdfPageToImage = async (file) => {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onload = async () => {
      try {
        const typedArray = new Uint8Array(fileReader.result);
        const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const canvasContext = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext, viewport }).promise;
        
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');

      } catch (error) {
        reject(error);
      }
    };
    fileReader.onerror = reject;
    fileReader.readAsArrayBuffer(file);
  });
};

// === AuthForm Component ===
const AuthForm = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await axios.post(`${API_URL}${endpoint}`, { email, password });
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      onAuthSuccess(user);
      
    } catch (e) {
      console.error("Auth error:", e.response ? e.response.data : e);
      setError(e.response?.data?.message || `Failed to ${isLogin ? 'log in' : 'create account'}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md loginn">
        <h2 className="text-2xl font-bold text-center mb-6">
          {isLogin ? 'Log In' : 'Create Account'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};

// === BillScannerApp Component ===
const BillScannerApp = ({ user, onLogout }) => {
  const [bills, setBills] = useState([]);
  const [status, setStatus] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchInv, setSearchInv] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);
  const [searchCompany, setSearchCompany] = useState("");
  const [searchFileName, setSearchFileName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/api/bills`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBills(response.data);
      } catch (error) {
        console.error("Error fetching bills:", error);
        setStatus("Failed to load bills. Please log in again.");
      }
    };
    fetchBills();
  }, [user]);

  const filtered = useMemo(() => {
    const lowerSearchInv = (searchInv || "").toLowerCase();
    const lowerSearchCompany = (searchCompany || "").toLowerCase();
    const lowerSearchFileName = (searchFileName || "").toLowerCase();

    return bills
      .filter((b) => {
        const dateOk = !searchDate || b.date === searchDate;
        const invOk = !searchInv || (b.invoiceNumber || "").toLowerCase().includes(lowerSearchInv);
        const compOk = !searchCompany || (b.text || "").toLowerCase().includes(lowerSearchCompany);
        const fileNameOk = !searchFileName || (b.fileName || "").toLowerCase().includes(lowerSearchFileName);
        
        return dateOk && invOk && compOk && fileNameOk;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [bills, searchDate, searchInv, searchCompany, searchFileName]);

  const handleFiles = async (files) => {
    if (!files?.length) return;

    for (const file of files) {
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) && file.type !== 'application/pdf') {
        alert("Only image files (JPG/PNG/WEBP) and PDFs are supported.");
        continue;
      }
      setBusy(true);
      // setStatus(`Scanning: ${file.name}`);

      try {
        let fileToProcess = file;

        if (file.type === 'application/pdf') {
          setStatus(`Converting PDF page to image...`);
          fileToProcess = await processPdfPageToImage(file);
        }

        const { data } = await Tesseract.recognize(fileToProcess, "eng", {
          logger: (m) => {
            if (m.status === "recognizing text") setStatus(`OCR ${(m.progress * 100).toFixed(0)}%`);
          },
        });

        const fields = extractFields(data.text || "");
        const base64Data = await readFileAsDataURL(file);

        const token = localStorage.getItem('token');
        const bill = {
          fileName: file.name,
          mimeType: file.type,
          fileData: base64Data,
          text: data.text,
          ...fields,
          createdAt: Date.now(),
        };

        console.log('Final bill object to be saved:', bill);

        const response = await axios.post(`${API_URL}/api/bills`, bill, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBills((prev) => [response.data, ...prev]);
        setStatus(`File Saved successfully`);

      } catch (e) {
        console.error(e);
        setStatus(`Failed to process ${file.name}: ${e.response?.data?.message || e.message}`);
      } finally {
        setBusy(false);
        setTimeout(() => setStatus(""), 3000);
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles(Array.from(e.dataTransfer.files || []));
  };

  /**
   * Correctly creates a Blob URL for display from the Mongoose buffer object.
   * @param {object} bill The bill object from MongoDB.
   * @returns {string|null} The object URL for the image or null on failure.
   */
  const createObjectURL = (bill) => {
    try {
      if (!bill.fileData || !bill.fileData.data) {
        return null;
      }
      const buffer = bill.fileData.data;
      const blob = new Blob([new Uint8Array(buffer)], { type: bill.mimeType || "application/octet-stream" });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.error("Error creating object URL:", e);
      return null;
    }
  };

  const removeBill = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/bills/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBills((prev) => prev.filter((b) => b._id !== id));
      setShowDeleteModal(false);
      setBillToDelete(null);
    } catch (error) {
      console.error("Error deleting bill:", error);
      setStatus("Failed to delete bill.");
    }
  };

  const handleDeleteClick = (bill) => {
    setBillToDelete(bill);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (billToDelete) {
      removeBill(billToDelete._id);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setBillToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 delete-card">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Confirm Delete</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this bill?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* <img src={superExportsLogo} alt="Super Exports Logo" className="w-10 h-10" /> */}
            <h1 className="text-2xl md:text-3xl font-bold">Super Exports</h1>
          </div>
          <div className="flex items-center gap-4 logoutt">
            <span className="text-sm text-gray-600">
              Welcome, {user.email}!
            </span>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-2xl bg-black text-white shadow hover:opacity-90"
            >
              Logout
            </button>
          </div>
        </header>

        <section
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`border-2 wrapper border-dashed rounded-2xl p-6 md:p-10 bg-white shadow-sm ${busy ? "opacity-70" : ""}`}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="text-center">
              <div className="text-xl font-semibold">Upload your bill image or PDF</div>
              <div className="text-sm text-gray-500">JPEG/PNG/WEBP/PDF</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="px-4 py-2 rounded-2xl bg-black text-white shadow hover:opacity-90 disabled:opacity-40"
              >
                Choose File
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*, application/pdf"
                multiple
                hidden
                onChange={(e) => handleFiles(Array.from(e.target.files || []))}
              />
            </div>
            <div className="text-xs text-gray-600">or drag & drop here</div>
            {status && <div className="mt-2 text-sm font-medium insert-docs">{status}</div>}
          </div>
        </section>

        <section className="mt-8 bg-white rounded-2xl shadow-sm p-5 filterss">
          <div className="grid md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-sm text-gray-600">Search by Date</label>
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring"
              />
            </div>
            {/* <div>
              <label className="text-sm text-gray-600">Search by Invoice Number</label>
              <input
                type="text"
                value={searchInv}
                onChange={(e) => setSearchInv(e.target.value)}
                placeholder="e.g., AR25263/302973"
                className="w-full mt-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring"
              />
            </div> */}
            <div>
              <label className="text-sm text-gray-600">Search by Company</label>
              <input
                type="text"
                value={searchCompany}
                onChange={(e) => setSearchCompany(e.target.value)}
                placeholder="e.g., Mitsu Chem"
                className="w-full mt-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Search by PDF Name</label>
              <input
                type="text"
                value={searchFileName}
                onChange={(e) => setSearchFileName(e.target.value)}
                placeholder="e.g., invoice_2023.pdf"
                className="w-full mt-1 px-3 py-2 border rounded-xl focus:outline-none focus:ring"
              />
            </div>
            <div className="flex gap-3 md:col-span-4 justify-end">
              <button
                onClick={() => {
                  setSearchDate("");
                  setSearchInv("");
                  setSearchCompany("");
                  setSearchFileName("");
                }}
                className="px-4 py-2 rounded-2xl border"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 bills-wrapper">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-10 bg-white rounded-2xl border">
              No bills found.
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 bills-data">
              {filtered.map((b) => {
                const url = createObjectURL(b);
                const isPdf = b.mimeType === 'application/pdf';
                const displayCompanyName = searchCompany;
                return (
                  <li key={b._id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      {isPdf ? (
                        <div className="text-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="#dc2626" className="w-16 h-16 mx-auto">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          <div className="text-sm text-gray-500 mt-2">PDF Document</div>
                        </div>
                      ) : url ? (
                        <img src={url} alt={b.fileName} className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-sm text-gray-500 p-6">Preview unavailable</div>
                      )}
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="font-semibold text-sm break-all">{b.fileName}</div>
                      <div className="text-sm">Date: <span className="font-medium">{b.date || "(not found)"}</span></div>
                      <div className="text-sm">Invoice #: <span className="font-medium">{b.invoiceNumber || "(not found)"}</span></div>
                      {searchCompany && (
                        <div className="text-sm">
                          Company: <span className="font-medium">{displayCompanyName}</span>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-sm rounded-xl bg-black text-white">
                            View {isPdf ? 'PDF' : 'Image'}
                          </a>
                        )}
                        {/* <button
                          onClick={() => navigator.clipboard.writeText(b.text || "")}
                          className="px-3 py-1.5 text-sm rounded-xl border"
                        >
                          Copy OCR Text
                        </button> */}
                        <button
                          onClick={() => handleDeleteClick(b)}
                          className="px-3 py-1.5 text-sm rounded-xl border text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      <footer>
        <p className="mt-8 text-center text-gray-500 text-sm">&copy; 2025 Super Exports. All rights reserved.</p>
      </footer>
    </div>
  );
};

// === Main App Component ===
export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleAuthSuccess = (userData) => {
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token'); // Also remove the JWT token
    setUser(null);
  };

  if (!user) {
    return <AuthForm onAuthSuccess={handleAuthSuccess} />;
  }

  return <BillScannerApp user={user} onLogout={handleLogout} />;
}
  