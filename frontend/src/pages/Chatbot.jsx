import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SearchIcon, Send, Trash2, BarChart2, FileText, Download, PieChart } from 'lucide-react';

const MarketResearchChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState('chat'); // 'chat', 'insights', 'reports'

  useEffect(() => {
    // Fetch chat history when the component mounts
    fetchChatHistory();
  }, []);

  const fetchChatHistory = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('http://localhost:8000/api/get_chat_history/');
      setMessages(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setIsLoading(false);
    }
  };
  
  const sendMessage = async () => {
    if (!input.trim()) return;
  
    try {
      setIsLoading(true);
      // Add user message immediately for better UX
      const userMessage = { message: input, sender: 'user', timestamp: new Date().toISOString() };
      setMessages(prevMessages => [...prevMessages, userMessage]);
      setInput('');
      
      // Scroll to bottom
      setTimeout(() => {
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 50);
      
      // Send to backend
      const response = await axios.post('http://localhost:8000/api/send_message/', { message: input });
      setMessages(prevMessages => [...prevMessages.filter(msg => msg !== userMessage), userMessage, response.data]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      // Add error message
      setMessages(prevMessages => [...prevMessages, { message: "Sorry, there was an error processing your request. Please try again.", sender: 'assistant', timestamp: new Date().toISOString() }]);
    }
  };
  
  const clearChatHistory = async () => {
    if (window.confirm('Are you sure you want to clear the entire chat history?')) {
      try {
        setIsLoading(true);
        await axios.delete('http://localhost:8000/api/clear_chat_history/');
        setMessages([]);
        setIsLoading(false);
      } catch (error) {
        console.error('Error clearing chat history:', error);
        setIsLoading(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Function to format text with proper styling
  const formatMessage = (text) => {
    if (!text) return '';
    
    // Process text for formatting
    let formattedText = text;
    
    // Replace markdown-style bold with HTML bold
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace markdown-style headers with proper HTML headings
    formattedText = formattedText.replace(/^# (.*?)$/gm, '<h1 class="text-xl font-bold my-2">$1</h1>');
    formattedText = formattedText.replace(/^## (.*?)$/gm, '<h2 class="text-lg font-bold my-2">$1</h2>');
    formattedText = formattedText.replace(/^### (.*?)$/gm, '<h3 class="text-base font-bold my-1">$1</h3>');
    
    // Handle bullet points
    formattedText = formattedText.replace(/^\* (.*?)$/gm, '<li class="ml-4 list-disc">$1</li>');
    formattedText = formattedText.replace(/^- (.*?)$/gm, '<li class="ml-4 list-disc">$1</li>');
    
    // Handle numbered lists
    formattedText = formattedText.replace(/^\d+\. (.*?)$/gm, '<li class="ml-4 list-decimal">$1</li>');
    
    // Fix adjacent list items
    formattedText = formattedText.replace(/<\/li>\s*<li/g, '</li><li');
    
    // Wrap lists in <ul> or <ol>
    formattedText = formattedText.replace(/(<li class="ml-4 list-disc">.*?<\/li>)+/g, '<ul class="my-2">$&</ul>');
    formattedText = formattedText.replace(/(<li class="ml-4 list-decimal">.*?<\/li>)+/g, '<ol class="my-2">$&</ol>');
    
    // Handle emphasis (italic)
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle line breaks
    formattedText = formattedText.replace(/\n/g, '<br />');
    
    return formattedText;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-800">Market Research Analyst</h1>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setView('chat')}
              className={`px-4 py-2 rounded-md ${view === 'chat' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Chat
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4 hidden md:block">
          <div className="mb-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Suggested Topics</h2>
            <ul className="space-y-2">
              <li><button className="text-blue-600 hover:text-blue-800 text-sm">Market Size Analysis</button></li>
              <li><button className="text-blue-600 hover:text-blue-800 text-sm">Competitor Research</button></li>
              <li><button className="text-blue-600 hover:text-blue-800 text-sm">Consumer Trends</button></li>
              <li><button className="text-blue-600 hover:text-blue-800 text-sm">SWOT Analysis</button></li>
              <li><button className="text-blue-600 hover:text-blue-800 text-sm">Price Point Optimization</button></li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Recent Analysis</h2>
            <ul className="space-y-2">
              <li className="text-sm text-gray-600">Tech Market Growth Q1</li>
              <li className="text-sm text-gray-600">Consumer Behavior Shift</li>
              <li className="text-sm text-gray-600">Retail Sector Forecast</li>
            </ul>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {view === 'chat' && (
            <>
              {/* Chat Container */}
              <div 
                id="chat-container"
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <BarChart2 className="h-16 w-16 mb-4 text-blue-200" />
                    <h3 className="text-xl font-medium mb-2">Market Research Assistant</h3>
                    <p className="max-w-md text-gray-400">
                      Ask me about market trends, competitive analysis, consumer insights, or any research questions you have.
                    </p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-3xl rounded-2xl p-4 shadow-sm ${
                        msg.sender === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-white text-gray-800 rounded-bl-none'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="font-medium text-xs mb-1">
                            {msg.sender === 'user' ? 'You' : 'Market Research AI'}
                          </div>
                          <div className="text-xs opacity-70 ml-4">
                            {formatTimestamp(msg.timestamp)}
                          </div>
                        </div>
                        {msg.sender === 'user' ? (
                          <div className="whitespace-pre-wrap">
                            {msg.message}
                          </div>
                        ) : (
                          <div
                            className="message-content"
                            dangerouslySetInnerHTML={{ __html: formatMessage(msg.message) }}
                          />
                        )}
                        {msg.sender !== 'user' && (
                          <div className="flex justify-end mt-2 text-xs">
                            <button className="text-blue-600 hover:text-blue-800">
                              <Download className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 max-w-xs rounded-2xl p-4 rounded-bl-none shadow-sm">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse"></div>
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 rounded-full bg-gray-300 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="bg-white border-t border-gray-200 p-4">
                <div className="flex items-end max-w-4xl mx-auto">
                  <div className="flex-1 bg-gray-100 rounded-2xl hover:bg-white border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask about market trends, demographics, pricing strategies..."
                      className="w-full px-4 pt-3 pb-2 bg-transparent focus:outline-none resize-none overflow-hidden text-gray-800"
                      rows={1}
                      style={{ minHeight: '44px', maxHeight: '120px' }}
                    />
                    <div className="px-3 pb-2 flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        {input.length > 0 ? `${input.length} characters` : 'Type your research question'}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={clearChatHistory}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50"
                          title="Clear chat history"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={sendMessage}
                          disabled={!input.trim() || isLoading}
                          className={`p-1 rounded-full ${
                            input.trim() && !isLoading 
                              ? 'text-blue-600 hover:bg-blue-50' 
                              : 'text-gray-400'
                          }`}
                          title="Send message"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {view === 'insights' && (
            <div className="flex-1 p-8 flex items-center justify-center">
              <div className="text-center">
                <PieChart className="h-16 w-16 mx-auto mb-4 text-blue-200" />
                <h3 className="text-xl font-medium mb-2">Insights Dashboard</h3>
                <p className="text-gray-500 max-w-md">
                  Visualizations and insights from your chat history would appear here.
                </p>
              </div>
            </div>
          )}

          {view === 'reports' && (
            <div className="flex-1 p-8 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-blue-200" />
                <h3 className="text-xl font-medium mb-2">Generated Reports</h3>
                <p className="text-gray-500 max-w-md">
                  Your saved and generated reports would appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarketResearchChatbot;