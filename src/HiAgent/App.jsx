import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import EventSource from 'react-native-sse';
import {
  HIAGENT_API_BASE_URL,
  HIAGENT_API_KEY,
  HIAGENT_APP_KEY,
  HIAGENT_DEFAULT_USER_ID,
} from './apis/HIAGENT_CONFIG';

// 打字机文本组件：逐字显示新加入的字符，并显示闪烁光标
const TypewriterText = ({text, speed = 50, loading}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (text.length > displayedText.length) {
      const interval = setInterval(() => {
        setDisplayedText(prev => {
          const next = text.slice(0, prev.length + 1);
          if (next.length === text.length) {
            clearInterval(interval);
          }
          return next;
        });
      }, speed);
      return () => clearInterval(interval);
    } else {
      setDisplayedText(text);
    }
  }, [displayedText.length, speed, text]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);
    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <Text style={styles.bubbleText}>
      {displayedText}
      {loading && showCursor && <Text style={styles.cursor}>|</Text>}
    </Text>
  );
};

const ChatBubble = ({message, isUser, loading, time}) => {
  const formattedTime = time ? new Date(time).toLocaleTimeString() : '';
  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
      {loading && !message ? (
        <ActivityIndicator
          size="small"
          color={isUser ? '#FFFFFF' : '#D5F9C1'}
        />
      ) : (
        <>
          {!isUser && loading ? (
            <TypewriterText text={message} loading={loading} />
          ) : (
            <Text style={styles.bubbleText}>{message}</Text>
          )}
          {formattedTime !== '' && (
            <Text style={styles.timeText}>{formattedTime}</Text>
          )}
        </>
      )}
    </View>
  );
};

