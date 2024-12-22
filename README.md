<div align="center">
  <img src="public/icons/icon-512x512.png" alt="Sudan ERR Chatbot Logo" width="200"/>
  <h1>Sudan ERR Chatbot</h1>
  <p><strong>Sudan Emergency Response Rooms open-source platform for managing humanitarian funds and local interventions</strong></p>
</div>

## Overview

Emergency Response Rooms (ERR) are a community-led initiative that has played a crucial role in supplying people in Sudan with water, medical supplies and other essential resources during the conflict in that country, which began in 2023. This is a Next.js-based Web app that streamlines the reporting and interention workflows of ERRs, giving control to activists on the ground while tracking the use of donor funds. The solution is built around the F-System framework developed by ERRs to manage Group Cash Transfers. 

## F-System
https://docs.google.com/presentation/d/1ha-dEdcCJd8byRGN0-YhyuEq7OUF-H5O8hzf7VWyKWE/edit#slide=id.g3167b6ca11c_1_156
What is the F-System?
A structured process used by ERRs to ensure effective planning, approval, and documentation for all the emergency response rooms partners and 
Purpose:
Helping the ERR’s to prioritise, learn and improve the response.
Document streamlined workflows of transparent financial management.
Community engagement and accountability.
Components:
F-1: Work Plan and Budget
F-2: Project Approval
F-3: Contract of Agreement
F-4: Financial Report
F-5: Program Report

## Features

### Project Applications
- Apply for projects and grants for your community
- Review project status

### Reporting Methods
- **Form Scanning**
  - Upload and process physical forms
  - Support for documents in both Arabic and English
  - Handwritten text recognition
- **Digital Form Entry**
  - Interactive form filling interface
  - Real-time validation
  - Multi-language support

### AI-Powered Processing
- Image preprocessing 
- OCR Model
- Integration with ChatGPT
- Form validation and structured data output

### Security & Authentication
- App can be disgused as calculator to avoid unwanted attention
- ERR ID and PIN authentication
- Secure session management
- Role-based access control
- Supabase (SQL) backend integration

## User Guide

Our comprehensive user guide is available:
- [User Guide](https://drive.google.com/file/d/1Oh-ECQvXZFdZ8VL4KE61m5VzgQHZXmIJ/view?usp=drive_link)

## Demo Videos
- **Progressive Web App Download**: [Watch Video](https://drive.google.com/file/d/13CP-aRQmy_NG38Iqd0UuSMgQMQq07OXp/view?usp=drive_link)
- **Login**: [Watch Video](https://drive.google.com/file/d/1bFAZIaageTYOq96lg2ehPYkF2WlI0lZk/view?usp=drive_link)
- **Project Application F1 Form**: [Watch Video](https://drive.google.com/file/d/13CP-aRQmy_NG38Iqd0UuSMgQMQq07OXp/view?usp=drive_link)
- **Financial Reporting F4 Form**: [Watch Video](https://drive.google.com/file/d/1oxEa7l4hd0iJA5hVpeCsrYim3sITRbCs/view?usp=sharing)
- **App Feedback**: [Watch Video](https://drive.google.com/file/d/1Mga8_WIsi66m93KCMD1v0QD7kOTkajd3/view?usp=sharing)
- **Offline Form**: [Watch Video](https://drive.google.com/file/d/13CP-aRQmy_NG38Iqd0UuSMgQMQq07OXp/view?usp=drive_link)

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

## Roadmap and Challenges for developers

- Enhanced OCR model specifically trained for Arabic handwritten forms
- Improved accuracy for local dialects and writing styles
- Integration with existing OCR datasets
- F6 Workflow Implementation Community feedback collection
- Integration with Anticipatory Action triggers and funds
- Integration with wider Humanitarian and Fintech

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

This project is currently licensed under a private license for use by the Sudan Localization Coordination Council, Gisa and Local Humanitarian organizations. Unauthorized distribution or modification is prohibited. Developing plan to make project open source in Q1 2025.

## Contact

For questions or collaboration requests, please contact Santiago at santi.lema.247@gmail.com.


