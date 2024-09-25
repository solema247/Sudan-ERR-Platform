from flask import Flask, render_template, request, jsonify, send_file, session
from flask_socketio import SocketIO, send, disconnect  # Keep this simple
from flask_session import Session  # Add this import for Session
from openai import OpenAI  # Updated import
from google.auth import load_credentials_from_file
from google.cloud import storage
import gspread
import logging
from datetime import datetime
import random
import string
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client
import json
from fpdf import FPDF  # Import FPDF
import os
import base64
from io import BytesIO
import pytesseract
from PIL import Image
from google.cloud import vision
from google.oauth2 import service_account
import pandas as pd
import requests  # Import requests to make API calls
import re
import cv2

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'  # This is the directory where uploaded files will be saved
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Create the directory if it doesn't exist
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER  # Set this as the upload folder in Flask config

app.config['SECRET_KEY'] = os.urandom(24)  # Generate a random secret key

app.secret_key = 'your_secret_key'  # Replace with a strong random string

# Configure session type
app.config['SESSION_TYPE'] = 'filesystem'  # You can also use 'redis' or other backends for production
Session(app)  # Initialize session with the app

# Set up WebSocket with ping timeouts to prevent idle WebSocket connections
socketio = SocketIO(app, manage_session=True, ping_timeout=10, ping_interval=5)

# Set the OpenAI API key directly
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))  # Replace with your actual API key

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Twilio credentials (replace with your actual Twilio credentials)
account_sid = os.getenv('TWILIO_ACCOUNT_SID')
auth_token = os.getenv('TWILIO_AUTH_TOKEN')
twilio_client = Client(account_sid, auth_token)

# Google Sheets setup
scope = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive"
]
creds, project = load_credentials_from_file(os.getenv('GCP_CREDENTIALS_JSON'), scopes=scope) # Update this path
client = gspread.authorize(creds)
spreadsheet = client.open('MAG Database (Web Chat MVP)')
err_db_sheet = spreadsheet.worksheet('ERR DB')
sheet1 = spreadsheet.worksheet("Web Chat Form")  # Ensure the worksheet name matches
sheet2 = spreadsheet.worksheet("Web Chat Expenses")  # Ensure the worksheet name matches

# Google Cloud Storage setup
storage_client = storage.Client.from_service_account_json(os.getenv('GCP_CREDENTIALS_JSON'))
# Update this path
bucket_name = os.getenv('GCS_BUCKET_NAME')  # Your GCS bucket name
bucket = storage_client.bucket(bucket_name)

# Path to your downloaded service account JSON key
service_account_json = os.getenv('GOOGLE_VISION')

# Google Vision
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = os.getenv('GOOGLE_VISION')

# Google Vision function to extract text from cropped images
def google_vision_ocr(image):
    client = vision.ImageAnnotatorClient()
    _, encoded_image = cv2.imencode('.jpg', image)
    content = encoded_image.tobytes()
    image = vision.Image(content=content)

    response = client.text_detection(image=image)
    texts = response.text_annotations
    if texts:
        return texts[0].description.strip()
    return "Not found"

# Function to clean up extracted text
def clean_extracted_text(raw_text):
    cleaned_text = re.sub(r'[\n\r]+', ' ', raw_text).strip()
    return cleaned_text

# Function to call GPT for classification based on the entire OCR text
def chatgpt_classification(raw_text):
    # Clean the raw OCR text
    cleaned_text = clean_extracted_text(raw_text)

    # Create the combined prompt
    prompt = f"""
    I have extracted the following text from a financial report form. The text contains multiple sections including a date, ERR number, an activity table, a financial summary, and responses to additional questions.

    Here is the text:
    {cleaned_text}

    Please extract the following information and structure it accordingly:

    1. Date: Identify the date from the text.
    2. ERR Number: Extract the ERR number.
    3. Activity Table: Identify each row in the activity table and organize the data into the following fields:
       - Activity
       - Description of Expenses
       - Payment Date
       - Seller/Recipient Details
       - Payment Method (Cash/Bank App)
       - Receipt Number
       - Expenses
    4. Financial Summary: Extract the following fields:
       - Total Expenses
       - Total Grant Received
       - Total Amount from Other Sources
       - Remainder
    5. Additional Questions: Extract responses to the following questions:
       - How did you cover excess expenses?
       - How would you spend the surplus if expenses were less than the grant received?
       - What lessons did you learn about budget planning?
       - Were there any additional training needs or opportunities?
    """

    # Log the prompt for debugging
    print(f"Prompt sent to ChatGPT: {prompt}")

    try:
        # Send the prompt to GPT
        response = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.7
        )

        # Return the response
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"An error occurred while interacting with the OpenAI API: {e}")
        return "An error occurred while processing the data."


