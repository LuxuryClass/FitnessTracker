import HomePage from '@pages/HomePage';
import '../Styles/index.scss';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import StartPage from '@/Components/Pages/StartPage/StartPage';
import { EnterPage } from '@/Components/Pages/EnterPage/EnterPage';
import LoginPage from '@/Components/Pages/LoginPage/LoginPage';
import SigninPage from '@/Components/Pages/RegisterPage/RegisterPage';

export function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/enter" element={<EnterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SigninPage />} />
          <Route path="/home" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
