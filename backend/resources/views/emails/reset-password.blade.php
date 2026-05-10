<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Восстановление пароля — Storehaus</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf7f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Plus Jakarta Sans', Roboto, Helvetica, Arial, sans-serif; color: #2a2620;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf7f2; padding: 48px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; width: 100%; background-color: #ffffff; border: 1px solid #e8e3d8; border-radius: 16px; overflow: hidden;">
                <!-- Шапка с брендом -->
                <tr>
                    <td style="padding: 32px 36px 8px;">
                        <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="vertical-align: middle; padding-right: 12px;">
                                    <div style="width: 36px; height: 36px; background-color: #2a2620; color: #faf7f2; border-radius: 9px; line-height: 36px; text-align: center; font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 400;">
                                        S
                                    </div>
                                </td>
                                <td style="vertical-align: middle;">
                                    <div style="font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif; font-size: 22px; line-height: 1; letter-spacing: -0.015em; color: #2a2620;">
                                        Storehaus
                                    </div>
                                    <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #8a8475; margin-top: 4px; font-weight: 600;">
                                        Operations
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Заголовок -->
                <tr>
                    <td style="padding: 24px 36px 8px;">
                        <h1 style="font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif; font-size: 36px; line-height: 1.1; letter-spacing: -0.02em; font-weight: 400; color: #2a2620; margin: 0;">
                            Восстановление пароля
                        </h1>
                    </td>
                </tr>

                <!-- Тело письма -->
                <tr>
                    <td style="padding: 8px 36px 24px;">
                        <p style="color: #4a4538; font-size: 15px; line-height: 1.6; margin: 16px 0 0;">
                            Здравствуйте.
                        </p>
                        <p style="color: #4a4538; font-size: 15px; line-height: 1.6; margin: 12px 0 0;">
                            Мы получили запрос на сброс пароля для вашей учётной записи в&nbsp;<strong style="color: #2a2620;">Storehaus</strong>. Чтобы установить новый пароль, перейдите по&nbsp;ссылке ниже.
                        </p>

                        <!-- Кнопка -->
                        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0 8px;">
                            <tr>
                                <td style="background-color: #2a2620; border-radius: 11px;">
                                    <a href="{{ $resetUrl }}"
                                       style="display: inline-block; color: #faf7f2; text-decoration: none; font-size: 14.5px; font-weight: 500; letter-spacing: -0.005em; padding: 13px 24px;">
                                        Установить новый пароль →
                                    </a>
                                </td>
                            </tr>
                        </table>

                        <p style="color: #8a8475; font-size: 12.5px; line-height: 1.5; margin: 16px 0 0;">
                            Ссылка действительна <strong style="color: #4a4538;">60 минут</strong>. По истечении срока запросите сброс заново на&nbsp;экране входа.
                        </p>
                    </td>
                </tr>

                <!-- Разделитель + резервная ссылка -->
                <tr>
                    <td style="padding: 0 36px;">
                        <div style="border-top: 1px solid #e8e3d8;"></div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 20px 36px 24px;">
                        <p style="color: #8a8475; font-size: 12px; line-height: 1.6; margin: 0 0 6px;">
                            Если кнопка не работает, скопируйте ссылку в&nbsp;адресную строку:
                        </p>
                        <p style="font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace; color: #4a4538; font-size: 12px; line-height: 1.5; margin: 0; word-break: break-all;">
                            {{ $resetUrl }}
                        </p>
                    </td>
                </tr>

                <!-- Предупреждение -->
                <tr>
                    <td style="padding: 16px 36px; background-color: #f6f1e6; border-top: 1px solid #e8e3d8;">
                        <p style="color: #6e6650; font-size: 12.5px; line-height: 1.6; margin: 0;">
                            Если&nbsp;вы не запрашивали сброс пароля — просто проигнорируйте это&nbsp;письмо. Текущий пароль останется без&nbsp;изменений.
                        </p>
                    </td>
                </tr>
            </table>

            <!-- Футер -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; width: 100%; margin-top: 20px;">
                <tr>
                    <td style="padding: 0 36px; text-align: center;">
                        <p style="color: #a8a191; font-size: 11px; line-height: 1.5; margin: 0; letter-spacing: 0.02em;">
                            © {{ date('Y') }} Storehaus · Управление сетью контейнерных кладовок
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