# Preprocess the image before OCR
def preprocess_image(image_path):
    image = cv2.imread(image_path)
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    blurred_image = cv2.GaussianBlur(gray_image, (5, 5), 0)
    adjusted_image = cv2.convertScaleAbs(blurred_image, alpha=1.5, beta=0)
    return adjusted_image

# State tracking for user conversations
user_state = {}
user_data = {}

@socketio.on('connect')
def handle_connect(auth):
    sid = request.sid  # Get the Socket.IO session ID
    print(f"Client connected with SID: {sid}")

    # Check if user is authenticated
    if 'err_id' in session:
        # Store the Socket.IO session ID in the Flask session
        session['sid'] = sid
        set_user_state(sid, 'INITIAL')  # Initialize state for this user
        print(f"SID stored in session: {session.get('sid')}")
    else:
        print("Unauthenticated user attempted to connect.")
        # Optionally, disconnect the client
        send('Unauthorized access. Please log in.', to=sid)
        disconnect()

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    if sid in user_state:
        del user_state[sid]  # Clean up the state when a user disconnects
    if sid in user_data:
        del user_data[sid]  # Clean up user data
    print(f"Client disconnected with SID: {sid}")

@app.route('/')
def index():
    return render_template('index.html')

# Function to shorten URLs using TinyURL API
def shorten_url(long_url):
    try:
        # TinyURL API endpoint
        api_url = f'http://tinyurl.com/api-create.php?url={long_url}'
        response = requests.get(api_url)
        if response.status_code == 200:
            return response.text  # The response is the shortened URL
        else:
            logging.error(f"Error shortening URL: {response.text}")
            return long_url  # Return the original URL if shortening fails
    except Exception as e:
        logging.error(f"Exception during URL shortening: {e}")
        return long_url  # Return the original URL if an error occurs

# Login Server Side 
@app.route('/login', methods=['POST'])
def login():
    err_id = request.form.get('err-id')
    pin = request.form.get('pin')

    # Perform your authentication logic here
    if err_id == '123' and pin == '321':
        # Set the session data
        session['err_id'] = err_id
        print(f"Session data set: {session}")
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'error': 'Invalid credentials'}), 401


