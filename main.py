from fastapi import FastAPI, WebSocket, UploadFile, File, Request, Form, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

import socketio
import logging
import random
import string
import json
import os
import base64
import asyncio
import re
import uuid

from redis import Redis
from openai import OpenAI
from google.auth import load_credentials_from_file
from google.cloud import storage, vision  # Combined Google Cloud imports
from google.oauth2 import service_account

import gspread  # For interacting with Google Sheets
from twilio.twiml.messaging_response import MessagingResponse
from twilio.rest import Client as TwilioClient  # Alias Twilio Client to avoid conflict
from fpdf import FPDF  # For PDF generation
from io import BytesIO
import pytesseract  # For OCR processing
from PIL import Image
import pandas as pd
import requests  # For making HTTP requests
import cv2  # For image processing
from supabase import create_client, Client as SupabaseClient

from datetime import datetime
from typing import Optional, List


app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
app.mount("/socket.io", socketio.ASGIApp(sio, other_asgi_app=app))
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure upload folder for saving uploaded files
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # Create the directory if it doesn't exist
app.config = {'UPLOAD_FOLDER': UPLOAD_FOLDER}

# Set up Redis for session management
redis = Redis(
    host=os.getenv('REDIS_HOST'),
    port=int(os.getenv('REDIS_PORT')),
    password=os.getenv('REDIS_PASSWORD'),
    decode_responses=True  # Ensure that responses are human-readable strings
)

# Set secret keys for session management
app.secret_key = os.getenv('APP_SECRET_KEY')


# Initialize OpenAI client with API key
openai_client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))  # Replace with your actual API key

# Set up logging configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Set up Supabase client using environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL')  
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

supabase: SupabaseClient = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Define the helper function to verify user credentials
def verify_user(err_id: str, pin: str):
    response = supabase.table("users").select("*").eq("err_id", err_id).execute()
    if response.data:
        user = response.data[0]
        if user['pin_hash'] == pin:  # Replace this with proper hash checking
            return True
    return False

# Twilio credentials (replace with your actual Twilio credentials)
account_sid = os.getenv('TWILIO_ACCOUNT_SID')
auth_token = os.getenv('TWILIO_AUTH_TOKEN')
twilio_client = TwilioClient(account_sid, auth_token)

# Google Sheets API setup
scope = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive"
]
creds, project = load_credentials_from_file(os.getenv('GCP_CREDENTIALS_JSON'), scopes=scope)
client = gspread.authorize(creds)
spreadsheet = client.open('MAG Database (Web Chat MVP)')
# Access specific worksheets within the spreadsheet
err_db_sheet = spreadsheet.worksheet('ERR DB')
sheet1 = spreadsheet.worksheet("Web Chat Form")
sheet2 = spreadsheet.worksheet("Web Chat Expenses")

# Google Cloud Storage setup
storage_client = storage.Client.from_service_account_json(os.getenv('GCP_CREDENTIALS_JSON'))
bucket_name = os.getenv('GCS_BUCKET_NAME')  # GCS bucket name from environment variable
bucket = storage_client.bucket(bucket_name)

# Path to your downloaded service account JSON key
service_account_json = os.getenv('GOOGLE_VISION')


# Set environment variable for Google Vision
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

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    sid = websocket.client_id  # Get the WebSocket session ID
    print(f"Client connected with SID: {sid}")

    # Check if user is authenticated
    if redis.get(f'{sid}_err_id'):
        # Store the WebSocket session ID in Redis
        redis.set(f'{sid}_sid', sid)
        set_user_state(sid, 'INITIAL')  # Initialize state for this user
        print(f"SID stored in Redis: {sid}")
    else:
        print("Unauthenticated user attempted to connect.")
        await websocket.send_text('Unauthorized access. Please log in.')
        await websocket.close()

@app.websocket("/disconnect")
async def websocket_disconnect(websocket: WebSocket):
    sid = websocket.client_id
    if sid in user_state:
        del user_state[sid]  # Clean up the state when a user disconnects
    if sid in user_data:
        del user_data[sid]  # Clean up user data
    print(f"Client disconnected with SID: {sid}")
    await websocket.close()

# Function to insert data into Supabase table "MAG F4 Summary" or "MAG F4 Expenses"
async def insert_data_to_supabase(table_name: str, data: dict):
    try:
        # Insert the data into the table specified by `table_name`
        response = supabase.table(table_name).insert(data).execute()

        # Check for errors in the response
        if response.data:  # Check if data exists in response
            print(f"Data successfully inserted into {table_name}.")
        else:
            print(f"Error inserting data: {response.model_dump_json()}")

        return response
    except Exception as e:
        print(f"Exception occurred while inserting data into Supabase: {e}")
        return None

