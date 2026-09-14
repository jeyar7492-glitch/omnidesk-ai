import { IEmailProvider, EmailSendResult } from "./email.interface";
import { SMTPProvider } from "./smtp.provider";

export interface SendNotificationEmailParams {
  to: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  priority?: string;
  workspaceName?: string;
}

export class EmailNotificationService {
  private static instance: EmailNotificationService;
  private provider: IEmailProvider;

  private constructor(provider?: IEmailProvider) {
    this.provider = provider || new SMTPProvider();
  }

  public static getInstance(provider?: IEmailProvider): EmailNotificationService {
    if (!EmailNotificationService.instance || provider) {
      EmailNotificationService.instance = new EmailNotificationService(provider);
    }
    return EmailNotificationService.instance;
  }

  public setProvider(provider: IEmailProvider): void {
    this.provider = provider;
  }

  public isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  public async sendNotificationEmail(params: SendNotificationEmailParams): Promise<EmailSendResult> {
    const subject = `[OmniDesk AI] ${params.title}`;
    const safeTitle = this.escapeHtml(params.title);
    const safeMessage = this.escapeHtml(params.message);
    const safeWs = this.escapeHtml(params.workspaceName || "Workspace");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0d1117; color: #c9d1d9; margin: 0; padding: 24px; }
    .card { background-color: #161b22; border: 1px solid #30363d; border-radius: 8px; max-width: 560px; margin: 0 auto; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0ea5e9, #06b6d4); padding: 16px 24px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 600; }
    .content { padding: 24px; }
    .title { font-size: 16px; font-weight: 600; color: #f0f6fc; margin: 0 0 12px 0; }
    .message { font-size: 14px; line-height: 1.6; color: #8b949e; margin: 0 0 20px 0; }
    .badge { display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 12px; background: rgba(14, 165, 233, 0.2); color: #38bdf8; margin-bottom: 12px; }
    .btn { display: inline-block; background-color: #0ea5e9; color: #ffffff !important; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500; }
    .footer { padding: 16px 24px; border-top: 1px solid #21262d; font-size: 12px; color: #6e7681; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>OmniDesk AI</h1>
    </div>
    <div class="content">
      <div class="badge">${params.priority ? `Priority: ${params.priority}` : safeWs}</div>
      <div class="title">${safeTitle}</div>
      <p class="message">${safeMessage}</p>
      ${
        params.actionUrl
          ? `<a href="${this.escapeHtml(params.actionUrl)}" class="btn" target="_blank" rel="noopener noreferrer">View in OmniDesk</a>`
          : ""
      }
    </div>
    <div class="footer">
      Automated enterprise notification from ${safeWs} on OmniDesk AI.
    </div>
  </div>
</body>
</html>
    `.trim();

    const text = `
OmniDesk AI Notification:
Workspace: ${params.workspaceName || "Workspace"}
Title: ${params.title}
Message: ${params.message}
${params.actionUrl ? `Action Link: ${params.actionUrl}` : ""}
    `.trim();

    return this.provider.sendEmail({
      to: params.to,
      subject,
      html,
      text,
    });
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