# File Upload and Form Submission V2
@app.route('/upload', methods=['POST'])
def upload():
    try:
        # Get the 'err_id' from the Flask session
        session_err_id = session.get('err_id')
        if not session_err_id:
            return jsonify({'error': 'Not authenticated'}), 401
        print(f"ERR ID from session in upload: {session_err_id}")

        # Extract form data
        err_id = request.form.get('err-id', 'default-id')
        report_date = request.form.get('date', '')
        total_grant = safe_float(request.form.get('total-grant', ''))
        total_other_sources = safe_float(request.form.get('total-other-sources', ''))
        additional_excess_expenses = request.form.get('additional-excess-expenses', '')
        additional_surplus_use = request.form.get('additional-surplus-use', '')
        additional_budget_lessons = request.form.get('additional-budget-lessons', '')
        additional_training_needs = request.form.get('additional-training-needs', '')

        # Optional: Validate that the 'err-id' from the form matches the session 'err_id'
        if err_id != session_err_id:
            return jsonify({'error': 'ERR ID mismatch'}), 400

        # Extract and parse expenses JSON
        expenses = json.loads(request.form.get('expenses', '[]'))

        # Log the extracted form data for debugging
        logging.info(f"Form data: ERR ID: {err_id}, Date: {report_date}, Expenses: {expenses}")

        # Collect uploaded URLs
        uploaded_urls = []

        # Handle file uploads
        if 'file' in request.files:
            uploaded_files = request.files.getlist('file')
            for file in uploaded_files:
                if file.filename:
                    # Define the folder path in GCS
                    submission_date = datetime.now().strftime('%Y-%m-%d')
                    folder_name = f"report-v2/submission-{submission_date}-{err_id}"
                    blob_path = f"{folder_name}/{file.filename}"

                    logging.info(f"Uploading file to GCS at {blob_path}")

                    # Reset the file stream position to the beginning before uploading
                    file.seek(0)
                    blob = bucket.blob(blob_path)
                    blob.upload_from_file(file)

                    # Generate the authenticated URL instead of the public URL
                    authenticated_url = f"https://storage.cloud.google.com/{bucket_name}/{blob_path}"

                    # Log and store the URL
                    logging.info(f"File successfully uploaded to {blob_path}")
                    logging.info(f"Authenticated URL: {authenticated_url}")

                    # Collect the URLs in a list
                    uploaded_urls.append(authenticated_url)

        # Update Google Sheets (Sheet 1)
        try:
            err_report_id = generate_ten_digit_id(err_id)
            total_expenses = sum(safe_float(expense.get('amount', '')) for expense in expenses)

            # Construct GCS folder link
            gcs_folder_link = f"https://storage.cloud.google.com/{bucket_name}/report-v2/submission-{report_date}-{err_id}"

            sheet1.append_row([
                err_id,  # Column A (ERR ID)
                err_report_id,  # Column B (ERR Report ID)
                report_date,  # Column C (Date)
                total_expenses,  # Column D (Total Expense)
                total_grant,  # Column E (Total Grant)
                total_other_sources,  # Column F (Total Other Sources)
                additional_excess_expenses,  # Column G (Excess Expenses)
                additional_surplus_use,  # Column H (Surplus Use)
                additional_budget_lessons,  # Column I (Lessons)
                additional_training_needs,  # Column J (Training)
                gcs_folder_link  # Column K (GCS Bucket Link)
            ])
            logging.info("Successfully updated Sheet 1 with form data.")

            # Update Google Sheets (Sheet 2) with expense details
            for expense in expenses:
                activity = expense.get('activity')
                description = expense.get('description')
                payment_date = expense.get('payment-date')
                seller = expense.get('seller')
                payment_method = expense.get('payment-method')
                receipt_no = expense.get('receipt-no')
                amount = safe_float(expense.get('amount', ''))

                # Add the expense data row to the sheet
                sheet2.append_row([
                    err_report_id,  # Column A (ERR Report ID)
                    activity,  # Column B (Activity)
                    description,  # Column C (Description)
                    payment_date,  # Column D (Payment Date)
                    seller,  # Column E (Seller)
                    payment_method,  # Column F (Payment Method)
                    receipt_no,  # Column G (Receipt No.)
                    amount  # Column H (Amount)
                ])
            logging.info("Successfully updated Sheet 2 with expense data.")

        except Exception as e:
            logging.error(f"Error updating Sheets: {e}")

        # Return success response
        return jsonify({'success': True, 'message': 'Form and files uploaded successfully.'})

    except Exception as e:
        logging.error(f"Error processing upload: {e}")
        return jsonify({'success': False, 'error': str(e)})

# Define card template
def generate_card_template(num_cards):
    card_html = ""
    for i in range(1, num_cards + 1):
        card_html += f"""
        <div class="card">
            <h4>Expense Entry {i}</h4>
            <label for="v2-activity-{i}">Activity:</label>
            <input type="text" id="v2-activity-{i}" name="activity-{i}" placeholder="Enter activity">
            <label for="v2-description-{i}">Description of Expenses:</label>
            <input type="text" id="v2-description-{i}" name="description-{i}" placeholder="Enter description">
            <label for="v2-payment-date-{i}">Payment Date:</label>
            <input type="date" id="v2-payment-date-{i}" name="payment-date-{i}">
            <label for="v2-seller-{i}">Seller / Recipient Details:</label>
            <input type="text" id="v2-seller-{i}" name="seller-{i}" placeholder="Enter seller details">
            <label for="v2-payment-method-{i}">Payment Method:</label>
            <select id="v2-payment-method-{i}" name="payment-method-{i}">
                <option value="cash">Cash</option>
                <option value="bank app">Bank App</option>
            </select>
            <label for="v2-receipt-no-{i}">Receipt No.:</label>
            <input type="text" id="v2-receipt-no-{i}" name="receipt-no-{i}" placeholder="Enter receipt number">
            <label for="v2-expenses-{i}">Expenses:</label>
            <input type="number" id="v2-expenses-{i}" name="expenses-{i}" placeholder="Enter amount" class="expense-input">
        </div>
        """
    return card_html