# Function to shorten URLs using TinyURL API
async def shorten_url(long_url: str):
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

@app.post("/login")
async def login(request: Request, err_id: str = Form(...), pin: str = Form(...)):
    # Replace manual check with verify_user function
    if verify_user(err_id, pin):
        # Generate a unique session ID
        session_id = str(uuid.uuid4())
        # Store session data in Redis (1-hour expiration)
        redis.set(f"session:{session_id}", json.dumps({"err_id": err_id}), ex=3600)

        # Create the response based on AJAX request or not
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            response = JSONResponse({"success": True})
        else:
            response = RedirectResponse(url="/chat", status_code=303)

        # Set session ID as cookie
        response.set_cookie(key="session_id", value=session_id)
        return response
    else:
        # Handle invalid credentials
        if request.headers.get('x-requested-with') == 'XMLHttpRequest':
            return JSONResponse({"success": False, "message": "Invalid credentials"})
        else:
            return templates.TemplateResponse("index.html", {"request": request, "error": "Invalid credentials"})

# Chat Page
@app.get("/chat", response_class=HTMLResponse)
async def chat(request: Request):
    # Retrieve the session_id from cookies
    session_id = request.cookies.get('session_id')
    if not session_id or not redis.get(f"session:{session_id}"):
        # Redirect to login if session is invalid or not found
        return RedirectResponse(url="/", status_code=303)

    # If session is valid, proceed to chat page
    return templates.TemplateResponse("index.html", {"request": request})

# Upload
@app.post("/upload")
async def upload(
    request: Request,
    date: Optional[str] = Form(None),
    total_grant: Optional[float] = Form(None),
    total_other_sources: Optional[float] = Form(None),
    additional_excess_expenses: Optional[str] = Form(None),
    additional_surplus_use: Optional[str] = Form(None),
    additional_budget_lessons: Optional[str] = Form(None),
    additional_training_needs: Optional[str] = Form(None),
    expenses: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None)
):
    try:
        # Validate session using the session ID
        session_id = request.cookies.get('session_id')
        session_data = redis.get(f"session:{session_id}")
        if not session_data:
            raise HTTPException(status_code=401, detail="Not authenticated")

        session_info = json.loads(session_data)
        err_id = session_info.get("err_id")

        # Handle optional expenses
        if expenses:
            try:
                expenses_list = json.loads(expenses)
            except json.JSONDecodeError as e:
                expenses_list = []
                logging.error(f"JSON parsing error: {e}")
                return JSONResponse(content={"error": "Invalid expenses data format"}, status_code=400)
        else:
            expenses_list = []
            logging.info("No expenses data provided.")

        # Handle optional date
        if not date:
            date = ''  # Or handle as needed

        # Insert data into Supabase tables
        err_report_id = generate_ten_digit_id(err_id)
        total_expenses = sum(safe_float(expense.get('amount', '')) for expense in expenses_list)

        # Supabase logic for uploading files, inserting into tables, etc.
        uploaded_urls = []

        # Handle file uploads using Supabase Storage
        if files:
            for file in files:
                if file.filename:
                    try:
                        # File upload logic...
                        logging.info(f"File uploaded: {file.filename}")
                    except Exception as e:
                        logging.error(f"Error during file upload: {e}")

        # Insert data into 'MAG F4 Summary'
        await insert_data_to_supabase("MAG F4 Summary", {
            "err_id": err_id,
            "err_report_id": err_report_id,
            "total_expenses": total_expenses,
            "total_grant": total_grant,
            "excess_expenses": additional_excess_expenses,
            "surplus_use": additional_surplus_use,
            "lessons": additional_budget_lessons,
            "training": additional_training_needs,
            "files": json.dumps(uploaded_urls)  # File URLs as a JSON string
        })

        # Insert each expense into "MAG F4 Expenses"
        for expense in expenses_list:
            if expense.get('activity') or expense.get('amount'):
                try:
                    await insert_data_to_supabase("MAG F4 Expenses", {
                        "err_report_id": err_report_id,
                        "expense_activity": expense.get('activity', ''),
                        "expense_description": expense.get('description', ''),
                        "payment_date": expense.get('payment-date', None),
                        "seller": expense.get('seller', ''),
                        "payment_method": expense.get('payment-method', ''),
                        "receipt_no": expense.get('receipt-no', ''),
                        "expense_amount": safe_float(expense.get('amount', ''))
                    })
                except Exception as e:
                    logging.error(f"Error inserting expense: {e}")
            else:
                logging.info(f"Skipping empty expense entry.")

        return JSONResponse(content={'success': True, 'message': 'Form and files uploaded successfully.'})

    except Exception as e:
        logging.error(f"Unexpected error occurred: {e}")
        return JSONResponse(content={"error": "An unexpected error occurred"}, status_code=500)



