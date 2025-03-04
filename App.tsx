import React, {useState} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Button,
  TextInput,
  FlatList,
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';

interface Item {
  id: string;
  title: string;
}

const App = () => {
  const [inputValue, setInputValue] = useState('');
  const [data, setData] = useState<Item[]>([
    {id: '1', title: 'React Native'},
    {id: '2', title: 'Official Components'},
    {id: '3', title: 'FlatList Example'},
  ]);

  const initSpark = () => {
    console.log('initSpark');
  };

  const handleAddItem = () => {
    if (inputValue.trim() === '') {
      Alert.alert('Error', 'Input cannot be empty!');
      return;
    }
    setData([...data, {id: Date.now().toString(), title: inputValue}]);
    setInputValue('');
  };

  const renderItem = ({item}: {item: Item}) => (
    <View style={styles.listItem}>
      <Text style={styles.listItemText}>{item.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>React Native Official Components</Text>
      <Text style={styles.subHeader}>Test Spark:</Text>
      <Button title="Init Spark" onPress={initSpark} />

      <Text style={styles.subHeader}>Add an Item:</Text>
      <TextInput
        style={styles.input}
        placeholder="Type something..."
        value={inputValue}
        onChangeText={setInputValue}
      />
      <Button title="Add Item" onPress={handleAddItem} />
      <Text style={styles.subHeader}>Item List:</Text>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 5,
    color: '#333',
  },
  subHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 5,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 5,
    marginBottom: 5,
    backgroundColor: '#fff',
  },
  list: {
    marginTop: 5,
  },
  listItem: {
    padding: 5,
    backgroundColor: '#e0f7fa',
    borderRadius: 8,
    marginVertical: 5,
  },
  listItemText: {
    fontSize: 16,
    color: '#00796b',
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginVertical: 5,
  },
});

export default App;
