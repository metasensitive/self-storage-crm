<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Восстановление пароля — SelfStorage CRM</title>
</head>
<body
    style="margin: 0; padding: 0; background-color: #f5f7fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background-color: #f5f7fa; padding: 40px 0;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                   style="max-width: 520px; width: 100%;">
                <!-- Шапка -->
                <tr>
                    <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 32px 32px 24px; border-radius: 16px 16px 0 0; text-align: center;">
                        <h1 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.3px;">
                            🔐 Восстановление пароля
                        </h1>
                        <p style="color: rgba(255,255,255,0.85); font-size: 15px; margin: 0; line-height: 1.5;">
                            SelfStorage CRM
                        </p>
                    </td>
                </tr>

                <!-- Тело письма -->
                <tr>
                    <td style="background-color: #ffffff; padding: 32px 32px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                        <p style="color: #1e293b; font-size: 16px; margin: 0 0 20px; line-height: 1.6;">
                            Здравствуйте!
                        </p>

                        <p style="color: #475569; font-size: 15px; margin: 0 0 20px; line-height: 1.7;">
                            Вы (или кто-то от вашего имени) запросили сброс пароля для доступа к системе <strong>SelfStorage
                                CRM</strong>.
                        </p>

                        <!-- Кнопка -->
                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 24px;">
                            <tr>
                                <td style="background-color: #4F46E5; border-radius: 10px; text-align: center; padding: 14px 36px;">
                                    <a href="{{ $resetUrl }}"
                                       style="color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; letter-spacing: -0.2px; display: inline-block;">
                                        Сбросить пароль
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px; text-align: center; line-height: 1.6;">
                            Ссылка действительна <strong>60 минут</strong>.
                        </p>

                        <!-- Разделитель -->
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                                    <p style="color: #94a3b8; font-size: 13px; margin: 0 0 8px; line-height: 1.6;">
                                        Если кнопка не работает, скопируйте и вставьте эту ссылку в адресную строку
                                        браузера:
                                    </p>
                                    <p style="color: #4F46E5; font-size: 12px; margin: 0; word-break: break-all; line-height: 1.5;">
                                        {{ $resetUrl }}
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Предупреждение -->
                <tr>
                    <td style="background-color: #fefce8; padding: 20px 32px; border-left: 4px solid #eab308;">
                        <p style="color: #a16207; font-size: 13px; margin: 0; line-height: 1.6;">
                            ⚠️ Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо. Ваш текущий пароль
                            останется без изменений.
                        </p>
                    </td>
                </tr>

                <!-- Футер -->
                <tr>
                    <td style="background-color: #f8fafc; padding: 20px 32px; border-radius: 0 0 16px 16px; text-align: center;">
                        <p style="color: #64748b; font-size: 13px; margin: 0 0 4px;">
                            SelfStorage CRM
                        </p>
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                            © {{ date('Y') }}. Управление сетью контейнерных кладовок.
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
