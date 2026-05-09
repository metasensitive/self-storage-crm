import { Link } from 'react-router-dom';

export default function ResetPasswordPage() {
  return (
    <>
      <div className="t-micro">Сброс пароля</div>
      <h1 className="h-display-sm mt-2">Установите новый пароль</h1>
      <p className="muted mt-2 t-body">Будет реализовано в следующем этапе.</p>
      <div className="mt-6">
        <Link to="/login" className="btn">
          Вернуться к входу
        </Link>
      </div>
    </>
  );
}
