import HomePage from '@pages/HomePage';
import '../Styles/index.scss';
// import styles from './Styles.module.scss';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import BusinessCard from '@/Components/Pages/BusinessCard';
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
import ExerciseSelectPage from '@/Components/Pages/AddPa/components/ExerciseSelectPage/ExerciseSelectPage';
import CreateExercisePage from '@/Components/Pages/CreateExercisePage/CreateExercisePage';
import { SessionPreviewPage } from '@/Components/Pages/SessionPreviewPage/SessionPreviewPage';
import SessionMainPage from '@/Components/Pages/SessionMainPage/SessionMainPage';
import { DesktopGate } from '@/Components/Common/DesktopGate/DesktopGate';
import TemplatesPage from '@/Components/Pages/TemplatesPage/TemplatesPage';
import TemplateInfoPage from '@/Components/Pages/TemplateInfoPage/TemplateInfoPage';
import AlmanahPage from '@/Components/Pages/KnowledgeBasePage/KnowledgeBasePage';

export function App() {
  return (
    <>
      <DesktopGate />
      <BrowserRouter basename="/">
        <Routes>
          <Route element={<GuestOnlyRoute />}>
            <Route path="/enter" element={<BusinessCard />} />
            {/* <Route path="/enter" element={<EnterPage />} /> */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<SigninPage />} />
          </Route>
          <Route element={<RequireAuthRoute />}>
            <Route path="/" element={<OutletWrapper />}>
              <Route index element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/almanah" element={<AlmanahPage />} />
              <Route path="/add" element={<CreateWorkoutPage />} />
              <Route path="/progress" />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            
            <Route path="/schedule" element={<SchedulePage />} />

            <Route path="/edit-profile" element={<EditProfilePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/template/:id" element={<TemplateInfoPage />} />

            <Route path="/exercises/:groupId" element={<ExerciseSelectPage />} />
            <Route path="/createExercise" element={<CreateExercisePage />} />

            <Route path="/workout/:workoutId" element={<SessionPreviewPage />} />
            <Route path="/session/:workoutId" element={<SessionMainPage />} />

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