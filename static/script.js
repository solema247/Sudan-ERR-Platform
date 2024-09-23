// Authentication Logic
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('auth-btn').addEventListener('click', () => {
        const errId = document.getElementById('err-id').value.trim();
        const pin = document.getElementById('pin').value.trim();

        if (errId === '123' && pin === '321') {
            document.querySelector('.auth-container').style.display = 'none';
            document.querySelector('.chat-container').style.display = 'flex';
            initializeChat();
        } else {
            document.getElementById('auth-error').style.display = 'block';
        }
    });
});

let socket;

// Chat initialization logic
function initializeChat() {
    socket = io();

    // Existing socket connection logic
    socket.on('connect', () => {
        console.log('Connected to the server');
    });

    socket.on('message', (msg) => {
        handleMessage(msg);
    });

    document.getElementById('send-btn').addEventListener('click', () => {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (message) {
            socket.send(message);
            appendMessage(message, 'user');
            input.value = '';
        }
    });

    document.getElementById('upload-btn').addEventListener('click', () => {
        document.getElementById('file-input').click();
    });

    document.getElementById('file-input').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadFile(file);
        }
    });
}

// Ensure event listeners are correctly initialized when the form is shown or re-initialized
function initializeForm() {
    const submitButton = document.querySelector("#report-v2-form button[type='button']");

    if (submitButton) {  // Check if the submit button exists
        // Remove any existing listeners to prevent duplication
        submitButton.removeEventListener('click', submitV2Form);

        // Attach the event listener once
        submitButton.addEventListener('click', submitV2Form);
    } else {
        console.error('Submit button not found for initialization'); // Error handling if button is not found
    }

    // Add listeners for input events to recalculate expenses dynamically
    document.querySelectorAll('.expense-input').forEach(input => {
        input.removeEventListener('input', updateTotalExpenses); // Remove previous listeners
        input.addEventListener('input', updateTotalExpenses); // Add the input event listener
    });
}

// Call initializeForm to ensure event listeners are set up
initializeForm();

