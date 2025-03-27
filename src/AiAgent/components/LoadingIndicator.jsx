import {lightTheme} from '../constants/theme';
import React from 'react';
import {View, ActivityIndicator, Text, StyleSheet} from 'react-native';

const LoadingIndicator = ({text = '思考中...'}) => {
  return (
    <View
      style={[
        styles.container,
        {backgroundColor: lightTheme.colors.surface + '80'},
      ]}>
      <ActivityIndicator size="small" color={lightTheme.colors.primary} />
      <Text style={[styles.text, {color: lightTheme.colors.onSurface}]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    marginVertical: 4,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
  },
});

export default LoadingIndicator;
