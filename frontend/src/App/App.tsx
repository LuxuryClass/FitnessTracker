import HomePage from '@pages/HomePage';
import '../Styles/index.scss';
// import styles from './Styles.module.scss';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { EnterPage } from '@/Components/Pages/EnterPage/EnterPage';
import LoginPage from '@/Components/Pages/LoginPage/LoginPage';
import SigninPage from '@/Components/Pages/RegisterPage/RegisterPage';
import { NavigationPanel } from '@/Components/Common/Navigation/Navigation';
import { GuestOnlyRoute, RequireAuthRoute } from '@/Auth';
import CreateWorkoutPage from '@/Components/Pages/AddPa/CreateWorkoutPage';
import SettingsPage from '@/Components/Pages/SettingsPage/SettingsPage';
import EditProfilePage from '@/Components/Pages/SettingsPage/EditProfilePage/EditProfilePage';
import NotificationsPage from '@/Components/Pages/SettingsPage/NotificationsPage/NotificationPage';
import PrivacyPage from '@/Components/Pages/SettingsPage/PrivacyPage/PrivacyPage';
import SchedulePage from '@/Components/Pages/ShedulePage/ShedulePage';

export function App() {
  return (
    <>
      <BrowserRouter basename="/">
        <Routes>
          <Route element={<GuestOnlyRoute />}>
            <Route path="/enter" element={<EnterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<SigninPage />} />
          </Route>
          <Route element={<RequireAuthRoute />}>
            <Route path="/" element={<OutletWrapper />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/almanah" />
              <Route path="/add" element={<CreateWorkoutPage />} />
              <Route path="/progress" />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="/edit-profile" element={<EditProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            <Route path="/schedule" element={<SchedulePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

function OutletWrapper() {
  return (
    <>
      <Outlet />
      <NavigationPanel />
    </>
  )
}