// Dynamic card generation when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Generate 5 empty cards
    const cardsContainer = document.getElementById('swipeable-cards');

    for (let i = 1; i <= 5; i++) {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h4>Expense Entry ${i}</h4>
            <label for="v2-activity-${i}">Activity:</label>
            <input type="text" id="v2-activity-${i}" name="activity-${i}" placeholder="Enter activity">
            <label for="v2-description-${i}">Description of Expenses:</label>
            <input type="text" id="v2-description-${i}" name="description-${i}" placeholder="Enter description">
            <label for="v2-payment-date-${i}">Payment Date:</label>
            <input type="date" id="v2-payment-date-${i}" name="payment-date-${i}">
            <label for="v2-seller-${i}">Seller / Recipient Details:</label>
            <input type="text" id="v2-seller-${i}" name="seller-${i}" placeholder="Enter seller details">
            <label for="v2-payment-method-${i}">Payment Method:</label>
            <select id="v2-payment-method-${i}" name="payment-method-${i}">
                <option value="cash">Cash</option>
                <option value="bank app">Bank App</option>
            </select>
            <label for="v2-receipt-no-${i}">Receipt No.:</label>
            <input type="text" id="v2-receipt-no-${i}" name="receipt-no-${i}" placeholder="Enter receipt number">
            <label for="v2-expenses-${i}">Expenses:</label>
            <input type="number" id="v2-expenses-${i}" name="expenses-${i}" placeholder="Enter amount" class="expense-input">
        `;
        cardsContainer.appendChild(card);
    }
});

// Event listener to update total expenses dynamically
function updateTotalExpenses() {
    let total = 0;
    document.querySelectorAll('.expense-input').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('total-expenses').innerText = total.toFixed(2);
}

// Function to handle incoming messages
function appendMessage(msg, sender) {
    const chatBox = document.getElementById('chat-box');
    const messageContainer = document.createElement('div');

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    messageDiv.innerHTML = msg;

    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    const now = new Date();
    timestamp.innerText = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;

    messageContainer.appendChild(messageDiv);
    messageContainer.appendChild(timestamp);
    chatBox.appendChild(messageContainer);

    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to handle specific message types
function handleMessage(msg) {
    if (msg.includes('Choose an option')) {
        appendMenuOptions();
    } else if (msg.includes('<form')) {
        appendForm(msg);
    } else {
        appendMessage(msg, 'bot');
    }
}

// Function to dynamically add menu options
function appendMenuOptions() {
    const chatBox = document.getElementById('chat-box');

    // Remove any existing inline buttons to prevent duplication
    const existingButtons = document.querySelector('.inline-buttons');
    if (existingButtons) {
        existingButtons.remove();
    }

    // Create a container for the buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'inline-buttons';

    // Define menu options including Report V3
    const options = [
        { text: 'Menu', value: 'menu' },
        { text: 'Report', value: 'report' },
        { text: 'Report V2', value: 'report v2' },
        { text: 'Report V3', value: 'report v3' }  // Add Report V3 button here
    ];

    // Create buttons dynamically
    options.forEach(option => {
        const button = document.createElement('button');
        button.innerText = option.text;
        button.addEventListener('click', () => {
            if (option.value === 'report v3') {
                startReportV3();  // Call the startReportV3 function when 'Report V3' is clicked
            } else {
                socket.send(option.value);
                appendMessage(option.text, 'user');
            }
        });
        buttonContainer.appendChild(button);
    });

    chatBox.appendChild(buttonContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to append form HTML content
function appendForm(formHtml) {
    console.log("Form HTML content:", formHtml);

    const chatBox = document.getElementById('chat-box');

    // Remove existing form if present
    const existingForm = document.querySelector('#report-v2-form');
    if (existingForm) {
        existingForm.parentElement.remove();  // Remove the parent div that contains the form
    }

    const formContainer = document.createElement('div');
    formContainer.innerHTML = formHtml;
    chatBox.appendChild(formContainer);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Initialize the form and set up event listeners
    initializeForm(); // Call initializeForm to manage event listeners properly

    // Explicitly show the file upload section if hidden
    const fileUploadSection = document.querySelector('.form-section input[type="file"]');
    if (fileUploadSection) {
        fileUploadSection.style.display = 'block'; // Ensure the file input is visible
    }
}

// Listen for reset form event from the server
socket.on('reset_form', () => {
    // Clear the form visually or reinitialize the form as needed
    const formElement = document.getElementById('report-v2-form');
    if (formElement) {
        formElement.reset();
    }
    initializeForm(); // Reinitialize to ensure event listeners are correctly set
});

// Function to handle form submission
function submitV2Form() {
    // Disable submit button to prevent multiple submissions
    const submitButton = document.querySelector("#report-v2-form button[type='button']");
    submitButton.disabled = true;

    // Collect form data
    const formData = new FormData(document.getElementById('report-v2-form')); // Collects all form data including files

    // Collect expense data from dynamically generated cards
    const expenses = [];
    const numCards = document.querySelectorAll('.card').length;
    for (let i = 1; i <= numCards; i++) {
        expenses.push({
            'activity': document.getElementById(`v2-activity-${i}`).value,
            'description': document.getElementById(`v2-description-${i}`).value,
            'payment-date': document.getElementById(`v2-payment-date-${i}`).value,
            'seller': document.getElementById(`v2-seller-${i}`).value,
            'payment-method': document.getElementById(`v2-payment-method-${i}`).value,
            'receipt-no': document.getElementById(`v2-receipt-no-${i}`).value,
            'amount': document.getElementById(`v2-expenses-${i}`).value
        });
    }

    // Add expenses to FormData as a JSON string
    formData.append('expenses', JSON.stringify(expenses));

    console.log("Submitting Form Data:", formData);  // Debug: Check if the data logged here is current

    // Send the form data to the server
    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            appendMessage('Report V2 submitted successfully!', 'user');
        } else {
            appendMessage(`Failed to submit form: ${data.error}`, 'bot');
        }
    })
    .catch(error => {
        console.error('Error submitting form:', error);
        appendMessage('Error submitting form. Please try again.', 'bot');
    })
    .finally(() => {
        // Re-enable the submit button after the operation is complete
        submitButton.disabled = false;
    });

    // Clear form visually
    document.getElementById('report-v2-form').reset();

    // Explicitly clear each field, if necessary
    for (let i = 1; i <= numCards; i++) {
        document.getElementById(`v2-activity-${i}`).value = '';
        document.getElementById(`v2-description-${i}`).value = '';
        document.getElementById(`v2-payment-date-${i}`).value = '';
        document.getElementById(`v2-seller-${i}`).value = '';
        document.getElementById(`v2-payment-method-${i}`).value = 'cash'; // Reset to default
        document.getElementById(`v2-receipt-no-${i}`).value = '';
        document.getElementById(`v2-expenses-${i}`).value = '';
    }

    // Re-enable the submit button after form reset
    setTimeout(() => {
        submitButton.disabled = false;
    }, 500); // Adjust delay as necessary
}

// File upload logic
function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    // Get ERR ID for proper folder structuring in GCS
    const errId = document.getElementById('v2-err-id').value || 'default-id'; // Replace 'default-id' as needed
    formData.append('err-id', errId);

    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            appendMessage(`Uploaded: ${file.name}`, 'user');
        } else {
            appendMessage(`Failed to upload: ${file.name}`, 'bot');
        }
    })
    .catch(error => {
        console.error('Error uploading file:', error);
        appendMessage('Error uploading file. Please try again.', 'bot');
    });
}

// Scrolling functions for navigating the cards
function scrollLeft() {
    const cardsContainer = document.querySelector('.swipeable-cards');
    cardsContainer.scrollBy({
        left: -cardsContainer.clientWidth,
        behavior: 'smooth'
    });
}

function scrollRight() {
    const cardsContainer = document.querySelector('.swipeable-cards');
    cardsContainer.scrollBy({
        left: cardsContainer.clientWidth,
        behavior: 'smooth'
    });
}

// Upload files V2 form
function uploadFiles() {
    // Get the file input element
    const fileInput = document.getElementById('v2-file-upload');
    const files = fileInput.files; // Get the selected files
    const formData = new FormData(); // Create a FormData object

    // Append each file to the FormData object
    for (let i = 0; i < files.length; i++) {
        formData.append('file', files[i]);
    }

    // Append additional form data like ERR ID
    const errId = document.getElementById('v2-err-id').value || 'default-id'; // Use a default if not provided
    formData.append('err-id', errId);

    // Send the FormData object to the server
    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            appendMessage(`Uploaded: ${files.length} files successfully`, 'user');
        } else {
            appendMessage(`Failed to upload files: ${data.error}`, 'bot');
        }
    })
    .catch(error => {
        console.error('Error uploading files:', error);
        appendMessage('Error uploading files. Please try again.', 'bot');
    });
}

// Function to start Report V3
function startReportV3() {
    appendMessage('Please take a picture of the form to digitize it.', 'bot');

    // Create file input for image capture
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use device's back camera if available
    input.onchange = () => {
        const file = input.files[0];
        if (file) {
            uploadFormImage(file);
        }
    };
    input.click();
}

// Function to handle form image upload
function uploadFormImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    appendMessage('Uploading and processing the form image...', 'bot'); // Feedback during upload

    fetch('/upload_report_v3', {
        method: 'POST',
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                displayFormattedText(data.text); // Show formatted text to the user
            } else {
                appendMessage('Failed to digitize the form. Please try again.', 'bot');
            }
        })
        .catch((error) => {
            console.error('Error uploading form image:', error);
            appendMessage('Error processing form. Please try again.', 'bot');
        });
}

// Function to format and display digitized text
function displayFormattedText(digitizedText) {
    const formattedText = digitizedText.replace(/\n/g, '<br>'); // Replace line breaks with HTML line breaks
    appendMessage('Digitized form text:<br>' + formattedText, 'bot'); 
    appendMessage('Please confirm or retake the picture.', 'bot');
    appendConfirmationButtons(digitizedText);
}

// Function to append confirmation buttons
function appendConfirmationButtons(digitizedText) {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'inline-buttons';

    // Confirm button
    const confirmButton = document.createElement('button');
    confirmButton.innerText = 'Confirm';
    confirmButton.onclick = () => {
        appendMessage('Uploading confirmed form...', 'bot'); // Feedback during confirmation
        uploadConfirmedForm(digitizedText);
    };
    buttonContainer.appendChild(confirmButton);

    // Retake button
    const retakeButton = document.createElement('button');
    retakeButton.innerText = 'Retake';
    retakeButton.onclick = startReportV3;
    buttonContainer.appendChild(retakeButton);

    document.getElementById('chat-box').appendChild(buttonContainer);
    document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight; // Scroll to show new buttons
}

// Function to handle confirmed form upload
function uploadConfirmedForm(digitizedText) {
    fetch('/confirm_upload_report_v3', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: digitizedText }),
    })
    .then((response) => response.json())
    .then((data) => {
        if (data.success) {
            appendMessage('Form uploaded successfully as a PDF.', 'bot');
        } else {
            appendMessage(`Failed to upload the form: ${data.error}`, 'bot');
        }
    })
    .catch((error) => {
        console.error('Error uploading confirmed form:', error);
        appendMessage('Error uploading form. Please try again.', 'bot');
    });
}

