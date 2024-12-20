<div align="center">
  <img src="public/icons/icon-512x512.png" alt="Sudan ERR Chatbot Logo" width="200"/>
  <h1>Sudan ERR Chatbot</h1>
  <p><strong>Financial Report Management System for Humanitarian Aid</strong></p>
</div>

## Overview

A Next.js-based chatbot application designed to streamline financial reporting for humanitarian organizations in Sudan. The system combines intelligent form processing with an intuitive interface to simplify report management.

## Features

### Reporting Methods
- **Form Scanning**
  - Upload and process physical forms
  - Support for both Arabic and English documents
  - Handwritten text recognition
- **Digital Form Entry**
  - Interactive form filling interface
  - Real-time validation
  - Multi-language support

### AI-Powered Processing
- Image preprocessing 
- OCR Model
- Integration with OpenAI
- Form validation and structured data output

### Security & Authentication
- ERR ID and PIN authentication
- Secure session management
- Role-based access control
- Supabase backend integration

## User Guide

Our comprehensive user guide is available in both English and Arabic:
- [English User Guide (PDF)](public/guides/user-guide-en.pdf)


## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Next.js API Routes
- **Image Processing**: 
  - Sharp for optimization
  - OpenCV Python for preprocessing
- **AI/ML**:
  - Google Cloud Vision OCR
  - OpenAI GPT
- **Database**: Supabase
- **Authentication**: Custom session-based

## Quick Start

1. Clone the repository:
```
git clone https://github.com/yourusername/sudan-err-chatbot.git
```

2. Install dependencies:
```
npm install
```

3. Configure environment variables:
```
OPENAI_API_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
```

4. Run development server:
```
npm run dev
```

## API Endpoints

- `/api/login` - Handles user authentication using ERR ID and PIN for secure access.
- `/api/offline-mode` - Handles form submissions in offline mode.
- `/api/scan-form` - Processes uploaded forms using OCR and AI to extract and validate data.
- `/api/scan-custom-form` - Processes custom forms with specific metadata and OCR.
- `/api/submit-feedback` - Collects community feedback to improve the chatbot and reporting system.
- `/api/project-application` - Manages project application submissions.
- `/api/project-status` - Retrieves the status of submitted project applications.
- `/api/fill-form` - Handles the submission of filled forms with structured data.

## Roadmap

### Q2-Q3 2024
- Enhanced OCR model specifically trained for Arabic handwritten forms
- Improved accuracy for local dialects and writing styles
- Integration with existing OCR datasets

### Q3-Q4 2024
- F6 Workflow Implementation
  - Community feedback collection
  - Iterative improvement system
  - Impact measurement tools

### 2025 and Beyond
- Integration with Humanitarian Tech
  - Connection with OCHA's HPC tools
  - Integration with ActivityInfo
  - Compatibility with HDX data standards

## Development

```
# Lint code
npm run lint

# Build project
npm run build

# Run tests
npm run test
```

## Production Deployment

1. Build the project:
```
npm run build
```

2. Start production server:
```
npm run start
```

## License

This project is currently licensed under a private license for use by the Sudan Localization Coordination Council and Local Humanitarian organizations. Unauthorized distribution or modification is prohibited.

## Contact

For questions or collaboration requests, please contact Santiago at santi.lema.247@gmail.com.
