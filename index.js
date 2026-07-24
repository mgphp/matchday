// Cognito auth (amazon-cognito-identity-js) needs crypto.getRandomValues, which
// Hermes doesn't provide — must be polyfilled before anything else loads.
import 'react-native-get-random-values';
import 'expo-router/entry';
