import os
import json
import time
from datetime import datetime, timedelta
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import google.generativeai as genai
from pymongo import MongoClient
import logging
from bs4 import BeautifulSoup
import requests
from apscheduler.schedulers.background import BackgroundScheduler

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure the Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'AIzaSyAphJSGf3rhrzB2Xzho7DNYFXGVpZpVtqY')
genai.configure(api_key=GEMINI_API_KEY)

# Set up the model
model = genai.GenerativeModel('gemini-1.5-pro')

# MongoDB connection with error handling
try:
    client = MongoClient('mongodb+srv://ihub:ihub@test-portal.lcgyx.mongodb.net/test_portal_db?retryWrites=true&w=majority',
                         serverSelectionTimeoutMS=5000)  # Added timeout
    # Test the connection
    client.server_info()
    db = client['agent_db']
    collection = db['market_research']
    google_trend_collection = db['Google_trend']
    logger.info("Successfully connected to MongoDB")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    # Don't raise exception here, handle it gracefully in the view functions

@csrf_exempt
@api_view(['POST'])
def send_message(request):
    try:
        # Check if MongoDB is connected
        if 'client' not in globals() or not client:
            return Response({'error': 'Database connection is not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Parse request data safely
        try:
            data = json.loads(request.body)
            message = data.get('message', '').strip()
        except Exception as e:
            logger.error(f"Error parsing request data: {str(e)}")
            return Response({'error': 'Invalid request format'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate input
        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Save the message to MongoDB with error handling
        try:
            collection.insert_one({'message': message, 'sender': 'user'})
            logger.info(f"Saved user message to database: {message[:50]}...")
        except Exception as e:
            logger.error(f"Failed to save user message to database: {str(e)}")
            # Continue processing even if database save fails

        # Call Gemini API
        try:
            response = call_gemini_api(message)

            if response.get('error'):
                logger.error(f"Gemini API error: {response['error']}")
                return Response(response, status=status.HTTP_502_BAD_GATEWAY)

            # Save the AI response to MongoDB with error handling
            try:
                collection.insert_one({'message': response['message'], 'sender': 'bot'})
                logger.info(f"Saved bot response to database: {response['message'][:50]}...")
            except Exception as e:
                logger.error(f"Failed to save bot response to database: {str(e)}")
                # Continue processing even if database save fails

            return Response(response)

        except Exception as e:
            logger.exception(f"Error calling Gemini API: {str(e)}")
            return Response({'error': 'Error communicating with AI service'}, status=status.HTTP_502_BAD_GATEWAY)

    except Exception as e:
        logger.exception(f"Internal server error in send_message: {str(e)}")
        return Response({'error': 'Internal server error', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def call_gemini_api(message):
    try:
        # Create a structured prompt for the Gemini model
        marketing_prompt = (
            "You are an AI-powered Market Research Analyst assistant. Your goal is to provide accurate, insightful, "
            "and data-driven responses to questions about market trends, consumer behavior, industry analysis, and business strategy. "
            f"Focus specifically on the following question:\n\n{message}\n\n"
            "Please provide a comprehensive yet concise analysis with relevant data points when possible. Include recent trends, "
            "important statistics, and actionable insights that would be valuable for business decision-making."
        )

        # Generate the response
        response = model.generate_content(marketing_prompt)

        # Process the response text
        response_text = response.text

        return {'message': response_text}

    except Exception as e:
        logger.error(f"Gemini API error: {str(e)}")
        return {'error': f'Unexpected error occurred: {str(e)}'}

@api_view(['GET'])
def get_chat_history(request):
    try:
        # Check if MongoDB is connected
        if 'client' not in globals() or not client:
            return JsonResponse({'error': 'Database connection is not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        chat_history = list(collection.find({}, {'_id': 0}))
        return JsonResponse(chat_history, safe=False)
    except Exception as e:
        logger.exception(f"Error retrieving chat history: {str(e)}")
        return JsonResponse({'error': f'Error retrieving chat history: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def clear_chat_history(request):
    try:
        # Check if MongoDB is connected
        if 'client' not in globals() or not client:
            return Response({'error': 'Database connection is not available'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        collection.delete_many({})
        return Response({'message': 'Chat history cleared'}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.exception(f"Error clearing chat history: {str(e)}")
        return Response({'error': f'Error clearing chat history: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def scrape_google_trends():
    try:
        url = "https://trends.google.com/trending?geo=IN"
        response = requests.get(url)
        soup = BeautifulSoup(response.content, 'html.parser')

        trends = []
        for item in soup.select('.feed-item'):
            title = item.select_one('.title').text.strip()
            description = item.select_one('.description').text.strip()
            trends.append({'title': title, 'description': description, 'timestamp': datetime.utcnow()})

        # Insert into MongoDB
        google_trend_collection.insert_many(trends)
        logger.info(f"Scraped and saved {len(trends)} trends to database.")

    except Exception as e:
        logger.error(f"Error scraping Google Trends: {str(e)}")

def delete_old_trends():
    try:
        ten_minutes_ago = datetime.utcnow() - timedelta(minutes=10)
        google_trend_collection.delete_many({'timestamp': {'$lt': ten_minutes_ago}})
        logger.info("Deleted old trends from the database.")
    except Exception as e:
        logger.error(f"Error deleting old trends: {str(e)}")

# Schedule the scraping and deletion tasks
scheduler = BackgroundScheduler()
scheduler.add_job(scrape_google_trends, 'interval', minutes=1)
scheduler.add_job(delete_old_trends, 'interval', minutes=10)
scheduler.start()

