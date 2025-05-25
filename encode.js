// encode.js

// Function to encode the message based on the selected input type

const btnEncode =document.getElementById('btn-encode');
btnEncode.addEventListener('click',encodeMessage);
function encodeMessage() {
    var inputType = document.getElementById("inputType").value;
    var secretKey = prompt("Enter encryption key:");

    if (!secretKey) {
        alert("Encryption key is required.");
        return;
    }
        // Send the secret key to the authorized emails
        sendSecretKeyToEmails(secretKey);

    switch (inputType) {
        case "plainText":
            var message = document.getElementById("messageToEncode").value;
            if (!message) {
                alert("Please enter a message to encode.");
                return;
            }
            processAndEncodeMessage(message, secretKey);
            break;
        case "docx":
            var docxFile = document.getElementById("docxFile").files[0];
            extractTextFromDocx(docxFile, secretKey);
            break;
        case "pdf":
            var pdfFile = document.getElementById("pdfFile").files[0];
            extractTextFromPdf(pdfFile, secretKey);
            break;
        case "imageText":
            var imageFile = document.getElementById("imageFile").files[0];
            extractTextFromImage(imageFile, secretKey);
            break;
        default:
            alert("Invalid input type selected.");
    }
}

// Function to send the secret key to authorized emails
function sendSecretKeyToEmails(secretKey) {
    // Create the payload
    const payload = {
        secretKey: secretKey,
        emails: ['dhineshsiva1234@gmail.com', '194014gurumurugan.g@gmail.com'] // Add your authorized emails here
    };

    // Send the secret key to each authorized email
   fetch('https://steganography-server.onrender.com/send-secret-key', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'Secret key sent to emails') {
            console.log('Secret key successfully sent to authorized emails');
        } else {
            console.log('Error sending secret key');
        }
    })
    .catch(error => {
        console.error('Error sending secret key:', error);
    });
}


// Function to process and encrypt the extracted message, then encode it into the image
function processAndEncodeMessage(message, secretKey) {
    // Trim whitespace and normalize line breaks
    message = message.replace(/\r\n|\r|\n/g, '\n').trim();

    // Encrypt the message
    var encryptedMessage = CryptoJS.AES.encrypt(message, secretKey).toString();

    var file = document.getElementById("imageToEncode").files[0];
    if (!file) {
        alert("Please select an image to encode the message into.");
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
            var binaryMessage = toBinary(encryptedMessage);

            if (binaryMessage.length > imageData.data.length / 4) {
                alert("The image is too small to hold this message. Please use a larger image.");
                return;
            }

            // Embed the encrypted message into the image by modifying the LSB of each pixel's red value
            for (var i = 0; i < binaryMessage.length; i++) {
                imageData.data[i * 4] = (imageData.data[i * 4] & ~1) | parseInt(binaryMessage[i], 10);
            }

            ctx.putImageData(imageData, 0, 0);
            var encodedImage = canvas.toDataURL("image/png");

            downloadImage(encodedImage, "encoded.png");
            alert("Message successfully encoded into image.");
        };

        img.onerror = function() {
            alert("Error loading image. Please select a valid image file.");
        };
    };

    reader.onerror = function() {
        alert("Error reading image file.");
    };

    reader.readAsDataURL(file);
}

// Function to convert a string to a binary representation
function toBinary(string) {
    return string.split("").map(function(char) {
        return char.charCodeAt(0).toString(2).padStart(8, "0");
    }).join("");
}

// Function to trigger downloading of the encoded image
function downloadImage(dataUrl, filename) {
    var link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Function to extract text from a .docx file and encode it with a secret key
function extractTextFromDocx(file, secretKey) {
    if (!file) {
        alert("Please select a DOCX file.");
        return;
    }

    var reader = new FileReader();  // Create a FileReader object to read the file contents

    reader.onload = function(event) {
        JSZip.loadAsync(event.target.result).then(function(zip) {
            return zip.file("word/document.xml").async("string");  // Get the XML content of the document
        }).then(function(data) {
            var parser = new DOMParser();
            var xmlDoc = parser.parseFromString(data, "application/xml");

            // Extract text while preserving paragraph breaks
            var paragraphs = xmlDoc.getElementsByTagName("w:p");
            var message = Array.from(paragraphs).map(function(para) {
                var runs = para.getElementsByTagName("w:r");
                return Array.from(runs).map(function(run) {
                    var textElements = run.getElementsByTagName("w:t");
                    return Array.from(textElements).map(function(textNode) {
                        return textNode.textContent;
                    }).join('');  // Join text within a run
                }).join('');  // Join text within a paragraph
            }).join('\n\n');  // Add double newlines between paragraphs for proper spacing

            processAndEncodeMessage(message, secretKey);  // Process the message and encode
        }).catch(function(error) {
            console.error('Error extracting text from DOCX:', error);
            alert("An error occurred while extracting text from DOCX file.");
        });
    };

    reader.onerror = function() {
        alert("Error reading DOCX file.");
    };

    reader.readAsArrayBuffer(file);  // Read the .docx file as ArrayBuffer
}

// Function to extract text from a .pdf file
function extractTextFromPdf(file, secretKey) {
    if (!file) {
        alert("Please select a PDF file.");
        return;
    }

    var reader = new FileReader();

    reader.onload = function(event) {
        var typedArray = new Uint8Array(event.target.result);

        pdfjsLib.getDocument(typedArray).promise.then(function(pdf) {
            var pagesPromises = [];

            // Loop through all the pages
            for (var i = 1; i <= pdf.numPages; i++) {
                pagesPromises.push(pdf.getPage(i).then(function(page) {
                    return page.getTextContent().then(function(textContent) {
                        return textContent.items.map(function(item) {
                            return item.str;
                        }).join(' ');  // Join text from each item
                    });
                }));
            }

            // When all pages are processed, join them with newlines
            Promise.all(pagesPromises).then(function(pagesText) {
                var message = pagesText.join('\n\n');  // Separate pages with newlines
                processAndEncodeMessage(message, secretKey);  // Process and encode the message
            });
        }).catch(function(error) {
            console.error('Error extracting text from PDF:', error);
            alert("An error occurred while extracting text from PDF file.");
        });
    };

    reader.onerror = function() {
        alert("Error reading PDF file.");
    };

    reader.readAsArrayBuffer(file);
}

