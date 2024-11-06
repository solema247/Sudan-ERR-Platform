Sudan ERR Chatbot - Financial Report Management System

A Next.js-based chatbot application designed to process and manage financial reports through form scanning and data extraction.

FEATURES
--------
* Dual Reporting Methods:
  - Form Scanning: Upload and process physical forms
  - Digital Form Filling: Direct data entry option

* Advanced Document Processing:
  - Image preprocessing using OpenCV
  - OCR using Google Cloud Vision API
  - Intelligent text extraction and structuring using OpenAI GPT
  - Form data validation and processing

* Security:
  - User authentication with ERR ID and PIN
  - Secure session management
  - Integration with Supabase backend

TECH STACK
----------
* Frontend: Next.js, React, TypeScript
* Backend: Next.js API Routes
* Image Processing: 
  - Sharp for image optimization
  - OpenCV Python for preprocessing
* AI/ML:
  - Google Cloud Vision for OCR
  - OpenAI GPT for text processing
* Database: Supabase
* Authentication: Custom session-based auth

SETUP
-----
1. Clone the repository
2. Install dependencies:
   npm install

3. Configure environment variables:
   OPENAI_API_KEY=your_key
   SUPABASE_URL=your_url
   SUPABASE_SERVICE_KEY=your_key

4. Run the development server:
   npm run dev

API ENDPOINTS
------------
* /api/login: User authentication
* /api/scan-form: Form scanning and processing
* Additional endpoints for form management

DEVELOPMENT
-----------
The project uses Next.js and TypeScript. To maintain code quality:
npm run lint
npm run build

PRODUCTION DEPLOYMENT
--------------------
For production deployment:
1. Build the project:
   npm run build

2. Start the production server:
   npm run start

LICENSE
-------

This project is currently licensed under a private license for use by the Sudan Localization Coordination Council and Local Humanitarian organizations. Unauthorized distribution or modification is prohibited.


CONTACT
-------
For questions or collaboration requests, please contact Santiago at santi.lema.247@gmail.com.