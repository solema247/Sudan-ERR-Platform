// Event listener for when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initially hide the chat container if it exists
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        chatContainer.style.display = 'none';
    }

    // Add click event listener to the authentication button
    document.getElementById('auth-btn').addEventListener('click', (event) => {
        event.preventDefault();  // Prevent form submission from refreshing the page
        const errId = document.getElementById('err-id').value.trim();
        const pin = document.getElementById('pin').value.trim();

        // Create URL-encoded string for authentication
        const formData = new URLSearchParams();
        formData.append('err_id', errId);
        formData.append('pin', pin);

        // Send POST request to server for authentication
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: formData.toString(),
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Hide login, show chat
                document.querySelector('.auth-container').style.display = 'none';
                if (chatContainer) {
                    chatContainer.style.display = 'flex';
                }
                initializeChat(); // Make sure this function exists
            } else {
                document.getElementById('auth-error').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            document.getElementById('auth-error').style.display = 'block';
        });
    });

    let socket; // Declare socket variable globally

    // Function to initialize chat functionalities
    function initializeChat() {
        socket = io(); // Initialize Socket.IO connection

        // Handle successful connection to the server
        socket.on('connect', () => {
            console.log('Connected to the server');  // Ensure connection is successful
        });

        // Handle "report v2" form HTML response
        socket.on('form_v2', (data) => {
            console.log('Received form HTML');
            appendForm(data.form_html);  // Call appendForm to display the form
        });

        // Handle incoming messages from the server
        socket.on('message', (msg) => {
            handleMessage(msg);
        });

        // Listen for 'reset_form' event from the server to reset forms
        socket.on('reset_form', () => {
            const formElement = document.getElementById('report-v2-form');
            if (formElement) {
                formElement.reset();
            }

            // Explicitly clear each field, if necessary
            const numCards = document.querySelectorAll('.card').length;
            for (let i = 1; i <= numCards; i++) {
                document.getElementById(`v2-activity-${i}`).value = '';
                document.getElementById(`v2-description-${i}`).value = '';
                document.getElementById(`v2-payment-date-${i}`).value = '';
                document.getElementById(`v2-seller-${i}`).value = '';
                document.getElementById(`v2-payment-method-${i}`).value = 'cash'; // Reset to default
                document.getElementById(`v2-receipt-no-${i}`).value = '';
                document.getElementById(`v2-expenses-${i}`).value = '';
            }

            initializeForm();
        });

        // Show welcome message and Start button only after successful login
        appendWelcomeMessage(); // This call ensures the message and button appear post-login

        // Add event listener for the send button in the chat input
        document.getElementById('send-btn').addEventListener('click', () => {
            const input = document.getElementById('chat-input');
            const message = input.value.trim();
            if (message) {
                socket.emit(message);
                appendMessage(message, 'user');
                input.value = '';
            }
        });

        // Add event listener for the upload button to trigger file input
        document.getElementById('upload-btn').addEventListener('click', () => {
            document.getElementById('v2-file-upload').click();
        });

        // Handle file input change event for uploading files
        document.getElementById('v2-file-upload').addEventListener('change', (event) => {
            const files = event.target.files;
            if (files.length > 0) {
                uploadFiles(files);
            }
        });
    }

    // Function to append welcome message and Start button to the chat
    function appendWelcomeMessage() {
        const chatBox = document.getElementById('chat-box');

        // Clear any existing messages
        chatBox.innerHTML = '';

        // Create welcome message element
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'chat-message bot';
        welcomeMessage.innerHTML = "Welcome to the Sudan Emergency Response Rooms bot. We will help you report on your projects.";

        // Create 'Start' button element
        const startButton = document.createElement('button');
        startButton.innerText = 'Start';
        startButton.className = 'start-button'; // You can style this button in CSS
        startButton.onclick = () => {
            // Trigger the menu when 'Start' button is clicked
            appendMenuOptions();

            // Show the chat input and send button after starting
            document.getElementById('chat-input').style.display = 'block';
            document.getElementById('send-btn').style.display = 'block';

            // Hide the Start button after clicking
            startButton.style.display = 'none';
        };

        // Append welcome message and Start button to chatBox
        chatBox.appendChild(welcomeMessage);
        chatBox.appendChild(startButton);
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
    }

    // Function to ensure event listeners are correctly initialized when the form is shown or re-initialized
    function initializeForm() {
        const submitButton = document.getElementById('v2-submit-button');

        if (submitButton) {  
            // Remove any existing listeners to prevent duplication
            submitButton.removeEventListener('click', submitV2Form);

            // Attach the event listener to trigger form submission
            submitButton.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default form submission behavior
                submitV2Form(); // Trigger the form submission process
            });
        } else {
            console.error('Submit button not found for initialization'); 
        }
    }

    // Call initializeForm to ensure event listeners are set up
    initializeForm();

    // Generate 5 empty cards for expense entries
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

    // Event listener to update total expenses dynamically
    function updateTotalExpenses() {
        let total = 0;
        document.querySelectorAll('.expense-input').forEach(input => {
            total += parseFloat(input.value) || 0;
        });
        document.getElementById('total-expenses').innerText = total.toFixed(2);
    }

    // Function to append messages to the chat box
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

        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
    }

    // Function to handle specific message types received from the server
    function handleMessage(msg) {
        if (msg.includes('Choose an option')) {
            appendMenuOptions();
        } else if (msg.includes('<form')) {
            appendForm(msg);
        } else {
            appendMessage(msg, 'bot');
        }

        // Check if this is the final message in the Report flow
        if (msg.includes('Report submitted. Thank you!')) {
            // After the final report message, append the "Return to Menu" button
            appendReturnToMenuButton(document.getElementById('chat-box'));
        }
    }

    // Function to dynamically add menu options to the chat
    function appendMenuOptions() {
        const chatBox = document.getElementById('chat-box');

        // Create a container for the buttons if it doesn't exist
        let buttonContainer = document.querySelector('.inline-buttons');
        if (!buttonContainer) {
            buttonContainer = document.createElement('div');
            buttonContainer.className = 'inline-buttons';

            // Define menu options
            const options = [
                { text: 'Menu', value: 'menu' },
                { text: 'Report with Chat', value: 'report' },
                { text: 'Report with Fill Form', value: 'report v2' },
                { text: 'Report with Scan Form', value: 'scan form' }   // Add Scan Form option here
            ];

            options.forEach(option => {
                const button = document.createElement('button');
                button.innerText = option.text;
                button.addEventListener('click', () => {
                    if (option.value === 'scan form') {
                        startScanForm();  // Add the scan form functionality here
                    } else if (option.value === 'report v2') {
                        console.log('Requesting Report V2 Form');
                        socket.emit('report v2');  
                    } else {
                        socket.emit(option.value);
                        appendMessage(option.text, 'user');
                    }
                });
                buttonContainer.appendChild(button);
            });

            chatBox.appendChild(buttonContainer);
            chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom
        }
    }

    // Function to append form HTML content to the chat
    function appendForm(formHtml) {
        const chatBox = document.getElementById('chat-box');
        if (!chatBox) {
            console.error('Chat box not found in the DOM.');
            return;
        }

        // Create a form bubble container
        const formBubble = document.createElement('div');
        formBubble.className = 'form-bubble';  // Use form-bubble class for styling

        // Add the "F4 Form" header directly inside the bubble
        const formHeader = document.createElement('h2');
        formHeader.style.textAlign = 'center';
        formHeader.style.marginBottom = '10px';
        formHeader.textContent = 'F4 Form';

        // Append the form header to the bubble
        formBubble.appendChild(formHeader);

        // Append form HTML
        formBubble.insertAdjacentHTML('beforeend', formHtml);

        // Append the form bubble to the chat box
        chatBox.appendChild(formBubble);

        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the bottom

        // Add event listeners for the scroll buttons
        const leftArrow = formBubble.querySelector('.left-arrow');
        const rightArrow = formBubble.querySelector('.right-arrow');

        if (leftArrow && rightArrow) {
            leftArrow.addEventListener('click', scrollLeft);
            rightArrow.addEventListener('click', scrollRight);
        }

        // Initialize the form and set up event listeners
        initializeForm(); // Call initializeForm to manage event listeners properly

        // Ensure file upload section is visible
        const fileUploadSection = formBubble.querySelector('.form-section input[type="file"]');
        if (fileUploadSection) {
            fileUploadSection.style.display = 'block'; // Ensure the file input is visible
        }
    }

    // Function to handle form submission for Report V2
    function submitV2Form() {
        // Disable submit button to prevent multiple submissions
        const submitButton = document.querySelector("#report-v2-form button[type='button']");
        submitButton.disabled = true;

        // Collect form data including files
        const formData = new FormData(document.getElementById('report-v2-form'));
        console.log("Submitting Form Data:", formData);  

        // Collect expense data from dynamically generated cards
        const expenses = [];
        const numCards = document.querySelectorAll('.card').length;
        for (let i = 1; i <= numCards; i++) {
            const activityElement = document.getElementById(`v2-activity-${i}`);
            const descriptionElement = document.getElementById(`v2-description-${i}`);
            const paymentDateElement = document.getElementById(`v2-payment-date-${i}`);
            const sellerElement = document.getElementById(`v2-seller-${i}`);
            const paymentMethodElement = document.getElementById(`v2-payment-method-${i}`);
            const receiptNoElement = document.getElementById(`v2-receipt-no-${i}`);
            const expensesElement = document.getElementById(`v2-expenses-${i}`);

            // Include blank inputs without validation
            expenses.push({
                'activity': activityElement ? activityElement.value : '',
                'description': descriptionElement ? descriptionElement.value : '',
                'payment-date': paymentDateElement ? paymentDateElement.value : '',
                'seller': sellerElement ? sellerElement.value : '',
                'payment-method': paymentMethodElement ? paymentMethodElement.value : 'cash', // Default to 'cash'
                'receipt-no': receiptNoElement ? receiptNoElement.value : '',
                'amount': expensesElement ? expensesElement.value : ''
            });
        }

        // Append the expenses data as a JSON string to the FormData
        const expensesBlob = new Blob([JSON.stringify(expenses)], { type: 'application/json' });
        formData.append('expenses', expensesBlob);
        console.log([...formData.entries()]);

        console.log("Submitting Form Data:", formData);  // Debug: Check if the data logged here is correct

        // Include selected files in the form data
        const files = document.getElementById('v2-file-upload').files;
        for (let i = 0; i < files.length; i++) {
            formData.append('file', files[i]);
        }

        console.log([...formData.entries()]); // Log all form data entries
        
        // Send the form data to the server
        fetch('/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',  // Include credentials to allow cookies
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                appendMessage('Report V2 submitted successfully!', 'user');  // User feedback for success
            } else {
                appendMessage(`Failed to submit form: ${data.error}`, 'bot');  // Error handling for server-side errors
            }

            // After form submission, append the Return to Menu button
            appendReturnToMenuButton(document.getElementById('chat-box'));

        })
        .catch(error => {
            console.error('Error submitting form:', error);
            appendMessage('Error submitting form. Please try again.', 'bot');  // Client-side error handling
        })
        .finally(() => {
            // Clear form visually
            document.getElementById('report-v2-form').reset();

            // Explicitly clear each field, if necessary
            for (let i = 1; i <= numCards; i++) {
                const activityElement = document.getElementById(`v2-activity-${i}`);
                const descriptionElement = document.getElementById(`v2-description-${i}`);
                const paymentDateElement = document.getElementById(`v2-payment-date-${i}`);
                const sellerElement = document.getElementById(`v2-seller-${i}`);
                const paymentMethodElement = document.getElementById(`v2-payment-method-${i}`);
                const receiptNoElement = document.getElementById(`v2-receipt-no-${i}`);
                const expensesElement = document.getElementById(`v2-expenses-${i}`);

                if (activityElement) activityElement.value = '';
                if (descriptionElement) descriptionElement.value = '';
                if (paymentDateElement) paymentDateElement.value = '';
                if (sellerElement) sellerElement.value = '';
                if (paymentMethodElement) paymentMethodElement.value = 'cash'; // Reset to default
                if (receiptNoElement) receiptNoElement.value = '';
                if (expensesElement) expensesElement.value = '';
            }

            // Re-enable the submit button after the operation is complete
            submitButton.disabled = false;
        });

        // Re-enable the submit button after form reset
        setTimeout(() => {
            submitButton.disabled = false;
        }, 500); // Adjust delay as necessary
    }

    // File upload logic for a single file
    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        // Get ERR ID for proper folder structuring in GCS
        const errId = document.getElementById('v2-err_id').value || 'default-id'; // Replace 'default-id' as needed
        formData.append('err_id', errId);

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

    // Scrolling functions for navigating the cards in the swipeable interface
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


    // Function to upload multiple files in the V2 form
    function uploadFiles(files) {
        const formData = new FormData(); // Create a FormData object

        // Append each file to the FormData object
        for (let i = 0; i < files.length; i++) {
            formData.append('file', files[i]);
        }

        // Append additional form data like ERR ID
        const errId = document.getElementById('v2-err_id').value || 'default-id';
        formData.append('err_id', errId);

        console.log([...formData.entries()]); // Log all form data entries
        
        // Send the FormData object to the server
        fetch('/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include', // Include credentials to allow cookies
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                appendMessage(`Uploaded: ${files.length} file(s) successfully`, 'user');
            } else {
                appendMessage(`Failed to upload files: ${data.error}`, 'bot');
            }
        })
        .catch(error => {
            console.error('Error uploading files:', error);
            appendMessage('Error uploading files. Please try again.', 'bot');
        });
    }

    // Function to initiate the scan form process
    function startScanForm() {
        appendMessage('Please upload the image of the form you\'d like to scan.', 'bot');

        // Create the scan form file input dynamically
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';

        // Assign the onchange handler before clicking
        input.onchange = () => {
            const file = input.files[0];
            if (file) {
                uploadScanFormImage(file);  // Function to handle the image upload
            }
        };

        // Append the input to the body (or another container if preferred)
        document.body.appendChild(input);

        input.click(); // Open the file dialog
    }

    // Function to upload the scanned form image to the server
    function uploadScanFormImage(file) {
        const formData = new FormData();
        formData.append('file', file);

        appendMessage('Uploading and processing the form image...', 'bot'); // Feedback to user during upload

        fetch('/scan_form', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                // Show the extracted data from the form
                displayExtractedData(data.message);
            } else {
                appendMessage('Failed to scan the form. Please try again.', 'bot');
            }
        })
        .catch(error => {
            console.error('Error scanning form:', error);
            appendMessage('Error processing the form. Please try again.', 'bot');
        });
    }

    // Function to display extracted data from the scanned form as an editable text area
    function displayExtractedData(data) {
        const chatBox = document.getElementById('chat-box');

        // Create a container for the message
        const messageContainer = document.createElement('div');
        messageContainer.className = 'chat-message bot';

        // Create a textarea element with the extracted data
        const textarea = document.createElement('textarea');
        textarea.className = 'editable-textarea';
        textarea.value = data;  // Set the extracted data as the value of the textarea
        textarea.rows = 10;     // You can adjust the number of rows to display more or less text

        // Append the textarea to the message container
        messageContainer.appendChild(textarea);

        // Add a save button to save the edited data
        const saveButton = document.createElement('button');
        saveButton.innerText = 'Save';
        saveButton.className = 'save-button'; // Optional: You can style this in your CSS
        saveButton.onclick = () => {
            const updatedText = textarea.value;
            console.log('Updated text:', updatedText);  // For debugging
            appendMessage('You have saved the changes.', 'user');  // Add this message to the chat

            // Add the "Return to Menu" button after saving
            appendReturnToMenuButton(messageContainer);
        };

        // Append the save button to the message container
        messageContainer.appendChild(saveButton);

        // Append the message container to the chatbox
        chatBox.appendChild(messageContainer);
        chatBox.scrollTop = chatBox.scrollHeight; // Scroll to the latest message
    }

    // Function to append the "Return to Menu" button to a container
    function appendReturnToMenuButton(container) {
        // Create the return to menu button
        const returnToMenuButton = document.createElement('button');
        returnToMenuButton.innerText = 'Return to Menu';
        returnToMenuButton.className = 'return-button'; // You can style this button in CSS

        // Add an event listener to trigger the menu options
        returnToMenuButton.onclick = () => {
            appendMenuOptions(); // Return to the main menu
        };

        // Append the return button to the provided container (messageContainer)
        container.appendChild(returnToMenuButton);
    }

    // Add event listener to scan form button
    const scanFormButton = document.getElementById('scan-form-button');
    if (scanFormButton) {
        scanFormButton.addEventListener('click', startScanForm);
    } else {
        console.error('Scan Form button not found');
    }

}); // End of DOMContentLoaded event listener
