package handlers

import "fmt"

func emailConfirmTemplate(firstname, code string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;padding:40px 0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#2D5016;padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🌿 UpcycleConnect</h1>
  </div>
  <div style="padding:32px">
    <h2 style="color:#1a1a1a;margin-top:0">Bienvenue, %s !</h2>
    <p style="color:#555;line-height:1.6">Merci de vous être inscrit. Voici votre code de confirmation :</p>
    <div style="text-align:center;margin:32px 0">
      <div style="display:inline-block;background:#f0f7eb;border:2px dashed #2D5016;border-radius:12px;padding:20px 40px">
        <span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#2D5016">%s</span>
      </div>
    </div>
    <p style="color:#555;text-align:center">Entrez ce code sur la page de confirmation pour activer votre compte.</p>
    <p style="color:#999;font-size:13px;text-align:center;margin-top:24px">Ce code expire dans 24h. Si vous n'avez pas créé de compte, ignorez cet email.</p>
  </div>
</div>
</body>
</html>`, firstname, code)
}

func emailResetPasswordTemplate(firstname, link string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;padding:40px 0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#2D5016;padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🌿 UpcycleConnect</h1>
  </div>
  <div style="padding:32px">
    <h2 style="color:#1a1a1a;margin-top:0">Réinitialisation du mot de passe</h2>
    <p style="color:#555;line-height:1.6">Bonjour %s,<br>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous.</p>
    <div style="text-align:center;margin:32px 0">
      <a href="%s" style="background:#e85d3a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Réinitialiser mon mot de passe</a>
    </div>
    <p style="color:#999;font-size:13px">Ce lien expire dans 1h. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
  </div>
</div>
</body>
</html>`, firstname, link)
}

func emailNewMessageTemplate(recipientFirstname, senderName, preview, appURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;padding:40px 0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#2D5016;padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">&#127807; UpcycleConnect</h1>
  </div>
  <div style="padding:32px">
    <h2 style="color:#1a1a1a;margin-top:0">Nouveau message, %s !</h2>
    <p style="color:#555;line-height:1.6"><strong>%s</strong> vous a envoyé un message :</p>
    <div style="background:#f5f5f5;border-left:4px solid #2D5016;padding:16px 20px;border-radius:0 8px 8px 0;margin:24px 0">
      <p style="color:#333;margin:0;font-style:italic">"%s"</p>
    </div>
    <div style="text-align:center;margin:32px 0">
      <a href="%s/messages" style="background:#2D5016;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px">Répondre au message</a>
    </div>
    <p style="color:#999;font-size:13px;text-align:center">Connectez-vous à UpcycleConnect pour voir la conversation complète.</p>
  </div>
</div>
</body>
</html>`, recipientFirstname, senderName, preview, appURL)
}

func emailNewsletterTemplate(subject, content string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:sans-serif;background:#f9f9f9;padding:40px 0">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
  <div style="background:#2D5016;padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🌿 UpcycleConnect</h1>
    <p style="color:#fff;opacity:0.8;margin:8px 0 0">Newsletter</p>
  </div>
  <div style="padding:32px">
    <h2 style="color:#1a1a1a;margin-top:0">%s</h2>
    <div style="color:#555;line-height:1.8">%s</div>
    <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
    <p style="color:#999;font-size:12px;text-align:center">Vous recevez cet email car vous êtes inscrit à la newsletter UpcycleConnect.<br>
    Pour vous désinscrire, rendez-vous dans les paramètres de votre compte.</p>
  </div>
</div>
</body>
</html>`, subject, content)
}