# Define card template for the form
def generate_card_template(num_cards: int) -> str:
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

# Generate the HTML for the report form (Version 2)
def generate_report_v2_form(num_cards: int) -> str:
    return f"""
    <div class='form-bubble'>
        <form id="report-v2-form">
            <div class="form-section">
                <label for="v2-err-id">ERR ID:</label>
                <input type="text" id="v2-err-id" name="err_id" placeholder="Enter ERR ID">
                <label for="v2-date">Date:</label>
                <input type="date" id="v2-date" name="date">
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
                    <textarea id="v2-additional-excess-expenses" name="additional-excess-expenses" rows="3" placeholder="Enter details"></textarea>
                    <label for="v2-additional-surplus-use">How would you spend the surplus?</label>
                    <textarea id="v2-additional-surplus-use" name="additional-surplus-use" rows="3" placeholder="Enter details"></textarea>
                    <label for="v2-additional-budget-lessons">Lessons learned in budget planning?</label>
                    <textarea id="v2-additional-budget-lessons" name="additional-budget-lessons" rows="3" placeholder="Enter details"></textarea>
                    <label for="v2-additional-training-needs">Additional training needs?</label>
                    <textarea id="v2-additional-training-needs" name="additional-training-needs" rows="3" placeholder="Enter details"></textarea>
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

# Helper functions for user state management
def set_user_state(sid, state):
    redis.set(f"user_state_{sid}", state)

def get_user_data(sid):
    if sid not in user_data:
        user_data[sid] = {}
    return user_data[sid]

@app.websocket("/ws/message")
async def handle_message(websocket: WebSocket):
    await websocket.accept()
    sid = websocket.client_id  # Get the unique session ID for each user
    msg = await websocket.receive_text()
    msg = msg.strip().lower()

    print(f"Received message from {sid}: {msg}")
    user_state = redis.get(f"user_state_{sid}") if redis.get(f"user_state_{sid}") else 'None'
    print(f"Current State for {sid}: {user_state}")  # Track state per user

    response_text = ""

    if user_state == 'None' or msg == 'start':
        response_text = "Choose an option:"
        set_user_state(sid, 'INITIAL')  # Set state specific to this user's session
    elif user_state == 'INITIAL':
        if msg in ['1', 'menu']:
            response_text = "Choose an option:"
        elif msg in ['2', 'report']:
            # Set state to AWAITING_ERR_ID and send response
            set_user_state(sid, 'AWAITING_ERR_ID')
            response_text = "Please enter your ERR ID to proceed with the financial report."
        elif msg in ['report v2', 'report (v2)']:
            form_html = generate_report_v2_form(5)  # Generate 5 cards using the helper function
            await websocket.send_text(form_html)
            set_user_state(sid, 'AWAITING_FORM_FILL')  # Set the state for 'report v2'
            response_text = ""
        elif msg in ['scan form', 'scan']:
            response_text = "Please upload the image of the form you'd like to scan."
            set_user_state(sid, 'AWAITING_SCAN_FORM')
            await websocket.send_text(response_text)
        else:
            response_text = "Invalid option. Choose an option:\n1. Menu\n2. Report\n"
    elif user_state == 'AWAITING_ERR_ID':
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
    elif user_state == 'AWAITING_DESCRIPTION':
        user_data[sid]['description'] = msg
        response_text = "Please provide the vendor name."
        set_user_state(sid, 'AWAITING_VENDOR')
    elif user_state == 'AWAITING_VENDOR':
        user_data[sid]['vendor'] = msg
        response_text = "Please upload an image of the receipt."
        set_user_state(sid, 'AWAITING_RECEIPT')
    elif user_state == 'AWAITING_RECEIPT':
        response_text = "Waiting for receipt upload..."
        set_user_state(sid, 'AWAITING_AMOUNT')
    elif user_state == 'AWAITING_AMOUNT':
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
    elif user_state == 'AWAITING_NEXT_ACTION':
        if msg == '1':
            response_text = "Please provide the description of the item or service purchased."
            set_user_state(sid, 'AWAITING_DESCRIPTION')
        elif msg == '2':
            response_text = "Report submitted. Thank you!"
            del user_data[sid]
            set_user_state(sid, 'INITIAL')
        else:
            response_text = "Please choose an option:\n1. Add another expense\n2. Submit report"
    elif user_state == 'AWAITING_SCAN_FORM':
        # Handle file upload for form scanning
        # This section is placeholder for handling file uploads via websocket binary data
        response_text = "Please upload the image file for scanning."

    # Send response only if response_text is not empty
    if response_text.strip():
        await websocket.send_text(response_text)

    print(f"Responding with: {response_text}")



# Function to generate a 10-digit number, first 4 characters based on ERR ID input
def generate_ten_digit_id(err_id: str) -> str:
    return err_id[:4] + ''.join(random.choices(string.digits, k=6))

# Helper function to safely convert to float
def safe_float(value) -> float:
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def message(sid, data):
    print(f"Message from {sid}: {data}")
    asyncio.create_task(sio.emit('message', f"Server received: {data}", room=sid))

# WebSocket event to handle report submission (Version 2)
@sio.on('report v2')
async def send_report_v2_form(sid):
    print("Received 'report v2' request")
    form_html = generate_report_v2_form(5)  # Generate the form with 5 cards
    logging.info(f"Generated form HTML: {form_html}")  # Add this to track form generation
    await asyncio.gather(
        sio.emit('form_v2', {'form_html': form_html}, room=sid),
        sio.emit('message', 'Report V2 form generated successfully!', room=sid)
    )
    logging.info(f"Form emitted to client {sid}")  # Add this to confirm emission

# Handle form submission (data sent after user fills form)
@sio.on('submit_report_v2')
async def handle_submit_report_v2(sid, data: dict):
    print("Received 'submit_report_v2' event")
    logging.info(f"Received data from client {sid}: {data}")  # Add this to confirm data submission

    # Extract form data
    err_id = data.get('err_id', '')
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
        for expense in data.get('expenses', [])
    )

    print(f"Total Expenses: {total_expenses}")

    # Insert form data into "MAG F4 Summary"
    await insert_data_to_supabase("MAG F4 Summary", {
        "err_id": err_id,
        "err_report_id": err_report_id,
        "total_expenses": total_expenses,
        "total_grant": total_grant,
        "excess_expenses": additional_excess_expenses,
        "surplus_use": additional_surplus_use,
        "lessons": additional_budget_lessons,
        "training": additional_training_needs,
        "files": json.dumps(data.get('uploaded_urls', []))  # File URLs as a JSON string
    })

    # Insert each expense into "MAG F4 Expenses"
    for expense in data.get('expenses', []):
        if expense.get('activity') or expense.get('amount'):
            try:
                response = await insert_data_to_supabase("MAG F4 Expenses", {
                    "err_report_id": err_report_id,
                    "expense_activity": expense.get('activity', ''),
                    "expense_description": expense.get('description', ''),
                    "payment_date": expense.get('payment-date', None),
                    "seller": expense.get('seller', ''),
                    "payment_method": expense.get('payment-method', ''),
                    "receipt_no": expense.get('receipt-no', ''),
                    "expense_amount": safe_float(expense.get('amount', ''))
                })
                if response and response.data:
                    logging.info(f"Expense successfully inserted for report ID: {err_report_id}.")
                else:
                    logging.error(f"Failed to insert expense for report ID: {err_report_id}. Response: {response}")
            except Exception as e:
                logging.error(f"Exception occurred while inserting expense for report ID {err_report_id}: {e}")
        else:
            logging.info(f"Skipping empty or incomplete expense for report ID: {err_report_id}.")

    await asyncio.gather(
        sio.emit('message', 'Report V2 submitted successfully!', room=sid),
        sio.emit('reset_form', room=sid)
    )

    # Clear state after submission
    user_id = 'web_user'
    if user_id in user_data:
        user_data[user_id] = {}

    # Reset form state for next submission
    set_user_state(user_id, 'INITIAL')




@app.post("/scan_form")
async def scan_form(file: UploadFile = File(...)):
    if file.filename == '':
        raise HTTPException(status_code=400, detail="No selected file")

    # Save the file and process it
    image_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    with open(image_path, 'wb') as image_file:
        content = await file.read()
        image_file.write(content)

    # Preprocess the image and extract text
    preprocessed_image = preprocess_image(image_path)
    raw_text = google_vision_ocr(preprocessed_image)

    # Log the OCR result for debugging
    print(f"Raw OCR text: {raw_text}")

    # Use the new combined GPT prompt to classify the text
    structured_response = chatgpt_classification(raw_text)

    # Log the classification result for debugging
    print(f"Structured response: {structured_response}")

    return JSONResponse(content={"message": structured_response})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))  # Get port from environment or default to 8000
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
