import React, {useRef, useEffect} from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import LoadingIndicator from './LoadingIndicator';
import Header from './Header';
import {useChatMessages} from '../hooks/useChatMessages';
import {lightTheme} from '../constants/theme';

const ChatScreen = ({navigation}) => {
  const {messages, isLoading, error, sendChatMessage, createNewConversation} =
    useChatMessages();

  const flatListRef = useRef(null);

  // 当有新消息时，滚动到底部
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({animated: true});
      }, 100);
    }
  }, [messages]);

  const handleSend = async content => {
    try {
      await sendChatMessage(content);
    } catch (err) {
      // 错误已在hook中处理
      console.log(error);
    }
  };

  const handleNewChat = () => {
    createNewConversation();
  };

  const handleMenu = () => {
    navigation.openDrawer();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View
        style={[
          styles.container,
          {backgroundColor: lightTheme.colors.background},
        ]}>
        <Header
          title="AI助手"
          onMenuPress={handleMenu}
          onNewChat={handleNewChat}
        />

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({item}) => <ChatBubble message={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatContainer}
          onContentSizeChange={() =>
            flatListRef.current.scrollToEnd({animated: true})
          }
        />

        {isLoading && <LoadingIndicator />}

        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatContainer: {
    padding: 10,
    paddingBottom: 20,
  },
});

export default ChatScreen;
