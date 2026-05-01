<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Восстановление пароля</title>
</head>
<body>
<h2>Восстановление пароля</h2>
<p>Вы запросили сброс пароля в системе SelfStorage CRM.</p>
<p>Для установки нового пароля перейдите по ссылке:</p>
<p>
    <a href="{{ $resetUrl }}" style="padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
        Сбросить пароль
    </a>
</p>
<p>Ссылка действительна 60 минут.</p>
<p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
<hr>
<p style="color: #999; font-size: 12px;">SelfStorage CRM © {{ date('Y') }}</p>
</body>
</html>
