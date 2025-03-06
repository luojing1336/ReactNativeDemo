import LottieView from 'lottie-react-native';
import React, {useEffect, useRef} from 'react';
import {StyleSheet, Text, Button, SafeAreaView, ScrollView} from 'react-native';

const App = () => {
  const animationRefA = useRef<LottieView>(null);
  const animationRefB = useRef<LottieView>(null);
  const animationRefC = useRef<LottieView>(null);
  useEffect(() => {
    animationRefA.current?.play();
    animationRefB.current?.play();
    animationRefC.current?.play();
  });
  const handleTestFunction = () => {
    console.log('Test Function');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* <Text style={styles.header}>React Native Test Demo</Text> */}
        {/* <Text style={styles.subHeader}>Test:</Text> */}
        {/* <Button title="Test Function" onPress={handleTestFunction} /> */}
        <LottieView
          ref={animationRefA}
          source={require('./assets/pandaDesk.json')}
          style={styles.logoPandaDesk}
        />
        <LottieView
          ref={animationRefB}
          source={require('./assets/pandaHi.json')}
          style={styles.logoPandaHi}
        />
        <LottieView
          ref={animationRefC}
          source={require('./assets/robotHello.json')}
          style={styles.logoRobotHello}
        />
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 20,
    alignItems: 'center',
  },
  logoPandaDesk: {
    width: 400,
    height: 400,
    marginVertical: 10,
  },
  logoPandaHi: {
    width: 400,
    height: 400,
    marginVertical: 10,
  },
  logoRobotHello: {
    width: 400,
    height: 400,
    marginVertical: 10,
  },
});

export default App;