const App = () => {
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);

  const eventSourceRef = useRef(null);
  const flatListRef = useRef(null);

  // 创建一个新的会话
  const createConversation = async (
    inputs = {},
    userId = HIAGENT_DEFAULT_USER_ID,
  ) => {
    try {
      const response = await fetch(
        `${HIAGENT_API_BASE_URL}/create_conversation`,
        {
          method: 'POST',
          headers: {
            Apikey: HIAGENT_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            AppKey: HIAGENT_APP_KEY,
            Inputs: inputs,
            UserID: userId,
          }),
        },
      );

      const conversationData = await response.json();
      console.log('会话创建响应原始数据:', conversationData);

      // 检查响应格式
      if (conversationData?.Conversation?.AppConversationID) {
        // 从 data 字段中获取 AppConversationID
        const appConversationId =
          conversationData.Conversation.AppConversationID;
        setConversationId(appConversationId);
        return appConversationId;
      }

      // 如果没有找到有效的会话ID，记录详细信息并抛出错误
      console.error('响应数据结构:', conversationData);
      throw new Error('无法获取有效的会话ID');
    } catch (error) {
      console.error('创建会话错误:', error);
      throw error;
    }
  };

  // 发送消息并处理流响应
  const sendMessage = async (
    userMessage,
    userId = HIAGENT_DEFAULT_USER_ID,
    queryExtends = {},
  ) => {
    // 首先确保我们有一个会话ID
    let currentConversationId = conversationId;
    if (!currentConversationId) {
      try {
        currentConversationId = await createConversation(
          {
            DEVICE_OS: 'Android',
            CURRENT_PAGE: '首页',
            var: 'variables',
            PAGE_DATA: '',
          },
          userId,
        );
      } catch (error) {
        console.error('创建会话失败:', error);
        return;
      }
    }

    // 将用户消息添加到会话中
    const userMsg = {role: 'user', content: userMessage, time: new Date()};
    setConversation(prev => [...prev, userMsg]);
    setLoading(true);

    let aiMessage = '';

    // 设置SSE连接
    const es = new EventSource(`${HIAGENT_API_BASE_URL}/chat_query_v2`, {
      headers: {
        'Content-Type': 'application/json',
        Apikey: HIAGENT_API_KEY,
      },
      method: 'POST',
      body: JSON.stringify({
        Query: userMessage,
        AppConversationID: currentConversationId,
        ResponseMode: 'streaming',
        UserID: userId,
        QueryExtends: queryExtends,
      }),
      pollingInterval: 0,
    });

    eventSourceRef.current = es;

    // 处理SSE事件
    es.addEventListener('open', () => {
      console.log('SSE连接已打开');
    });

    es.addEventListener('text', event => {
      if (!event.data) {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        switch (data.event) {
          case 'message_start':
            console.log('开始接收消息，会话ID:', data.conversation_id);
            break;
          case 'agent_thought':
            console.log('AI思考过程:', data.thought);
            if (data.thought) {
              aiMessage = data.thought;
              updateConversation(aiMessage);
            }
            break;
          case 'agent_thought_end':
            if (data.observation) {
              try {
                const observationData = JSON.parse(data.observation);
                if (observationData.data) {
                  const answerData = JSON.parse(observationData.data);
                  if (Array.isArray(answerData) && answerData[0]?.answer) {
                    aiMessage = answerData[0].answer;
                    updateConversation(aiMessage);
                  }
                }
              } catch (parseError) {
                console.log('解析观察数据失败:', parseError);
              }
            }
            break;
          default:
            // 处理其他类型的消息
            if (data.Content || data.content) {
              const delta = data.Content || data.content;
              aiMessage += delta;
              updateConversation(aiMessage);
            }
        }
      } catch (error) {
        console.error('解析SSE数据失败:', error, '原始数据:', event.data);
      }
    });

    // 提取更新会话的逻辑为单独函数
    const updateConversation = content => {
      if (!content.trim()) {
        return;
      }
      setConversation(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'ai') {
          return [
            ...prev.slice(0, prev.length - 1),
            {...last, content: content},
          ];
        } else {
          return [...prev, {role: 'ai', content: content, time: new Date()}];
        }
      });
    };

    es.addEventListener('error', event => {
      console.error('SSE请求错误:', event);
      setLoading(false);
      es.removeAllEventListeners();
      es.close();
    });

    es.addEventListener('close', () => {
      setLoading(false);
      es.removeAllEventListeners();
    });
  };

  // 停止正在进行的流响应
  const stopStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.removeAllEventListeners();
      eventSourceRef.current.close();
      setLoading(false);
    }
  };

  // 处理发送按钮点击
  const handleSend = async () => {
    if (input.trim()) {
      await sendMessage(input);
      setInput('');
    }
  };

  // 处理按钮按下（发送或停止）
  const handleButtonPress = () => {
    if (loading) {
      stopStream();
    } else {
      handleSend();
    }
  };

  // 新消息加入时自动滚动到底部
  useEffect(() => {
    if (flatListRef.current && conversation.length > 0) {
      flatListRef.current.scrollToEnd({animated: true});
    }
  }, [conversation]);

  // 渲染聊天气泡
  const renderItem = ({item, index}) => {
    const isLastMessage =
      index === conversation.length - 1 && item.role === 'ai';
    return (
      <ChatBubble
        message={item.content}
        isUser={item.role === 'user'}
        loading={isLastMessage && loading}
        time={item.time}
      />
    );
  };

  // 键盘感知滚动调整
  const keyExtractor = (_, index) => index.toString();

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={conversation}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.chatContent}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="输入消息"
          editable={!loading}
          multiline
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonStop]}
          onPress={handleButtonPress}
          disabled={!input.trim() && !loading}>
          <Text style={styles.buttonText}>{loading ? '停止' : '发送'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  chatContent: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#DCF8C6',
    alignSelf: 'flex-end',
  },
  aiBubble: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  bubbleText: {
    fontSize: 16,
    color: '#333',
  },
  cursor: {
    fontSize: 16,
    color: '#000000',
  },
  timeText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginRight: 10,
    maxHeight: 100,
  },
  button: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    opacity: 1,
  },
  buttonStop: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default App;
