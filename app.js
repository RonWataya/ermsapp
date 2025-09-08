document.addEventListener('DOMContentLoaded', () => {
    const URL = 'http://localhost:8000';

    // Utility function to show custom message box
    const showMessage = (message, isError = false) => {
        const messageBox = document.getElementById('message-box');
        const messageText = document.getElementById('message-text');
        messageText.textContent = message;
        if (isError) {
            messageText.classList.add('text-red-600');
            messageText.classList.remove('text-green-600');
        } else {
            messageText.classList.add('text-green-600');
            messageText.classList.remove('text-red-600');
        }
        messageBox.classList.remove('hidden');
    };

    document.getElementById('message-close-btn').addEventListener('click', () => {
        document.getElementById('message-box').classList.add('hidden');
    });

    // Front-end state
    let monitorId = null;
    let currentSubmissionId = null; // To track if we are editing an existing submission

    // Function to fetch and render submission history
    const fetchAndRenderSubmissions = async () => {
        const historyContainer = document.getElementById('submission-history');
        historyContainer.innerHTML = '<p class="text-sm text-gray-500 text-center">Loading submissions...</p>';

        try {
            const response = await fetch(`${URL}/submissions/${monitorId}`);
            const submissions = await response.json();

            if (response.ok && submissions.length > 0) {
                historyContainer.innerHTML = '';
                submissions.forEach(submission => {
                    const statusColor = submission.status === 'Verified' ? 'text-green-600' : 'text-yellow-600';
                    const statusText = submission.status === 'Verified' ? 'Verified' : 'Pending Verification';
                    const submissionDiv = document.createElement('div');
                    submissionDiv.className = 'bg-gray-100 p-4 rounded-lg shadow-inner flex justify-between items-center';
                    
                    const date = new Date(submission.submission_timestamp).toLocaleString();
                    
                    submissionDiv.innerHTML = `
                        <div>
                            <p class="text-sm font-semibold">Submitted on: <span class="text-gray-600">${date}</span></p>
                            <p class="text-sm font-semibold">Status: <span class="${statusColor}">${statusText}</span></p>
                        </div>
                    `;

                    if (submission.status !== 'Verified') {
                        const editButton = document.createElement('button');
                        editButton.textContent = 'Edit';
                        editButton.className = 'bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 ml-4';
                        editButton.onclick = () => {
                            // Populate form with existing data
                            document.getElementById('registered-voters').value = submission.registered_voters || '';
                            document.getElementById('nullified-votes').value = submission.nullified_votes || '';
                            document.getElementById('invalid-votes').value = submission.invalid_votes || '';
                            document.getElementById('presidential-votes').value = submission.presidential_votes || '';
                            document.getElementById('parliamentary-votes').value = submission.parliamentary_votes || '';
                            document.getElementById('local-gov-votes').value = submission.local_gov_votes || '';
                            
                            // Set the global submission ID for update
                            currentSubmissionId = submission.submission_id;

                            // Change button text
                            const submitBtn = document.getElementById('submit-all-btn');
                            submitBtn.textContent = 'Update Results';
                            document.getElementById('cancel-edit-btn').classList.remove('hidden');
                            checkFormStatus();
                            
                            showMessage('You are now editing a pending submission. You must re-upload images.');
                        };
                        submissionDiv.appendChild(editButton);
                    }

                    historyContainer.appendChild(submissionDiv);
                });
            } else {
                historyContainer.innerHTML = '<p class="text-sm text-gray-500 text-center">No submissions found.</p>';
            }
        } catch (error) {
            console.error('Failed to fetch submissions:', error);
            historyContainer.innerHTML = '<p class="text-sm text-red-500 text-center">Failed to load history.</p>';
        }
    };

    // Handle Login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const monitorIdInput = document.getElementById('monitor-id').value;
        const passwordInput = document.getElementById('password').value;

        try {
            const response = await fetch(`${URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monitorId: monitorIdInput, password: passwordInput })
            });
            const data = await response.json();

            if (response.ok) {
                monitorId = monitorIdInput;
                document.getElementById('monitor-name').textContent = monitorId;
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('main-app-screen').classList.remove('hidden');
                showMessage(`Login successful! Welcome, ${monitorId}.`);
                fetchAndRenderSubmissions(); // Fetch history after successful login
            } else {
                showMessage(data.message, true);
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('An error occurred during login. Please try again.', true);
        }
    });

    // Handle Check-in
    document.getElementById('check-in-btn').addEventListener('click', async () => {
        try {
            const response = await fetch(`${URL}/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monitorId })
            });
            const data = await response.json();
            if (response.ok) {
                showMessage(data.message);
            } else {
                showMessage(data.message, true);
            }
        } catch (error) {
            console.error('Check-in error:', error);
            showMessage('An error occurred during check-in. Please try again.', true);
        }
    });

    // Function to check if all mandatory inputs are filled
    const checkFormStatus = () => {
        const presidentialVotes = document.getElementById('presidential-votes').value;
        const parliamentaryVotes = document.getElementById('parliamentary-votes').value;
        const localGovVotes = document.getElementById('local-gov-votes').value;
        const registeredVoters = document.getElementById('registered-voters').value;

        const presidentialImage = document.getElementById('presidential-image').files[0];
        const parliamentaryImage = document.getElementById('parliamentary-image').files[0];
        const localGovImage = document.getElementById('local-gov-image').files[0];

        const isComplete = presidentialVotes && parliamentaryVotes && localGovVotes && registeredVoters &&
                           presidentialImage && parliamentaryImage && localGovImage;
        
        const submitBtn = document.getElementById('submit-all-btn');

        if (isComplete) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
            submitBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        } else {
            submitBtn.disabled = true;
            submitBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            submitBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
        }
    };

    // Event listeners for form inputs
    document.getElementById('results-form').addEventListener('input', checkFormStatus);
    document.getElementById('results-form').addEventListener('change', checkFormStatus);

    // Convert file to Base64
    const toBase64 = file => new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // Extract base64 part
        reader.onerror = error => reject(error);
    });

    // Handle submission
    document.getElementById('results-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-all-btn');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        try {
            const presidentialImageBase64 = await toBase64(document.getElementById('presidential-image').files[0]);
            const parliamentaryImageBase64 = await toBase64(document.getElementById('parliamentary-image').files[0]);
            const localGovImageBase64 = await toBase64(document.getElementById('local-gov-image').files[0]);

            const submissionData = {
                submissionId: currentSubmissionId, // This will be null for new submissions
                monitorId,
                registeredVoters: document.getElementById('registered-voters').value,
                nullifiedVotes: document.getElementById('nullified-votes').value,
                invalidVotes: document.getElementById('invalid-votes').value,
                presidentialVotes: document.getElementById('presidential-votes').value,
                presidentialImage: presidentialImageBase64,
                parliamentaryVotes: document.getElementById('parliamentary-votes').value,
                parliamentaryImage: parliamentaryImageBase64,
                localGovVotes: document.getElementById('local-gov-votes').value,
                localGovImage: localGovImageBase64,
            };

            const response = await fetch(`${URL}/submit-results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });
            const data = await response.json();

            if (response.ok) {
                showMessage(data.message);
                // Clear the form and reset state for new submission
                document.getElementById('results-form').reset();
                currentSubmissionId = null;
                submitBtn.textContent = 'Submit All Results';
                document.getElementById('cancel-edit-btn').classList.add('hidden');
                fetchAndRenderSubmissions(); // Refresh history
            } else {
                showMessage(data.message, true);
            }
        } catch (error) {
            console.error('Submission error:', error);
            showMessage('An error occurred during submission. Please try again.', true);
        } finally {
            submitBtn.textContent = originalBtnText;
            checkFormStatus(); // Re-evaluate button state
        }
    });

    // Handle Cancel Edit
    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        document.getElementById('results-form').reset();
        currentSubmissionId = null;
        document.getElementById('submit-all-btn').textContent = 'Submit All Results';
        document.getElementById('cancel-edit-btn').classList.add('hidden');
        checkFormStatus();
    });
});
