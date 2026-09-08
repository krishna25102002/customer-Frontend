
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from '../screens/Auth/Login';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import CustomerDashboard from '../screens/Home/CustomerDashboard';
import DriverProfile from '../screens/Home/DriverProfile';
import WaitingScreen from './../screens/Home/WaitingScreen';
import AdvanceBooking from './../screens/Home/AdvanceBooking';
import TripsScreen from './../screens/Home/TripsScreen';
import TripDetails from './../screens/Home/TripDetails';
import PaymentScreen from './../screens/Home/PaymentScreen';
import SettingsScreen from './../screens/Home/SettingsScreen';
import EditProfileScreen from '../components/EditProfileScreen';
import BankDetailsScreen from '../components/BankDetailsScreen';
import HelpSupportScreen from '../components/HelpSupportScreen';
import RequestedDriversScreen from './../screens/Home/RequestedDriversScreen';
import RequestedDriverDetail from './../screens/Home/RequestedDriverDetail';
import RequestSentScreen from './../screens/Home/RequestSentScreen';


import { TripProvider } from '../context/TripContext';
import { AuthProvider } from '../context/AuthContext';
import MyVehicleScreen from './../screens/Home/MyVehicleScreen';
import RequestsScreen from './../screens/Home/RequestsScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <AuthProvider>
    <TripProvider>
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      > 
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="customerHome" component={CustomerDashboard} />
        <Stack.Screen name="DriverProfile" component={DriverProfile} />
        <Stack.Screen name="WaitingScreen" component={WaitingScreen} />
        <Stack.Screen name="AdvanceBooking" component={AdvanceBooking} />
        <Stack.Screen name="TripsScreen" component={TripsScreen} />
        <Stack.Screen name="TripDetails" component={TripDetails} />
        <Stack.Screen name="PaymentScreen" component={PaymentScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="MyVehicle" component={MyVehicleScreen} />
        <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
        <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
        <Stack.Screen name="RequestedDriversScreen" component={RequestedDriversScreen} />
        <Stack.Screen name="RequestedDriverDetail" component={RequestedDriverDetail} />
        <Stack.Screen name="RequestSentScreen" component={RequestSentScreen} />
        <Stack.Screen name="RequestsScreen" component={RequestsScreen} />
        
      </Stack.Navigator>
    </NavigationContainer>
    </TripProvider>
    </AuthProvider>
  );
};

export default AppNavigator;

// import React from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// import Login from '../screens/Auth/Login';
// import RegisterScreen from '../screens/Auth/RegisterScreen';

// // Home Screens
// import CustomerDashboard from '../screens/Home/CustomerDashboard';
// import DriverProfile from '../screens/Home/DriverProfile';
// import WaitingScreen from '../screens/Home/WaitingScreen';
// import AdvanceBooking from '../screens/Home/AdvanceBooking';
// import TripDetails from '../screens/Home/TripDetails';

// // Tabs
// import TripsScreen from '../screens/Home/TripsScreen';

// // Context
// import { TripProvider } from '../context/TripContext';

// const Stack = createNativeStackNavigator();
// const Tab = createBottomTabNavigator();

// // 🔹 HOME STACK (inside tab)
// const HomeStack = () => {
//   return (
//     <Stack.Navigator screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="Dashboard" component={CustomerDashboard} />
//       <Stack.Screen name="DriverProfile" component={DriverProfile} />
//       <Stack.Screen name="WaitingScreen" component={WaitingScreen} />
//       <Stack.Screen name="AdvanceBooking" component={AdvanceBooking} />
//       <Stack.Screen name="TripDetails" component={TripDetails} />
//     </Stack.Navigator>
//   );
// };

// // 🔹 MAIN TABS (BOTTOM FIXED)
// const MainTabs = () => {
//   return (
//     <Tab.Navigator
//       screenOptions={{
//         headerShown: false,
//         tabBarStyle: { backgroundColor: '#121212' },
//         tabBarActiveTintColor: '#007BFF',
//         tabBarInactiveTintColor: '#888',
//       }}
//     >
//       <Tab.Screen name="Home" component={HomeStack} />
//       <Tab.Screen name="Trips" component={TripsScreen} />
//       <Tab.Screen name="Settings" component={CustomerDashboard} />
//     </Tab.Navigator>
//   );
// };

// const AppNavigator = () => {
//   return (
//     <TripProvider>
//       <NavigationContainer>
//         <Stack.Navigator screenOptions={{ headerShown: false }}>
          
//           <Stack.Screen name="Login" component={Login} />
//           <Stack.Screen name="Register" component={RegisterScreen} />
          
//           {/* MAIN APP */}
//           <Stack.Screen name="MainTabs" component={MainTabs} />

//         </Stack.Navigator>
//       </NavigationContainer>
//     </TripProvider>
//   );
// };

// export default AppNavigator;