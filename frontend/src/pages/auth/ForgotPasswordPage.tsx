import { Link } from 'react-router-dom';

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="t-micro">Восстановление</div>
      <h1 className="h-display-sm mt-2">Забыли пароль?</h1>
      <p className="muted mt-2 t-body">
        Экран восстановления будет реализован в следующем этапе. Пока используйте админа БД для
        сброса.
      </p>
      <div className="mt-6">
        <Link to="/login" className="btn">
          Вернуться к входу
        </Link>
      </div>
    </>
  );
}
