from flask import Flask, render_template, request, jsonify, send_file
from flask_socketio import SocketIO, send
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

app.config['SECRET_KEY'] = 'supersecretkey'
socketio = SocketIO(app)

# Set the OpenAI API key directly
openai_client = OpenAI(api_key='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')  # Replace with your actual API key

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Twilio credentials (replace with your actual Twilio credentials)
account_sid = 'ACf8a9cf35a043af0acc877f245871b6ee'
auth_token = '1526e8a67318c6cb7892f5ff3a230931'
twilio_client = Client(account_sid, auth_token)

# Google Sheets setup
scope = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive"
]
creds, project = load_credentials_from_file('local-humanitarian-web-chat-5b747d2b153d.json', scopes=scope)  # Update this path
client = gspread.authorize(creds)
spreadsheet = client.open('MAG Database (Web Chat MVP)')
err_db_sheet = spreadsheet.worksheet('ERR DB')
sheet1 = spreadsheet.worksheet("Web Chat Form")  # Ensure the worksheet name matches
sheet2 = spreadsheet.worksheet("Web Chat Expenses")  # Ensure the worksheet name matches

# Google Cloud Storage setup
storage_client = storage.Client.from_service_account_json('local-humanitarian-web-chat-5b747d2b153d.json')  # Update this path
bucket_name = 'local-humanitarian-webchat-mvp'  # Your GCS bucket name
bucket = storage_client.bucket(bucket_name)

# Path to your downloaded service account JSON key
service_account_json = 'local-humanitarian-web-chat-1f81cd59311e.json'

# Google Vision
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'local-humanitarian-web-chat-1f81cd59311e.json'

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

