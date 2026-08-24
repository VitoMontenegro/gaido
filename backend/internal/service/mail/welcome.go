package mail

import (
	"html"
	"strings"
)

const GuideInstructionsURL = "https://svit.gaido.top/account/guide/instructions"

type Letter struct {
	Subject string
	Text    string
	HTML    string
}

func WelcomeLetter(firstName string, asGuide bool) Letter {
	name := strings.TrimSpace(firstName)
	if name == "" {
		name = "друже"
	}
	if asGuide {
		return welcomeGuide(name)
	}
	return welcomeUser(name)
}

func welcomeGuide(name string) Letter {
	subject := "Вітаємо! Ви зареєстровані на Gaido"
	text := "Вітаємо, " + name + "!\n\n" +
		"Ви успішно зареєстровані на Gaido. Акаунт підтверджено — можна наповнювати профіль і додавати екскурсії.\n\n" +
		"Коротка інструкція з наповнення:\n" + GuideInstructionsURL + "\n\n" +
		"З повагою,\nКоманда Gaido\n"
	html := brandedHTML(
		"Вітаємо!",
		"Вітаємо, "+html.EscapeString(name)+"!",
		"<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;color:#3f3f3f;\">Ви успішно зареєстровані на Gaido. Акаунт підтверджено — тепер можна наповнити профіль і додати перші екскурсії.</p>"+
			"<p style=\"margin:0 0 8px;font-size:16px;line-height:1.6;color:#3f3f3f;\">Щоб картка виглядала переконливо, відкрийте коротку інструкцію: кваліфікація, фото, «про себе», контакти та публікація маршруту.</p>",
		"Інструкція з наповнення",
		GuideInstructionsURL,
		"Якщо кнопка не відкривається, скопіюйте посилання:<br>"+html.EscapeString(GuideInstructionsURL),
	)
	return Letter{Subject: subject, Text: text, HTML: html}
}

func welcomeUser(name string) Letter {
	catalog := "https://svit.gaido.top/"
	subject := "Вітаємо! Ви зареєстровані на Gaido"
	text := "Вітаємо, " + name + "!\n\n" +
		"Ви успішно зареєстровані на Gaido. Можна шукати гідів та екскурсії.\n\n" +
		catalog + "\n\nЗ повагою,\nКоманда Gaido\n"
	html := brandedHTML(
		"Вітаємо!",
		"Вітаємо, "+html.EscapeString(name)+"!",
		"<p style=\"margin:0 0 16px;font-size:16px;line-height:1.6;color:#3f3f3f;\">Ви успішно зареєстровані на Gaido. Акаунт підтверджено — обирайте гідів та авторські маршрути.</p>",
		"Відкрити каталог",
		catalog,
		"",
	)
	return Letter{Subject: subject, Text: text, HTML: html}
}

func brandedHTML(preheader, heading, body, buttonLabel, buttonURL, note string) string {
	btn := ""
	if buttonLabel != "" && buttonURL != "" {
		safeURL := html.EscapeString(buttonURL)
		btn = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
  <tr>
    <td style="border-radius:14px;background:#2cb2ab;">
      <a href="` + safeURL + `" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;">` + html.EscapeString(buttonLabel) + `</a>
    </td>
  </tr>
</table>`
	}
	noteHTML := ""
	if strings.TrimSpace(note) != "" {
		noteHTML = `<p style="margin:20px 0 0;font-size:13px;line-height:1.55;color:#8a8a8a;">` + note + `</p>`
	}
	return `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>` + html.EscapeString(preheader) + `</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">` + html.EscapeString(preheader) + `</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #eeeeee;">
          <tr>
            <td style="padding:22px 28px;background:#2cb2ab;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:700;letter-spacing:0.04em;color:#ffffff;">Gaido</p>
              <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#e8fffc;">Для українців — від українців</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 20px;font-family:Arial,Helvetica,sans-serif;color:#060606;">
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;">` + heading + `</h1>
              ` + body + btn + noteHTML + `
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#636363;">
              З повагою,<br>команда Gaido
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background:#fafafa;border-top:1px solid #f0f0f0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#979797;">
              Лист надіслано, бо ви підтвердили реєстрацію на
              <a href="https://svit.gaido.top/" style="color:#239a94;text-decoration:none;">svit.gaido.top</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
