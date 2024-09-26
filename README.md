## Sudan ERR Chatbot

**[Sudan ERR Chatbot]**  
Soltuion tp simplify and automate reporting for humanitarian projects. Currently, the solution is in a private development phase, shared with a small group of partners for collaboration and feedback.

---

### Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Requirements](#requirements)
4. [Installation](#installation)
5. [Usage](#usage)
6. [Configuration](#configuration)
7. [Development](#development)
8. [License](#license)
9. [Contact](#contact)

---

### 1. Overview

**[Sudan Err Chatbo]** aims to simplify and automate reporting for humanitarian projects. Currently, the solution is in a private development phase, shared with a small group of partners for collaboration and feedback.

---

### 2. Features

- **Form Scanning:** Automatically scans and processes financial forms.
- **Data Extraction:** Extracts structured data using Google Vision OCR and GPT classification.
- **Reporting:** Generates financial reports from scanned data and stores them in Google Sheets.
- **Integration with Google Cloud:** Securely stores files and data on Google Cloud Storage and Google Sheets.
- **Twilio Integration:** Supports notifications and messaging via Twilio.

---

### 3. Requirements

To run the project, you will need the following dependencies:

- Python 3.9+
- Flask
- Google Cloud Vision API
- OpenAI API
- Twilio API
- Google Sheets API via gspread
- Other dependencies listed in `requirements.txt`

---

### 4. Installation

To set up the project locally:

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/yourproject.git

2. Navigate to the project directory:

bash
Copy code
cd yourproject
3. Install the required Python packages:

bash
Copy code
pip install -r requirements.txt

4. Create a .env file in the root directory based on the provided .env.example file and add the required API keys and credentials (see Configuration for details).

5. Run the application:

bash
Copy code
flask run

### 5. Usage

Once the application is running:

Open your browser and go to http://localhost:5000.
Log in using your provided credentials.
Upload financial report forms for scanning or interact with the chatbot for assistance.
Generated reports will automatically be stored in Google Sheets and can be accessed via the Google Sheets link in the dashboard.

### 6. Usage
6. Configuration
You'll need to set up environment variables in a .env file for proper functionality. Need to define with group on project keys to use. 


### 7. Development

For contributing to the project, follow these steps:

Create a new branch for each feature or bug fix:

bash
Copy code
git checkout -b feature/your-feature
Push your branch to the remote repository and create a pull request:

bash
Copy code
git push origin feature/your-feature
Make sure your pull requests are well-documented and include clear descriptions of the changes.

Ensure that all changes are tested locally before submitting.

### 8. License

This project is currently licensed under a private license. Access to this repository is restricted to approved collaborators, and unauthorized use, distribution, or modification of the code is prohibited. This license may change when the project is made open-source.

### 9. Contact
For any questions, issues, or collaboration requests, please contact Santiago at santi.lema.247@gmail.com