# File Upload and Form Submission V2
@app.route('/upload', methods=['POST'])
def upload():
    try:
        # Extract form data
        err_id = request.form.get('err-id', 'default-id')
        report_date = request.form.get('date', '')
        total_grant = safe_float(request.form.get('total-grant', ''))
        total_other_sources = safe_float(request.form.get('total-other-sources', ''))
        additional_excess_expenses = request.form.get('additional-excess-expenses', '')
        additional_surplus_use = request.form.get('additional-surplus-use', '')
        additional_budget_lessons = request.form.get('additional-budget-lessons', '')
        additional_training_needs = request.form.get('additional-training-needs', '')

        # Extract and parse expenses JSON
        expenses = json.loads(request.form.get('expenses', '[]'))

        # Log the extracted form data for debugging
        logging.info(f"Form data: ERR ID: {err_id}, Date: {report_date}, Expenses: {expenses}")

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

                    # You can store this URL in Google Sheets or wherever necessary
                    # Example for storing in a list
                    if 'web_user' not in user_data:
                        user_data['web_user'] = {}
                    if 'receipts' not in user_data['web_user']:
                        user_data['web_user']['receipts'] = []
                    user_data['web_user']['receipts'].append(authenticated_url)

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
                    <button type="button" onclick="submitV2Form()">Submit</button>
                </div>
            </div>
        </form>
    </div>
    """

# Define the helper function for user state
def set_user_state(user_id, state):
    user_state[user_id] = state

@socketio.on('message')
def handle_message(msg):
    user_id = 'web_user'
    msg = msg.strip().lower()

    print(f"Received message: {msg}")
    print(f"Current State: {user_state.get(user_id, 'None')}")

    response_text = ""
    if user_id not in user_state or msg == 'start':
        response_text = "Choose an option:"
        set_user_state(user_id, 'INITIAL')
    elif user_state[user_id] == 'INITIAL':
        if msg in ['1', 'menu']:
            response_text = "Choose an option:"
        elif msg in ['2', 'report']:
            response_text = "Please enter your ERR ID to proceed with the financial report."
            set_user_state(user_id, 'AWAITING_ERR_ID')
        elif msg in ['report v2', 'report (v2)']:
            form_html = generate_report_v2_form(5)  # Generate 5 cards using the helper function
            send(form_html, broadcast=True)
            response_text = ""
        elif msg in ['report v3', 'report (v3)']:
            response_text = "Please take a picture of the form to digitize it."
            send(response_text, broadcast=True)
        elif msg in ['scan form', 'scan']:  # Add this block for Scan Form
            response_text = "Please upload the image of the form you'd like to scan."
            set_user_state(user_id, 'AWAITING_SCAN_FORM')
            send(response_text, broadcast=True)
        else:
            response_text = "Invalid option. Choose an option:\n1. Menu\n2. Report\n"
    elif user_state[user_id] == 'AWAITING_ERR_ID':
        err_id = msg.upper()
        cell = err_db_sheet.find(err_id)
        if cell:
            try:
                existing_sheet = spreadsheet.worksheet(f'ERR {err_id}')
                user_data[user_id] = {
                    'err_id': err_id,
                    'sheet': existing_sheet
                }
                response_text = f"Your ERR ID {err_id} exists. Please provide a description of the item (e.g., food) or service (e.g., transportation) that you purchased."
                set_user_state(user_id, 'AWAITING_DESCRIPTION')
            except gspread.exceptions.WorksheetNotFound:
                new_sheet = spreadsheet.add_worksheet(title=f'ERR {err_id}', rows="100", cols="20")
                template_data = err_db_sheet.row_values(1)
                new_sheet.append_row(template_data)
                user_data[user_id] = {'err_id': err_id, 'sheet': new_sheet}
                response_text = f"A new financial report has been created. Let's start filling out the report. Please provide a description of the item or service that you purchased."
                set_user_state(user_id, 'AWAITING_DESCRIPTION')
        else:
            response_text = "ERR ID not found. Please try again."
            set_user_state(user_id, 'AWAITING_ERR_ID')
    elif user_state[user_id] == 'AWAITING_DESCRIPTION':
        user_data[user_id]['description'] = msg
        response_text = "Please provide the vendor name."
        set_user_state(user_id, 'AWAITING_VENDOR')
    elif user_state[user_id] == 'AWAITING_VENDOR':
        user_data[user_id]['vendor'] = msg
        response_text = "Please upload an image of the receipt using the 📎 button."
        set_user_state(user_id, 'AWAITING_RECEIPT')
    elif user_state[user_id] == 'AWAITING_RECEIPT':
        response_text = "Waiting for receipt upload..."
        set_user_state(user_id, 'AWAITING_AMOUNT')
    elif user_state[user_id] == 'AWAITING_AMOUNT':
        user_data[user_id]['amount'] = msg
        new_sheet = user_data[user_id]['sheet']
        current_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        new_sheet.append_row([
            user_data[user_id]['description'], current_date,
            user_data[user_id]['vendor'],
            user_data[user_id].get('receipt', 'No receipt uploaded'),
            user_data[user_id]['amount']
        ])
        response_text = "Do you want to add another expense or submit the report?\n1. Add another expense\n2. Submit report"
        set_user_state(user_id, 'AWAITING_NEXT_ACTION')
    elif user_state[user_id] == 'AWAITING_NEXT_ACTION':
        if msg == '1':
            response_text = "Please provide the description of the item or service purchased."
            set_user_state(user_id, 'AWAITING_DESCRIPTION')
        elif msg == '2':
            response_text = "Report submitted. Thank you!"
            del user_data[user_id]
            set_user_state(user_id, 'INITIAL')
        else:
            response_text = "Please choose an option:\n1. Add another expense\n2. Submit report"
    elif user_state[user_id] == 'AWAITING_SCAN_FORM':  # New state to handle file upload
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
                set_user_state(user_id, 'INITIAL')
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

# User Confirmation and Upload of PDF Form
@app.route('/upload_report_v3', methods=['POST'])
def upload_report_v3():
    try:
        # Get the uploaded file
        file = request.files.get('file')
        if not file:
            return jsonify({'success': False, 'error': 'No file uploaded.'})

        # Read the image content
        content = file.read()

        # Extract text using Google Vision
        digitized_text = extract_text_with_google_vision(content)

        # Use regex to parse the relevant fields from the extracted text
        activity_match = re.search(r'Activity\s+(.+?)\s', digitized_text)
        description_match = re.search(r'Description\s+of\s+Expenses\s+(.+?)\s', digitized_text)
        payment_date_match = re.search(r'Payment\s+Date\s+(.+?)\s', digitized_text)
        seller_match = re.search(r'Seller/\s+Recipient\s+Details\s+(.+?)\s', digitized_text)
        payment_method_match = re.search(r'Payment\s+\(Cash/Bank\s+App\)\s+(.+?)\s', digitized_text)
        receipt_no_match = re.search(r'Receipt\s+No\.\s+(.+?)\s', digitized_text)
        expenses_match = re.search(r'Expenses\s+(.+?)\s', digitized_text)

        # Fallback values if no match is found
        form_data = {
            "activity": activity_match.group(1) if activity_match else "N/A",
            "description": description_match.group(1) if description_match else "N/A",
            "payment_date": payment_date_match.group(1) if payment_date_match else "N/A",
            "seller": seller_match.group(1) if seller_match else "N/A",
            "payment_method": payment_method_match.group(1) if payment_method_match else "N/A",
            "receipt_no": receipt_no_match.group(1) if receipt_no_match else "N/A",
            "expenses": expenses_match.group(1) if expenses_match else "N/A"
        }

        # Log the form data for debugging purposes
        logging.info(f"Extracted Form Data: {form_data}")

        # Generate pre-filled form HTML using Report V2 structure with pre-filled data
        prefilled_form_html = f"""
        <div class='form-bubble'>
            <form id="report-v2-form">
                <div class="form-section">
                    <label for="v2-activity-1">Activity:</label>
                    <input type="text" id="v2-activity-1" name="activity-1" value="{form_data['activity']}" placeholder="Enter activity"><br>
                    <label for="v2-description-1">Description of Expenses:</label>
                    <input type="text" id="v2-description-1" name="description-1" value="{form_data['description']}" placeholder="Enter description"><br>
                    <label for="v2-payment-date-1">Payment Date:</label>
                    <input type="date" id="v2-payment-date-1" name="payment-date-1" value="{form_data['payment_date']}"><br>
                    <label for="v2-seller-1">Seller / Recipient Details:</label>
                    <input type="text" id="v2-seller-1" name="seller-1" value="{form_data['seller']}" placeholder="Enter seller details"><br>
                    <label for="v2-payment-method-1">Payment Method:</label>
                    <select id="v2-payment-method-1" name="payment-method-1">
                        <option value="cash" {"selected" if form_data['payment_method'] == "CASH" else ""}>Cash</option>
                        <option value="bank app" {"selected" if form_data['payment_method'] == "Bank App" else ""}>Bank App</option>
                    </select><br>
                    <label for="v2-receipt-no-1">Receipt No.:</label>
                    <input type="text" id="v2-receipt-no-1" name="receipt-no-1" value="{form_data['receipt_no']}" placeholder="Enter receipt number"><br>
                    <label for="v2-expenses-1">Expenses:</label>
                    <input type="number" id="v2-expenses-1" name="expenses-1" value="{form_data['expenses']}" placeholder="Enter amount" class="expense-input"><br>
                </div>
            </form>
        </div>
        """

        # Send pre-filled form back to the user for review and edits
        return jsonify({'success': True, 'form_html': prefilled_form_html})

    except Exception as e:
        logging.error(f"Error processing the image: {e}")
        return jsonify({'success': False, 'error': 'Error processing form. Please try again.'})

# Add this function to generate the PDF with UTF-8 encoding support
@app.route('/confirm_upload_report_v3', methods=['POST'])
def confirm_upload_report_v3():
    try:
        # Extract the confirmed text from the request
        confirmed_text = request.json.get('text')
        if not confirmed_text:
            return jsonify({
                'success': False,
                'error': 'No text provided for confirmation.'
            })

        # Convert the text to PDF using FPDF with UTF-8 support
        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)

        # Split text into lines for proper UTF-8 handling
        lines = confirmed_text.split('\n')
        for line in lines:
            # Ensure UTF-8 handling, replacing any characters that can't be encoded
            pdf.cell(0, 10, txt=line.encode('latin-1', 'replace').decode('latin-1'), ln=True)

        # Save PDF to a temporary path
        pdf_path = '/tmp/confirmed_report.pdf'
        pdf.output(pdf_path)

        # Upload the PDF to Google Cloud Storage
        blob = bucket.blob('reports_v3/confirmed_report.pdf')
        blob.upload_from_filename(pdf_path)

        return jsonify({
            'success': True,
            'message': 'Form uploaded successfully as a PDF.'
        })

    except Exception as e:
        print(f"Error confirming and uploading the form: {e}")
        return jsonify({'success': False, 'error': str(e)})


def format_extracted_text_to_table(texts):
    # Split the extracted text into lines
    lines = texts.splitlines()

    # Define headers based on the form's layout
    headers = ["Activity", "Description of Expenses", "Payment Date", "Seller/Recipient Details", "Payment (Cash/Bank App)", "Receipt No.", "Expenses"]

    # Initialize an empty list to collect rows of data
    rows = []
    current_row = []

    # Flags for identifying sections in the text
    in_table = False

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Detect when to start reading table rows
        if "Activity" in line:
            in_table = True
            continue

        # Process each line as a row once we are in the table
        if in_table:
            # Accumulate data for each row
            if any(char.isdigit() for char in line):  # If the line contains digits, it's likely a row of data
                current_row.append(line)

                # Once the current row matches the headers length, add it to rows and reset
                if len(current_row) == len(headers):
                    rows.append(current_row)
                    current_row = []

    # Fill the DataFrame with headers and rows
    df = pd.DataFrame(rows, columns=headers)

    # Print and return the formatted table
    formatted_table = df.to_string(index=False)
    print("Formatted Table:\n", formatted_table)
    return formatted_table

# Integration within the Extract Text Function
def extract_text_with_google_vision(image_content):
    try:
        # Load credentials and set the project ID explicitly
        credentials = service_account.Credentials.from_service_account_file(
            'local-humanitarian-web-chat-1f81cd59311e.json'  # Ensure this path is correct
        )

        # Initialize Vision client with explicit project ID and credentials
        client = vision.ImageAnnotatorClient(credentials=credentials)

        # Create an image object from the content
        image = vision.Image(content=image_content)

        # Perform text detection
        response = client.text_detection(image=image)

        # Extract and combine text from the response
        texts = response.text_annotations
        if texts:
            extracted_text = texts[0].description.strip()

            # Print the extracted text for debugging
            print("Full Extracted Text:\n", extracted_text)  # Debugging line

            # Use the formatting function to structure the text
            formatted_text = format_extracted_text_to_table(extracted_text)

            # Return the formatted text
            return formatted_text
        else:
            return "No text detected."

    except Exception as e:
        print(f"Error using Google Vision API: {e}")
        return "Error in processing the image."

# Web Chat URL
@app.route('/whatsapp', methods=['POST'])
def whatsapp():
    incoming_msg = request.form.get('Body').strip().lower()
    logging.info(f"Incoming message: {incoming_msg}")
    resp = MessagingResponse()
    if 'start' in incoming_msg:
        long_url = "https://7c18ace5-72cd-4d34-b5be-cec6d1a14d1b-00-277hzsk9eprj9.riker.replit.dev/"
        short_url = shorten_url(long_url)  # Use the shorten_url function with TinyURL
        msg = resp.message(f"Welcome to our service! Please visit the following link to continue: {short_url}")
        logging.info("Responding with Web Chat URL.")
    else:
        msg = resp.message("Send 'start' to receive the link to our Web Chat.")
        logging.info("Responding with instruction message.")
    return str(resp)

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
    socketio.run(app, debug=True)
