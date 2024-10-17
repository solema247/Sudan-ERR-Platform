# Sudan ERR Chatbot

## Overview
Sudan ERR Chatbot is a solution designed to simplify and automate reporting for humanitarian projects. It is currently in a private development phase, shared with a small group of partners for collaboration and feedback.

## Features
- **Form Scanning**: Automatically scans and processes financial forms.
- **Data Extraction**: Uses Google Vision OCR and GPT classification to extract structured data.
- **Reporting**: Generates and stores financial reports in Supabase.
- **Integration**: Secure integration with Google Cloud for file storage, with notifications via Twilio.

## Requirements
- Python 3.9+
- FastAPI
- Redis
- Google Vision API
- OpenAI API
- Twilio API
- Supabase
- Other dependencies listed in `requirements.txt`

## Installation
1. Clone this repository:
   ```
   git clone https://github.com/yourusername/yourproject.git
   ```
2. Navigate to the project directory:
   ```
   cd yourproject
   ```
3. Install the required Python packages:
   ```
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the root directory based on `.env.example` and add required API keys and credentials.
5. Run the application:
   ```
   uvicorn main:app --reload
   ```

## Usage
1. Start the application and open your browser at `http://localhost:8000`.
2. Log in using provided credentials.
3. Upload financial report forms for scanning or interact with the chatbot for assistance.
4. Generated reports will be stored in Supabase and accessible through the dashboard.

## Configuration
Ensure that environment variables are set up in a `.env` file for proper functionality, with appropriate API keys and credentials.

## Development
- Create a new branch for each feature or bug fix:
  ```
  git checkout -b feature/your-feature
  ```
- Push your branch to the remote repository and create a pull request:
  ```
  git push origin feature/your-feature
  ```
- Make sure pull requests are well-documented and tested locally before submission.

## License
This project is currently licensed under a private license for use by the Sudan Localization Coordination Council and Local Humanitarian organizations. Unauthorized distribution or modification is prohibited.

## Contact
For questions or collaboration requests, please contact Santiago at [santi.lema.247@gmail.com](mailto:santi.lema.247@gmail.com).
