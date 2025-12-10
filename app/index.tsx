import { StyleSheet, Text, View, ImageBackground, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router'; 
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

// Import the image from the correct relative path
const SHOWROOM_IMAGE = require('../assets/showroom2.png');

export default function HomeScreen() {
  const router = useRouter(); 

  const handleTryOnPress = () => {
    // Navigate to the registered 'scan' route
    router.push('/scan'); 
  };

  return (
    <ImageBackground source={SHOWROOM_IMAGE} style={styles.background}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
      >
        <View style={styles.container}>
          
          {/* Animated Title Text */}
          <Animated.View entering={FadeInUp.delay(300).duration(800)}>
            <Text style={styles.titleText}>See Clothing</Text>
          </Animated.View>
          <Animated.View entering={FadeInUp.delay(500).duration(800)}>
            <Text style={styles.titleText}>On Your Body</Text>
          </Animated.View>

          {/* Try On Button */}
          <TouchableOpacity 
            style={styles.button}
            onPress={handleTryOnPress}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Try On</Text>
          </TouchableOpacity>
          
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  gradientOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    padding: 30,
    alignItems: 'center',
    marginBottom: 50,
  },
  titleText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 5,
  },
  button: {
    marginTop: 40,
    backgroundColor: '#007AFF', 
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 30,
    elevation: 5, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});