import { Amplify } from 'aws-amplify';
import '@aws-amplify/ui-react/styles.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import amplifyConfig from './aws-config';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import Login from './components/Auth';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import Home from './components/Home';
import Subscription from './components/Subscription';
import Experiences from './components/Experiences';
import GPA from './components/GPA';
import RequireAuth from './components/RequireAuth';
import TrialProtectedRoute from './components/TrialProtectedRoute';

// Initialize Amplify
Amplify.configure(amplifyConfig);

const AppContent = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation user={user} />
      <main className="flex-grow">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route
            path="/subscription"
            element={
              <RequireAuth>
                <Subscription />
              </RequireAuth>
            }
          />

          <Route
            path="/experiences"
            element={
              <RequireAuth>
                <TrialProtectedRoute>
                  <Experiences />
                </TrialProtectedRoute>
              </RequireAuth>
            }
          />
          <Route
            path="/gpa"
            element={
              <RequireAuth>
                <TrialProtectedRoute>
                  <GPA />
                </TrialProtectedRoute>
              </RequireAuth>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SubscriptionProvider>
          <AppContent />
        </SubscriptionProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App
