import {useEffect, useRef, useState} from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  SafeAreaView,
  StatusBar,
} from 'react-native';

import Header from './components/Header';
import ChatBubble from './components/ChatBubble';
import ChatInput from './components/ChatInput';
import LoadingIndicator from './components/LoadingIndicator';
import {lightTheme} from './constants/theme';
import {useChatMessages} from './hooks/useChatMessages';

const OPENAI_API_KEY = 'sk-DTldwHBcIBEIGW1QytwKZTXHrSU6r7sAYRb8FmiQlkAzExmv';
const OPENAI_BASE_URL = 'https://api.chatanywhere.tech/v1';

const App = () => {
  const {messages, isLoading, error, sendChatMessage, createNewConversation} =
    useChatMessages();
  const scrollViewRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({animated: true});
  }, [messages]);

  const handleSend = async content => {
    try {
      setIsStreaming(true);

      // 发送请求到 OpenAI API
      const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [{role: 'user', content}],
          stream: true, // 开启流式输出
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API 请求失败: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedMessage = '';

      while (true) {
        const {value, done} = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, {stream: true});
        accumulatedMessage += chunk;

        sendChatMessage(accumulatedMessage);
      }
    } catch (error) {
      console.error('发送消息错误:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={lightTheme.colors.background}
      />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.mainContainer}>
          <Header
            title="AI助手"
            onMenuPress={() => {}}
            onNewChat={createNewConversation}
          />

          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>开始新的对话吧</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.scrollView}
              contentContainerStyle={styles.chatContainer}>
              {messages.map(item => (
                <ChatBubble key={item.id} message={item} />
              ))}
            </ScrollView>
          )}

          {isLoading && <LoadingIndicator />}

          <View style={styles.inputContainer}>
            <ChatInput
              onSend={handleSend}
              isLoading={isLoading || isStreaming}
            />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: lightTheme.colors.background},
  mainContainer: {flex: 1},
  scrollView: {flex: 1},
  chatContainer: {padding: 16, paddingBottom: 80},
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: lightTheme.colors.background,
    borderTopWidth: 1,
    borderTopColor: lightTheme.colors.border || '#E5E5E5',
    paddingVertical: 8,
  },
  emptyContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  emptyText: {
    fontSize: 16,
    color: lightTheme.colors.text || '#666',
    opacity: 0.6,
  },
});

export default App;