# Define the helper function first
def generate_report_v2_form(num_cards):
    return f"""
    <div class='form-bubble'>
        <form id="report-v2-form">
            <div class="form-section">
                <label for="v2-err-id">ERR ID:</label>
                <input type="text" id="v2-err-id" name="err-id" placeholder="Enter ERR ID"><br>
                <label for="v2-date">Date:</label>
                <input type="date" id="v2-date" name="date"><br>
                <div class="swipeable-cards-container">
                    <button type="button" class="card-nav left-arrow" onclick="scrollLeft()">
                        &#9664;
                    </button>
                    <div class="swipeable-cards" id="swipeable-cards">
                        {generate_card_template(num_cards)}
                    </div>
                    <button type="button" class="card-nav right-arrow" onclick="scrollRight()">
                        &#9654;
                    </button>
                </div>
                <div class="form-section">
                    <label>Total Expenses:</label>
                    <span id="total-expenses">0.00</span>
                </div>

                <!-- File Upload Section -->
                <div class="form-section">
                    <label for="v2-file-upload">Upload Receipts/Files:</label>
                    <input type="file" id="v2-file-upload" name="file" multiple>
                </div>

                <div class="form-section">
                    <label for="v2-total-grant">Total Grant Received:</label>
                    <input type="number" id="v2-total-grant" name="total-grant" placeholder="Enter total grant received">
                </div>
                <div class="form-section">
                    <label for="v2-total-other-sources">Total Amount from Other Sources:</label>
                    <input type="number" id="v2-total-other-sources" name="total-other-sources" placeholder="Enter amount from other sources">
                </div>
                <div class="form-section">
                    <h3>Additional Questions:</h3>
                    <label for="v2-additional-excess-expenses">How did you cover excess expenses?</label>
                    <textarea id="v2-additional-excess-expenses" name="additional-excess-expenses" rows="3" placeholder="Enter details"></textarea><br>
                    <label for="v2-additional-surplus-use">How would you spend the surplus?</label>
                    <textarea id="v2-additional-surplus-use" name="additional-surplus-use" rows="3" placeholder="Enter details"></textarea><br>
                    <label for="v2-additional-budget-lessons">Lessons learned in budget planning?</label>
                    <textarea id="v2-additional-budget-lessons" name="additional-budget-lessons" rows="3" placeholder="Enter details"></textarea><br>
                    <label for="v2-additional-training-needs">Additional training needs?</label>
                    <textarea id="v2-additional-training-needs" name="additional-training-needs" rows="3" placeholder="Enter details"></textarea><br>
                </div>
                <div class="form-section">
                    <button type="button" id="v2-submit-button">Submit</button>
                </div>
            </div>
        </form>
    </div>
    """

# Define global dictionaries to store user state and data
user_state = {}  # Tracks each user's state
user_data = {}   # Tracks each user's data

# Define the helper function for user state
def set_user_state(sid, state):
    user_state[sid] = state

def get_user_data(sid):
    if sid not in user_data:
        user_data[sid] = {}
    return user_data[sid]

