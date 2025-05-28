const btnDecode = document.getElementById('btn-decode');
btnDecode.addEventListener('click', handleDecode);

// Function to handle the Decode process
function handleDecode() {
    // Step 1: Ask for Email
    const email = prompt("Enter your email:");

    if (!email) {
        alert("Email is required.");
        return;
    }

    // Step 2: Send OTP to the email
    fetch('https://steganography-server.onrender.com/sendOtp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'OTP sent to your email') {
            alert('OTP sent to your email!');
            // Step 3: Ask for OTP
            promptForOtp(email);
        } else {
            alert('Unauthorized email');
        }
    })
    .catch(error => {
        alert('Error sending OTP');
        console.log(error);
    });
}

// Function to prompt for OTP and verify it
function promptForOtp(email) {
    const otp = prompt('Enter the OTP sent to your email:');

    if (!otp) {
        alert("OTP is required.");
        return;
    }

    // Step 4: Verify OTP with the backend
    fetch('https://steganography-server.onrender.com/verify-otp', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, otp: otp })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'OTP verified') {
            alert('OTP verified. You can now decrypt the message.');
            // Step 5: Allow decryption
            decodeMessage(); // Proceed to decryption after OTP verification
        } else {
            alert('Invalid OTP');
        }
    })
    .catch(error => {
        alert('Error verifying OTP');
    });
}

// Function to decode the hidden message from the image
function decodeMessage() {
    const file = document.getElementById("imageToDecode").files[0];
    
    if (!file) {
        alert("Please select an image to decode.");
        return;
    }

    var reader = new FileReader();

    reader.onload = function(event) {
        var img = new Image();
        img.src = event.target.result;

        img.onload = function() {
            var canvas = document.createElement("canvas");
            var ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var binaryMessage = "";

            // Extract the binary message from the least significant bit of each pixel's red value
            for (var i = 0; i < imageData.data.length; i += 4) {
                binaryMessage += (imageData.data[i] & 1).toString();
            }

            var message = binaryToString(binaryMessage);
            promptForDecryptionKey(message);  // Call to prompt for decryption key
        };
    };
    reader.readAsDataURL(file);
}

// Function to convert binary to string
function binaryToString(binary) {
    var chars = binary.match(/.{1,8}/g).map(function(byte) {
        return String.fromCharCode(parseInt(byte, 2));
    });
    return chars.join("");
}

// Function to prompt for the decryption key
function promptForDecryptionKey(encryptedMessage) {
    const secretKey = prompt("Enter the decryption key:");

    if (!secretKey) {
        alert("Decryption key is required.");
        return;
    }

    // Handle decryption logic here (use CryptoJS or your decryption method)
    const decryptedMessage = CryptoJS.AES.decrypt(encryptedMessage, secretKey).toString(CryptoJS.enc.Utf8);
    document.getElementById("output").value = decryptedMessage;

    if (decryptedMessage) {
        alert('Decrypted Message successfully');
        // Prompt for the file format (txt, docx, pdf)
        var format = prompt("Enter the desired file format (txt, docx, pdf):");
        saveDecryptedMessage(decryptedMessage, format);
    } else {
        alert('Incorrect decryption key');
    }
}

// Function to save the decrypted message in the desired file format
function saveDecryptedMessage(message, format) {
    format = format.toLowerCase();

    if (format === "txt") {
        downloadTextFile(message);
    } else if (format === "docx") {
        downloadDocxFile(message);  // Trigger file chooser for .docx
    } else if (format === "pdf") {
        downloadPdfFile(message);
    } else {
        alert("Unsupported file format.");
    }
}

// Function to download a .txt file with word wrapping
function downloadTextFile(message) {
    var wrappedMessage = wrapText(message, 80); // Adjust the width as needed
    var blob = new Blob([wrappedMessage], { type: "text/plain" });
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "decrypted_message.txt";
    link.click();
}

// Function to wrap text for the text file
function wrapText(message, width) {
    var wrapped = '';
    var words = message.split(' ');
    var line = '';

    for (var i = 0; i < words.length; i++) {
        if (line.length + words[i].length + 1 > width) {
            wrapped += line + '\n';
            line = words[i]; // Start new line
        } else {
            line += (line ? ' ' : '') + words[i]; // Add space if not at start
        }
    }
    return wrapped + line; // Add remaining text
}

// Function to download a DOCX file
function downloadDocxFile(message) {
    // Check if html-docx-js library is available
    if (typeof htmlDocx === 'undefined') {
        alert("Error: 'html-docx-js' library is not loaded. Please check your script import.");
        return;
    }

    // Add some basic HTML tags for formatting
    const htmlContent = `
        <html>
            <head><style>body {font-family: Arial, sans-serif;}</style></head>
            <body>
                <h1>Decrypted Message</h1>
                <p>${message.replace(/\n/g, '<br/>')}</p> <!-- Replace line breaks with <br> -->
            </body>
        </html>
    `;

    // Convert the HTML content into a DOCX file using html-docx-js
    const converted = htmlDocx.asBlob(htmlContent);

    // Trigger the download of the DOCX file
    saveAs(converted, 'decrypted_message.docx');
}

// Function to download the message as a PDF
function downloadPdfFile(message) {
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(message, 180);
    let y = 10;

    lines.forEach(line => {
        if (y > 280) {
            doc.addPage();
            y = 10;
        }
        doc.text(line, 10, y);
        y += 10;
    });

    doc.save("decrypted_message.pdf");
}
