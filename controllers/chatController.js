const axios = require('axios');
const Chat = require('../models/Chat');
const User = require('../models/User');

const AI_MODELS = {
  chatgpt: 'openai/gpt-3.5-turbo',
  gemini: 'google/gemini-2.5-flash',
  claude: 'anthropic/claude-3-haiku',
  deepseek: 'deepseek/deepseek-chat'
};

const callOpenRouterAPI = async (model, messages) => {
  try {
    // Add system message to provide context
    const systemMessage = {
      role: 'system',
      content: 'You are a helpful AI assistant. Remember information shared in this conversation and refer to it when relevant. If a user tells you their name or other details, remember and use that information in future responses within this conversation.'
    };
    
    // Combine system message with conversation history
    const fullMessages = [systemMessage, ...messages.map(msg => ({
      role: msg.role,
      content: msg.text
    }))];
    
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: AI_MODELS[model],
      messages: fullMessages,
      max_tokens: 1000,  // Limit tokens to reduce cost
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI Fusion Chat'
      }
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenRouter API error:', error.response?.data || error.message);
    throw new Error('Failed to get AI response');
  }
};

const sendMessage = async (req, res) => {
  try {
    const { model } = req.params;
    const { message, chatId, attachments } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty.'
      });
    }

    if (!AI_MODELS[model]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid AI model selected.'
      });
    }

    const user = await User.findById(req.user._id);
    if (user.tokens <= 0) {
      return res.status(403).json({
        success: false,
        message: "You've run out of tokens!",
        tokensRemaining: 0
      });
    }

    let chat;
    if (chatId) {
      chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found.'
        });
      }
    } else {
      chat = new Chat({
        userId: req.user._id,
        model,
        title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
        messages: []
      });
    }

    const userMessage = {
      role: 'user',
      text: message.trim(),
      attachments: attachments || [],
      timestamp: new Date()
    };

    chat.messages.push(userMessage);

    const conversationHistory = chat.messages.slice(-10);

    try {
      const aiResponse = await callOpenRouterAPI(model, conversationHistory);
      
      const assistantMessage = {
        role: 'assistant',
        text: aiResponse,
        timestamp: new Date()
      };

      chat.messages.push(assistantMessage);
      await chat.save();

      user.tokens -= 1;
      await user.save();

      res.json({
        success: true,
        message: 'Message sent successfully!',
        chat: {
          id: chat._id,
          model: chat.model,
          title: chat.title,
          messages: chat.messages,
          updatedAt: chat.updatedAt
        },
        tokensRemaining: user.tokens,
        aiResponse: aiResponse
      });

    } catch (aiError) {
      console.error('AI API Error:', aiError);
      res.status(500).json({
        success: false,
        message: 'Failed to get AI response. Please try again.',
        error: aiError.message
      });
    }

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message.'
    });
  }
};

const getChatHistory = async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .select('_id model title updatedAt createdAt')
      .limit(50);

    res.json({
      success: true,
      chats
    });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching chat history.'
    });
  }
};

const getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findOne({ _id: chatId, userId: req.user._id });
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found.'
      });
    }

    res.json({
      success: true,
      chat
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching chat.'
    });
  }
};

const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    const chat = await Chat.findOneAndDelete({ _id: chatId, userId: req.user._id });
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found.'
      });
    }

    res.json({
      success: true,
      message: 'Chat deleted successfully.'
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting chat.'
    });
  }
};

module.exports = {
  sendMessage,
  getChatHistory,
  getChat,
  deleteChat
};
