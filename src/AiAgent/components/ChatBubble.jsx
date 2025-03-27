import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {lightTheme} from '../constants/theme';

const ChatBubble = ({message}) => {
  const {
    role = 'assistant',
    content = '',
    timestamp = Date.now(),
  } = message || {};
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.aiContainer,
        {
          backgroundColor: isUser
            ? lightTheme.colors.primary
            : lightTheme.colors.surface,
        },
      ]}>
      <Text
        style={[
          styles.text,
          {
            color: isUser
              ? lightTheme.colors.onPrimary
              : lightTheme.colors.onSurface,
          },
        ]}>
        {message.content}
      </Text>
      <Text
        style={[
          styles.timestamp,
          isUser ? styles.userTimestamp : styles.aiTimestamp,
        ]}>
        {new Date(message.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  userContainer: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiContainer: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: ({theme}) => theme.colors.onPrimary,
    opacity: 0.7,
  },
  aiTimestamp: {
    color: ({theme}) => theme.colors.onSurface,
    opacity: 0.7,
  },
});

export default ChatBubble;