@socketio.on('message')
def handle_message(msg):
    sid = request.sid  # Get the unique session ID for each user
    msg = msg.strip().lower()

    print(f"Received message from {sid}: {msg}")
    print(f"Current State for {sid}: {user_state.get(sid, 'None')}")  # Track state per user

    response_text = ""

    if sid not in user_state or msg == 'start':
        response_text = "Choose an option:"
        set_user_state(sid, 'INITIAL')  # Set state specific to this user's session
    elif user_state[sid] == 'INITIAL':
        if msg in ['1', 'menu']:
            response_text = "Choose an option:"
        elif msg in ['2', 'report']:
            # Set state to AWAITING_ERR_ID and send response
            set_user_state(sid, 'AWAITING_ERR_ID')
            response_text = "Please enter your ERR ID to proceed with the financial report."
        elif msg in ['report v2', 'report (v2)']:
            form_html = generate_report_v2_form(5)  # Generate 5 cards using the helper function
            send(form_html, broadcast=True)
            set_user_state(sid, 'AWAITING_FORM_FILL')  # Set the state for 'report v2'
            response_text = ""
        elif msg in ['scan form', 'scan']:  # Add this block for Scan Form
            response_text = "Please upload the image of the form you'd like to scan."
            set_user_state(sid, 'AWAITING_SCAN_FORM')
            send(response_text, broadcast=True)
        else:
            response_text = "Invalid option. Choose an option:\n1. Menu\n2. Report\n"
    elif user_state[sid] == 'AWAITING_ERR_ID':
        err_id = msg.upper()
        cell = err_db_sheet.find(err_id)
        if cell:
            try:
                existing_sheet = spreadsheet.worksheet(f'ERR {err_id}')
                user_data[sid] = {
                    'err_id': err_id,
                    'sheet': existing_sheet
                }
                response_text = f"Your ERR ID {err_id} exists. Please provide a description of the item (e.g., food) or service (e.g., transportation) that you purchased."
                set_user_state(sid, 'AWAITING_DESCRIPTION')
            except gspread.exceptions.WorksheetNotFound:
                new_sheet = spreadsheet.add_worksheet(title=f'ERR {err_id}', rows="100", cols="20")
                template_data = err_db_sheet.row_values(1)
                new_sheet.append_row(template_data)
                user_data[sid] = {'err_id': err_id, 'sheet': new_sheet}
                response_text = f"A new financial report has been created. Let's start filling out the report. Please provide a description of the item or service that you purchased."
                set_user_state(sid, 'AWAITING_DESCRIPTION')
        else:
            response_text = "ERR ID not found. Please try again."
            set_user_state(sid, 'AWAITING_ERR_ID')
    elif user_state[sid] == 'AWAITING_DESCRIPTION':
        user_data[sid]['description'] = msg
        response_text = "Please provide the vendor name."
        set_user_state(sid, 'AWAITING_VENDOR')
    elif user_state[sid] == 'AWAITING_VENDOR':
        user_data[sid]['vendor'] = msg
        response_text = "Please upload an image of the receipt using the 📎 button."
        set_user_state(sid, 'AWAITING_RECEIPT')
    elif user_state[sid] == 'AWAITING_RECEIPT':
        response_text = "Waiting for receipt upload..."
        set_user_state(sid, 'AWAITING_AMOUNT')
    elif user_state[sid] == 'AWAITING_AMOUNT':
        user_data[sid]['amount'] = msg
        new_sheet = user_data[sid]['sheet']
        current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_sheet.append_row([
            user_data[sid]['description'], current_date,
            user_data[sid]['vendor'],
            user_data[sid].get('receipt', 'No receipt uploaded'),
            user_data[sid]['amount']
        ])
        response_text = "Do you want to add another expense or submit the report?\n1. Add another expense\n2. Submit report"
        set_user_state(sid, 'AWAITING_NEXT_ACTION')
    elif user_state[sid] == 'AWAITING_NEXT_ACTION':
        if msg == '1':
            response_text = "Please provide the description of the item or service purchased."
            set_user_state(sid, 'AWAITING_DESCRIPTION')
        elif msg == '2':
            response_text = "Report submitted. Thank you!"
            del user_data[sid]
            set_user_state(sid, 'INITIAL')
        else:
            response_text = "Please choose an option:\n1. Add another expense\n2. Submit report"
    elif user_state[sid] == 'AWAITING_SCAN_FORM':  # New state to handle file upload
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':  # If no file is selected
                response_text = "No file selected. Please upload an image to scan."
            else:
                # Save the file and process it
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
                file.save(image_path)

                # Preprocess and scan the form
                preprocessed_image = preprocess_image(image_path)
                raw_text = google_vision_ocr(preprocessed_image)
                print(f"Raw OCR text: {raw_text}") 
                structured_response = chatgpt_classification(raw_text)
                print(f"Structured response: {structured_response}") 

                response_text = f"Here is the extracted data:\n{structured_response}"
                set_user_state(sid, 'INITIAL')
        else:
            response_text = "Please upload a valid image file to scan."
    else:  # This else handles any states not explicitly managed above
        response_text = f"Bot Response: You said '{msg}'"

    # Send response only if response_text is not empty
    if response_text.strip():
        send(response_text, broadcast=True)

    print(f"Responding with: {response_text}")


