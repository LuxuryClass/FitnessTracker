import HomePage from '@pages/HomePage';
import '../Styles/index.scss';
import styles from './Styles.module.scss';
import { BrowserRouter, Outlet, Route, Routes } from 'react-router-dom';
import StartPage from '@/Components/Pages/StartPage/StartPage';
import { EnterPage } from '@/Components/Pages/EnterPage/EnterPage';
import LoginPage from '@/Components/Pages/LoginPage/LoginPage';
import SigninPage from '@/Components/Pages/RegisterPage/RegisterPage';
import { NavigationPanel } from '@/Components/Common/Navigation/Navigation';
import CreateWorkoutPage from '@/Components/Pages/AddPa/CreateWorkoutPage';

export function App() {
  return (
    <>
      <BrowserRouter basename="/">
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/enter" element={<EnterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SigninPage />} />
          <Route path="/" element={<OutletWrapper />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/almanah" />
            <Route path="/add" element={<CreateWorkoutPage />} />
            <Route path="/progress" />
            <Route path="/settings" />

          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

function OutletWrapper() {
  return (
    <>
      <TopPadding />
      <Outlet />
      <NavigationPanel />
    </>
  )
}

function TopPadding() {
  return <div className={styles.top_padding}></div>
}
