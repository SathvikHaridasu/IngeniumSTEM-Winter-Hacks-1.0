
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
const { SpeechClient } = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3001;

app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json({ limit: '50mb' }));

const storage = new Storage();
const client = new SpeechClient();
const bucketName = 'audio-chunks-bucket'; // Replace with your bucket name

app.post('/transcribe', async (req, res) => {
  try {
    const audioBytes = req.body.audio;
    const audioBuffer = Buffer.from(audioBytes, 'base64');
    const fileName = `${uuidv4()}.webm`;
    const filePath = path.join(__dirname, fileName);

    // Save the audio file locally
    fs.writeFileSync(filePath, audioBuffer);

    const gcsFileName = `${uuidv4()}.webm`;
    const gcsUri = `gs://${bucketName}/${gcsFileName}`;

    // Upload the audio file to Google Cloud Storage
    await storage.bucket(bucketName).upload(filePath, {
      destination: gcsFileName,
    });

    const request = {
      audio: {
        uri: gcsUri,
      },
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000, // Set to 48000 to match the WEBM OPUS header
        languageCode: 'en-US',
        enableAutomaticPunctuation: true, // Enable automatic punctuation
      },
    };

    const [operation] = await client.longRunningRecognize(request);
    const [response] = await operation.promise();

    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');

    // Clean up GCS file
    await storage.bucket(bucketName).file(gcsFileName).delete();

    // Clean up local file
    fs.unlinkSync(filePath);

    res.json({ transcription: transcription.trim() });
  } catch (error) {
    console.error('Transcription error:', error);
    console.error('Error details:', error.message);
    res.status(500).send('Error transcribing audio');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