# Function to generate a 10-digit number, first 4 characters based on ERR ID input
def generate_ten_digit_id(err_id):
    return err_id[:4] + ''.join(random.choices(string.digits, k=6))

# Helper function to safely convert to float
def safe_float(value):
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

@socketio.on('submit_report_v2')
def handle_submit_report_v2(data):
    print("Received data:", data)  # Debugging line to print the received data

    # Extract form data
    err_id = data.get('err-id', '')
    report_date = data.get('date', '')
    total_grant = safe_float(data.get('total-grant', ''))
    total_other_sources = safe_float(data.get('total-other-sources', ''))
    additional_excess_expenses = data.get('additional-excess-expenses', '')
    additional_surplus_use = data.get('additional-surplus-use', '')
    additional_budget_lessons = data.get('additional-budget-lessons', '')
    additional_training_needs = data.get('additional-training-needs', '')

    # Generate the 10-digit ERR Report ID
    err_report_id = generate_ten_digit_id(err_id)

    # Calculate the total expenses, safely handle empty or non-numeric values
    total_expenses = sum(
        safe_float(expense.get('amount', ''))
        for expense in data.get('expenses', []))

    print(f"Total Expenses: {total_expenses}")

    # Construct GCS bucket link using the ERR ID and date
    gcs_folder_link = f"https://storage.googleapis.com/{bucket_name}/report-v2/submission-{report_date}-{err_id}"

    # Populate Sheet 1: Web Chat Form
    sheet1.append_row([
        err_id,  # Column A (ERR ID)
        err_report_id,  # Column B (ERR Report ID)
        report_date,  # Column C (Date)
        total_expenses,  # Column D (Total Expense)
        total_grant,  # Column E (Total Grant)
        total_other_sources,  # Column F (Total Other Sources)
        additional_excess_expenses,  # Column G (Excess Expenses)
        additional_surplus_use,  # Column H (Surplus Use)
        additional_budget_lessons,  # Column I (Lessons)
        additional_training_needs,  # Column J (Training)
        gcs_folder_link  # Column K (GCS Bucket Link)
    ])

    # Populate Sheet 2: Web Chat Expenses
    for expense in data.get('expenses', []):
        activity = expense.get('activity')
        description = expense.get('description')
        payment_date = expense.get('payment-date')
        seller = expense.get('seller')
        payment_method = expense.get('payment-method')
        receipt_no = expense.get('receipt-no')
        amount = safe_float(expense.get(
            'amount', ''))  # Safely handle empty or non-numeric values

        # Add the expense data row to the sheet
        sheet2.append_row([
            err_report_id,  # Column A (ERR Report ID)
            activity,  # Column B (Activity)
            description,  # Column C (Description)
            payment_date,  # Column D (Payment Date)
            seller,  # Column E (Seller)
            payment_method,  # Column F (Payment Method)
            receipt_no,  # Column G (Receipt No.)
            amount  # Column H (Amount)
        ])

    # Acknowledge successful submission
    send('Report V2 submitted successfully!', broadcast=True)

    # Clear state after submission
    user_id = 'web_user'
    if user_id in user_data:
        user_data[user_id] = {}

    # Ensure the form can be used again with fresh data
    set_user_state(user_id, 'INITIAL')  # Reset to INITIAL state

    # Explicitly send back the form reset command, if needed
    send('reset_form', broadcast=True
         )  # This line will help trigger the form reset client-side if needed

# Scan Form
@app.route('/scan_form', methods=['POST'])
def scan_form():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Save the file and process it
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(image_path)

    # Preprocess the image and extract text
    preprocessed_image = preprocess_image(image_path)
    raw_text = google_vision_ocr(preprocessed_image)

    # Log the OCR result for debugging
    print(f"Raw OCR text: {raw_text}")

    # Use the new combined GPT prompt to classify the text
    structured_response = chatgpt_classification(raw_text)

    # Log the classification result for debugging
    print(f"Structured response: {structured_response}")

    return jsonify({"message": structured_response})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Get port from environment or default to 5000
    socketio.run(app, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)
