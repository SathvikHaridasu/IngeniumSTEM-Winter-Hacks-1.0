import axios from 'axios';

const GEMINI_API_URL = 'https://api.google.com/gemini/v1/highlight';
const API_KEY = 'AIzaSyCzfLxagyWUD0XnA8nq8MVy0ahUQqBvdRg';

export const getHighlightedText = async (text: string) => {
  try {
    const response = await axios.post(
      GEMINI_API_URL,
      { text },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching highlighted text:', error);
    return null;
  }
};
