from django.urls import path
from .views import send_message, get_chat_history, clear_chat_history

urlpatterns = [
    path('send_message/', send_message, name='send_message'),
    path('get_chat_history/', get_chat_history, name='get_chat_history'),
    path('clear_chat_history/', clear_chat_history, name='clear_chat_history'),
]
