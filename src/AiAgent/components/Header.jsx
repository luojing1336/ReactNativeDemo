import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {lightTheme} from '../constants/theme';

const Header = ({title, onMenuPress, onNewChat}) => {
  return (
    <View
      style={[
        styles.container,
        {backgroundColor: lightTheme.colors.background},
      ]}>
      <TouchableOpacity style={styles.iconButton} onPress={onMenuPress}>
        <Text style={styles.iconFontSize}>{'\u2630'}</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity style={styles.iconButton} onPress={onNewChat}>
        <Text style={styles.iconFontSize}>{'\u2795'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFontSize: {
    fontSize: 24,
  },
});

export default Header;
